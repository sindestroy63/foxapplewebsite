import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadRequest } from 'payload'
import { commitTransaction, initTransaction, killTransaction } from 'payload'

import { cardPrice } from '../../lib/pricing'
import { normalizeSku } from '../utils/sku'
import { canManagePrices } from './access'
import { prepareProductPriceUpdate } from './apply'
import type { AICatalogItem } from './ai-response'
import { buildPreviewPriceInput, candidateByKey, canManuallyConfirmMissingAttributes, type CatalogProduct, type MatchCandidate, matchCatalogItem } from './match'
import { duplicateSkus, parseFreeformPriceList, parsePriceUpdateInput } from './parse'
import { normalizeModelKey } from './normalization.ts'
import { parseManagerMessage } from './openai-parser'
import { buildVerifiedPreviewRows, type VerifiedPreviewRow } from './verified-preview'
import { formatPriceUpdateTarget } from './display.ts'

const PREVIEW_TTL_MS = 30 * 60 * 1000
const MAX_LINES = 1000
const MAX_SOURCE_LENGTH = 100_000

type PriceItemStatus =
  | 'ready'
  | 'not_found'
  | 'invalid_price'
  | 'duplicate_sku_in_input'
  | 'conflict'
  | 'updated'
  | 'failed'

function isUsedCatalogProduct(product: Record<string, any>): boolean {
  const category = product.category && typeof product.category === 'object' ? product.category : null
  const slug = typeof category?.slug === 'string' ? category.slug.toLowerCase() : ''
  return product.condition === 'used' || product.productGroup === 'trade-in' || slug === 'used' || /\bб\s*\/\s*у\b|\bб\.?у\.?\b|used/i.test(`${product.name || ''} ${product.model || ''}`)
}

type PreviewItem = {
  lineNumber: number
  sourceLine: string
  sku?: string
  matchType?: 'product' | 'variant'
  product?: number
  productLabel?: string
  variantId?: string
  oldCashPrice?: number
  newCashPrice?: number
  oldCardPrice?: number
  newCardPrice?: number
  status: PriceItemStatus
  errorMessage?: string
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

function persistenceDiagnostic(error: unknown): Record<string, string> {
  const message = error instanceof Error ? error.message : String(error)
  const enumMatch = message.match(/invalid input value for enum ([\w.]+):\s*"([^"]+)"/i)
  if (enumMatch) {
    const enumName = enumMatch[1]
    const field = enumName.includes('price_import_items_match_status') ? 'matchStatus' : enumName.includes('price_import_items_resolution') ? 'resolution' : 'unknown'
    return {
      payloadErrorCode: '22P02',
      payloadErrorMessage: `Недопустимое значение enum ${enumName}: ${enumMatch[2]}`,
      collection: enumName.includes('price_import_items') ? 'price-import-items' : 'unknown',
      field,
    }
  }
  return { payloadErrorCode: 'persistence_error', payloadErrorMessage: 'Ошибка сохранения данных сопоставления.', collection: 'unknown', field: 'unknown' }
}

function userID(req: PayloadRequest): number | null {
  return req.user ? Number(req.user.id) : null
}

function relationshipID(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: number | string }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}

function itemResponse(item: Record<string, any>) {
  return {
    id: item.id,
    lineNumber: item.lineNumber,
    sourceLine: item.sourceLine,
    sku: item.sku,
    matchType: item.matchType,
    productId: relationshipID(item.product),
    productLabel: item.productLabel,
    variantId: item.variantId,
    oldCashPrice: item.oldCashPrice,
    newCashPrice: item.newCashPrice,
    oldCardPrice: item.oldCardPrice,
    newCardPrice: item.newCardPrice,
    status: item.status,
    errorMessage: item.errorMessage,
  }
}

async function loadMatchingProducts(req: PayloadRequest, skus: string[]): Promise<Record<string, any>[]> {
  if (skus.length === 0) return []

  const [products, variants] = await Promise.all([
    req.payload.find({
      collection: 'products',
      depth: 1,
      limit: Math.min(skus.length, MAX_LINES),
      overrideAccess: true,
      req,
      where: { sku: { in: skus } },
    }),
    req.payload.find({
      collection: 'products',
      depth: 1,
      limit: Math.min(skus.length, MAX_LINES),
      overrideAccess: true,
      req,
      where: { 'variants.sku': { in: skus } },
    }),
  ])

  const byID = new Map<number | string, Record<string, any>>()
  for (const product of [...products.docs, ...variants.docs] as Record<string, any>[]) {
    byID.set(product.id, product)
  }
  return [...byID.values()]
}

async function previewFromSourceText(req: PayloadRequest, sourceText: string, verifiedRows?: VerifiedPreviewRow[]): Promise<Response> {
  if (!sourceText.trim()) return json({ error: 'Вставьте хотя бы одну строку.' }, 400)
  if (sourceText.length > MAX_SOURCE_LENGTH) return json({ error: 'Текст слишком большой.' }, 400)

  if (verifiedRows) return createPreviewFromItems(req, sourceText, verifiedRows)
  const parsed = parsePriceUpdateInput(sourceText, normalizeSku)
  if (parsed.length > MAX_LINES) return json({ error: `Допускается не более ${MAX_LINES} непустых строк.` }, 400)

  const duplicates = duplicateSkus(parsed)
  const validSkus = [...new Set(parsed.filter((line) => line.sku && !line.error).map((line) => line.sku as string))]
  const products = await loadMatchingProducts(req, validSkus)
  const productBySku = new Map<string, Record<string, any>>()
  const variantBySku = new Map<string, { product: Record<string, any>; variant: Record<string, any> }>()

  for (const product of products) {
    const sku = normalizeSku(product.sku)
    if (sku) productBySku.set(sku, product)
    for (const variant of (product.variants || []) as Record<string, any>[]) {
      const variantSku = normalizeSku(variant.sku)
      if (variantSku) variantBySku.set(variantSku, { product, variant })
    }
  }

  const items: PreviewItem[] = parsed.map((line) => {
    if (line.sku && duplicates.has(line.sku)) {
      return { ...line, status: 'duplicate_sku_in_input', errorMessage: 'SKU повторяется во входном тексте.' }
    }
    if (line.error || !line.sku || line.newCashPrice === undefined) {
      return { ...line, status: 'invalid_price', errorMessage: line.error || 'Некорректная строка.' }
    }

    const product = productBySku.get(line.sku)
    if (product) {
      if (isUsedCatalogProduct(product)) return { ...line, status: 'not_found', errorMessage: 'Позиция относится к Б/У товару и не участвует в автоматическом обновлении цен.' }
      const oldCashPrice = Number(product.price)
      return {
        ...line,
        matchType: 'product',
        product: product.id,
        productLabel: formatPriceUpdateTarget(product),
        oldCashPrice,
        oldCardPrice: cardPrice(oldCashPrice) ?? undefined,
        newCardPrice: cardPrice(line.newCashPrice) ?? undefined,
        status: 'ready',
      }
    }

    const variantMatch = variantBySku.get(line.sku)
    if (variantMatch) {
      if (isUsedCatalogProduct(variantMatch.product)) return { ...line, status: 'not_found', errorMessage: 'Позиция относится к Б/У товару и не участвует в автоматическом обновлении цен.' }
      const oldCashPrice = Number(variantMatch.variant.price)
      return {
        ...line,
        matchType: 'variant',
        product: variantMatch.product.id,
        productLabel: formatPriceUpdateTarget(variantMatch.product, variantMatch.variant),
        variantId: String(variantMatch.variant.id),
        oldCashPrice,
        oldCardPrice: cardPrice(oldCashPrice) ?? undefined,
        newCardPrice: cardPrice(line.newCashPrice) ?? undefined,
        status: 'ready',
      }
    }

    return { ...line, status: 'not_found', errorMessage: 'SKU не найден.' }
  })

  // A direct product price and one of its variant prices cannot both define the final root price.
  const productsWithVariantUpdates = new Set(
    items.filter((item) => item.status === 'ready' && item.matchType === 'variant').map((item) => item.product),
  )
  for (const item of items) {
    if (item.status === 'ready' && item.matchType === 'product' && productsWithVariantUpdates.has(item.product)) {
      item.status = 'conflict'
      item.errorMessage = 'В этом пакете обновляется вариант того же товара; корневая цена будет рассчитана по вариантам.'
    }
  }

  const readyCount = items.filter((item) => item.status === 'ready').length
  const errorCount = items.length - readyCount
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS).toISOString()
  const author = userID(req) as number
  const shouldCommit = await initTransaction(req)

  try {
    const batch = await req.payload.create({
      collection: 'price-update-batches',
      overrideAccess: true,
      req,
      data: {
        author,
        sourceText,
        status: 'preview',
        confirmationToken: token,
        expiresAt,
        totalLines: items.length,
        readyCount,
        errorCount,
        updatedCount: 0,
      },
    })

    const createdItems = []
    for (const item of items) {
      createdItems.push(await req.payload.create({
        collection: 'price-update-items',
        overrideAccess: true,
        req,
        data: { ...item, author, batch: batch.id },
      }))
    }

    if (shouldCommit) await commitTransaction(req)
    return json({
      batch: { id: batch.id, status: batch.status, token, expiresAt, totalLines: items.length, readyCount, errorCount, updatedCount: 0 },
      items: createdItems.map((item) => itemResponse(item as Record<string, any>)),
    })
  } catch (error) {
    if (shouldCommit) await killTransaction(req)
    req.payload.logger.error({ err: error }, 'Failed to create price update preview')
    return json({ error: 'Не удалось создать предпросмотр.' }, 500)
  }
}

async function createPreviewFromItems(req: PayloadRequest, sourceText: string, rows: VerifiedPreviewRow[]): Promise<Response> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS).toISOString()
  const author = userID(req) as number
  const shouldCommit = await initTransaction(req)
  try {
    const batch = await req.payload.create({ collection: 'price-update-batches', overrideAccess: true, req, data: {
      author, sourceText, status: 'preview', confirmationToken: token, expiresAt,
      totalLines: rows.length, readyCount: rows.length, errorCount: 0, updatedCount: 0,
    } })
    const createdItems = []
    for (const row of rows) createdItems.push(await req.payload.create({ collection: 'price-update-items', overrideAccess: true, req, data: { ...row, author, batch: batch.id, oldCardPrice: cardPrice(row.oldCashPrice) ?? undefined, newCardPrice: cardPrice(row.newCashPrice) ?? undefined } }))
    if (shouldCommit) await commitTransaction(req)
    return json({ batch: { id: batch.id, status: batch.status, token, expiresAt, totalLines: rows.length, readyCount: rows.length, errorCount: 0, updatedCount: 0 }, items: createdItems.map((item) => itemResponse(item as Record<string, any>)) })
  } catch (error) {
    if (shouldCommit) await killTransaction(req)
    req.payload.logger.error({ err: error }, 'Failed to create verified price update preview')
    return json({ error: 'Не удалось создать предпросмотр.' }, 500)
  }
}

async function previewHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user || !canManagePrices(req.user)) return json({ error: 'Требуется авторизация.' }, 401)
  let body: { sourceText?: unknown }
  try { body = (await req.json!()) as { sourceText?: unknown } } catch { return json({ error: 'Некорректный JSON.' }, 400) }
  return previewFromSourceText(req, typeof body.sourceText === 'string' ? body.sourceText : '')
}

async function claimBatch(req: PayloadRequest, batchID: number, token: string, authorID: number): Promise<boolean> {
  const result = await (req.payload.db as any).drizzle.execute(sql`
    UPDATE "price_update_batches"
    SET "status" = 'confirming', "updated_at" = NOW()
    WHERE "id" = ${batchID}
      AND "confirmation_token" = ${token}
      AND "author_id" = ${authorID}
      AND "status" = 'preview'
      AND "expires_at" > NOW()
    RETURNING "id";
  `)
  return Number(result.rowCount || result.rows?.length || 0) === 1
}

async function confirmHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user || !canManagePrices(req.user)) return json({ error: 'Требуется авторизация.' }, 401)

  let body: { batchId?: unknown; token?: unknown }
  try {
    body = (await req.json!()) as { batchId?: unknown; token?: unknown }
  } catch {
    return json({ error: 'Некорректный JSON.' }, 400)
  }

  const batchID = Number(body.batchId)
  const token = typeof body.token === 'string' ? body.token : ''
  const author = userID(req) as number
  if (!Number.isSafeInteger(batchID) || batchID <= 0 || !token) return json({ error: 'Некорректный пакет.' }, 400)

  const batch = await req.payload.findByID({ collection: 'price-update-batches', id: batchID, depth: 0, overrideAccess: true, req })
  if (relationshipID((batch as any).author) !== author) return json({ error: 'Можно подтверждать только свои пакеты.' }, 403)
  if ((batch as any).confirmationToken !== token) return json({ error: 'Недействительный токен подтверждения.' }, 403)

  if (new Date((batch as any).expiresAt).getTime() <= Date.now() && (batch as any).status === 'preview') {
    await req.payload.update({ collection: 'price-update-batches', id: batchID, overrideAccess: true, req, data: { status: 'expired' } })
    return json({ error: 'Срок действия предпросмотра истёк. Создайте новый.' }, 409)
  }

  if (!(await claimBatch(req, batchID, token, author))) {
    return json({ error: 'Пакет уже подтверждён, обрабатывается или больше недоступен.' }, 409)
  }

  const shouldCommit = await initTransaction(req)
  try {
    const itemResult = await req.payload.find({
      collection: 'price-update-items', depth: 0, limit: MAX_LINES, pagination: false,
      overrideAccess: true, req, sort: 'lineNumber', where: { batch: { equals: batchID } },
    })
    const items = itemResult.docs as Record<string, any>[]
    let updatedCount = 0
    let conflictCount = 0

    for (const item of items.filter((entry) => entry.status === 'ready')) {
      const productID = relationshipID(item.product)
      if (!productID) throw new Error(`Item ${item.id} has no product`)
      const product = await req.payload.findByID({ collection: 'products', id: productID, depth: 0, overrideAccess: true, req }) as any

      const prepared = prepareProductPriceUpdate(product, {
        matchType: item.matchType,
        sku: item.sku,
        variantId: item.variantId,
        oldCashPrice: Number(item.oldCashPrice),
        newCashPrice: Number(item.newCashPrice),
      })
      if (prepared.conflict) {
        conflictCount++
        await req.payload.update({
          collection: 'price-update-items', id: item.id, overrideAccess: true, req,
          data: { status: 'conflict', errorMessage: prepared.error },
        })
        continue
      }
      await req.payload.update({
        collection: 'products', id: productID, overrideAccess: true, req,
        data: prepared.data as any,
      })

      updatedCount++
      await req.payload.update({
        collection: 'price-update-items', id: item.id, overrideAccess: true, req,
        data: { status: 'updated', errorMessage: null },
      })
    }

    const confirmedAt = new Date().toISOString()
    const originalErrors = Number((batch as any).errorCount) || 0
    const confirmedBatch = await req.payload.update({
      collection: 'price-update-batches', id: batchID, overrideAccess: true, req,
      data: { status: 'confirmed', confirmedAt, updatedCount, errorCount: originalErrors + conflictCount },
    })
    const finalItems = await req.payload.find({
      collection: 'price-update-items', depth: 0, limit: MAX_LINES, pagination: false,
      overrideAccess: true, req, sort: 'lineNumber', where: { batch: { equals: batchID } },
    })
    if (shouldCommit) await commitTransaction(req)

    return json({
      batch: {
        id: confirmedBatch.id, status: confirmedBatch.status, totalLines: (batch as any).totalLines,
        readyCount: (batch as any).readyCount, errorCount: originalErrors + conflictCount, updatedCount, confirmedAt,
      },
      items: finalItems.docs.map((item) => itemResponse(item as Record<string, any>)),
    })
  } catch (error) {
    if (shouldCommit) await killTransaction(req)
    req.payload.logger.error({ err: error, batchID }, 'Failed to confirm price update batch')
    await req.payload.update({
      collection: 'price-update-batches', id: batchID, overrideAccess: true,
      data: { status: 'failed', errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка' },
    })
    return json({ error: 'Обновление не применено. Пакет помечен как ошибочный.' }, 500)
  }
}

type StoredCandidate = MatchCandidate & { key: string; displayPath?: string }

function relationText(value: unknown, keys: string[]): string | undefined {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined
  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return undefined
}

function catalogProduct(product: Record<string, any>, simValues = new Map<string, string>()): CatalogProduct {
  return {
    id: product.id,
    name: String(product.name || ''),
    model: typeof product.model === 'string' ? product.model : undefined,
    sku: normalizeSku(product.sku),
    category: product.category && typeof product.category === 'object'
      ? { slug: typeof product.category.slug === 'string' ? product.category.slug : undefined, name: typeof product.category.name === 'string' ? product.category.name : undefined }
      : undefined,
    productGroup: typeof product.productGroup === 'string' ? product.productGroup : undefined,
    condition: product.condition === 'used' || product.condition === 'new' ? product.condition : undefined,
    brand: typeof product.brand === 'string' ? product.brand : undefined,
    productType: typeof product.productType === 'string' ? product.productType : undefined,
    productLine: typeof product.productLine === 'string' ? product.productLine : undefined,
    price: Number(product.price),
    variants: ((product.variants || []) as Record<string, any>[]).map((variant) => ({
      id: String(variant.id),
      sku: normalizeSku(variant.sku) || '',
      price: Number(variant.price),
      color: relationText(variant.color, ['englishLabel', 'russianLabel', 'value']),
      storage: relationText(variant.storage, ['value']),
      sim: relationText(variant.sim, ['label', 'value']) || simValues.get(String(variant.sim)),
      ram: relationText(variant.ramOption, ['key', 'label']) || (typeof variant.ram === 'string' ? variant.ram : undefined),
      size: relationText(variant.sizeOption, ['key', 'label']) || (typeof variant.size === 'string' ? variant.size : undefined),
      screenSize: relationText(variant.screenSizeOption, ['key', 'label']) || (typeof variant.screenSize === 'string' ? variant.screenSize : undefined),
      connectivity: relationText(variant.connectivityOption, ['key', 'label']) || (typeof variant.connectivity === 'string' ? variant.connectivity : undefined),
      generation: typeof variant.generation === 'string' ? variant.generation : undefined,
      chip: typeof variant.chip === 'string' ? variant.chip : undefined,
      manufacturerModelNumber: typeof variant.manufacturerModelNumber === 'string' ? variant.manufacturerModelNumber : undefined,
      region: typeof variant.region === 'string' ? variant.region : undefined,
      hasTouchId: variant.hasTouchId === true,
    })).filter((variant) => Boolean(variant.sku)),
  }
}

async function loadManualModelAliases(req: PayloadRequest, author: number): Promise<Map<string, number | string>> {
  const result = await req.payload.find({
    collection: 'price-import-items' as any, depth: 0, limit: MAX_LINES, pagination: false, overrideAccess: true, req,
    where: { and: [{ author: { equals: author } }, { resolution: { equals: 'manual' } }] },
  })
  const aliases = new Map<string, number | string>()
  for (const item of result.docs as Record<string, any>[]) {
    const productID = relationshipID(item.selectedProduct)
    const key = normalizeModelKey(item.modelText)
    if (productID && key) aliases.set(key, productID)
  }
  return aliases
}

async function loadCatalog(req: PayloadRequest): Promise<CatalogProduct[]> {
  const [result, simOptions] = await Promise.all([
    req.payload.find({
    collection: 'products', depth: 2, limit: MAX_LINES, pagination: false, overrideAccess: true, req,
    }),
    req.payload.find({ collection: 'sim-options', depth: 0, limit: 100, pagination: false, overrideAccess: true, req }),
  ])
  const simValues = new Map<string, string>()
  for (const option of simOptions.docs as Record<string, any>[]) {
    const value = typeof option.value === 'string' ? option.value : ''
    const label = typeof option.label === 'string' ? option.label : ''
    if (!value) continue
    simValues.set(String(option.id), value)
    simValues.set(value, value)
    if (label) simValues.set(label, value)
  }
  return (result.docs as Record<string, any>[]).map((product) => catalogProduct(product, simValues))
}

function importItemResponse(item: Record<string, any>) {
  return {
    id: item.id,
    itemNumber: item.itemNumber,
    sourceLine: item.sourceLine,
    contextHeading: item.contextHeading || '',
    modelText: item.modelText,
    price: Number(item.price),
    storage: item.storage,
    ram: item.ram,
    color: item.color,
    sim: item.sim,
    region: item.region || '',
    revision: item.revision,
    manufacturerModelNumber: item.manufacturerModelNumber,
    notes: item.notes || [],
    matchStatus: item.matchStatus,
    reason: item.reason,
    resolution: item.resolution,
    selectedCandidateKey: item.selectedCandidateKey,
    selectedSku: item.selectedSku,
    candidates: ((item.candidates || []) as StoredCandidate[]).map((candidate) => ({
      key: candidate.key,
      productName: candidate.productName,
      matchType: candidate.matchType,
      sku: candidate.sku,
      storage: candidate.storage,
      ram: candidate.ram,
      color: candidate.color,
      sim: candidate.sim,
      reason: candidate.reason,
      displayPath: candidate.displayPath,
    })),
  }
}

function candidateDisplayPath(candidate: MatchCandidate, catalog: CatalogProduct[]): string {
  const product = catalog.find((entry) => String(entry.id) === String(candidate.productId))
  if (!product) return candidate.productName
  if (candidate.matchType !== 'variant') return formatPriceUpdateTarget(product)
  const variant = product.variants.find((entry) => String(entry.id) === String(candidate.variantId))
  return formatPriceUpdateTarget(product, variant || candidate)
}

async function refreshImportSession(req: PayloadRequest, sessionID: number, author: number) {
  const result = await req.payload.find({
    collection: 'price-import-items' as any, depth: 0, limit: MAX_LINES, pagination: false, overrideAccess: true, req,
    sort: 'itemNumber', where: { and: [{ session: { equals: sessionID } }, { author: { equals: author } }] },
  })
  const items = result.docs as Record<string, any>[]
  const resolvedCount = items.filter((item) => item.resolution === 'automatic' || item.resolution === 'manual').length
  const skippedCount = items.filter((item) => item.resolution === 'skipped').length
  const complete = resolvedCount + skippedCount === items.length
  await req.payload.update({
    collection: 'price-import-sessions' as any, id: sessionID, overrideAccess: true, req,
    data: { resolvedCount, skippedCount, ...(complete ? { status: 'resolved' } : {}) },
  })
  return { items, resolvedCount, skippedCount, complete }
}

async function priceListMatchHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user || !canManagePrices(req.user)) return json({ error: 'Требуется авторизация.' }, 401)
  let body: { message?: unknown }
  try { body = (await req.json!()) as { message?: unknown } } catch { return json({ error: 'Некорректный JSON.' }, 400) }
  const message = typeof body.message === 'string' ? body.message : ''
  if (!message.trim()) return json({ error: 'Вставьте прайс-лист.' }, 400)
  if (message.length > MAX_SOURCE_LENGTH) return json({ error: 'Текст слишком большой.' }, 400)

  const localParsed = parseFreeformPriceList(message)
  let extracted: Awaited<ReturnType<typeof parseManagerMessage>>
  if (localParsed.items.length > 0) {
    extracted = { items: localParsed.items, questions: localParsed.errors }
  } else {
    try { extracted = await parseManagerMessage(message) } catch (error) {
      req.payload.logger.warn({ err: error instanceof Error ? error.message : 'unknown' }, 'AI price-list extraction failed')
      return json({ error: error instanceof Error ? error.message : 'Не удалось разобрать прайс.' }, 502)
    }
  }
  if (extracted.items.length > MAX_LINES) return json({ error: `Допускается не более ${MAX_LINES} позиций.` }, 400)

  const author = userID(req) as number
  const catalog = await loadCatalog(req)
  const aliases = await loadManualModelAliases(req, author)
  const matched = extracted.items.map((item) => {
    const aliasedProductID = aliases.get(normalizeModelKey(item.modelText))
    const aliasedProduct = aliasedProductID === undefined
      ? undefined
      : catalog.find((product) => String(product.id) === String(aliasedProductID))
    const effectiveItem = aliasedProduct
      ? { ...item, modelText: aliasedProduct.name, contextHeading: '' }
      : item
    return { item, result: matchCatalogItem(effectiveItem, catalog) }
  })
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS).toISOString()
  const automaticallyResolved = matched.filter(({ result }) => result.status === 'matched' && result.selected).length
  const initialStatus = automaticallyResolved === matched.length && extracted.questions.length === 0 ? 'resolved' : 'matching'
  const shouldCommit = await initTransaction(req)
  let persistedSessionID: number | null = null
  let persistedItemNumber: number | null = null

  try {
    const session = await req.payload.create({
      collection: 'price-import-sessions' as any, overrideAccess: true, req,
      data: { author, sourceText: message, questions: extracted.questions, status: initialStatus, sessionToken: token, expiresAt, totalItems: matched.length, resolvedCount: automaticallyResolved, skippedCount: 0 },
    }) as any
    persistedSessionID = Number(session.id)
    const items: Record<string, any>[] = []
    for (const [index, entry] of matched.entries()) {
      persistedItemNumber = index + 1
      const candidates: StoredCandidate[] = entry.result.candidates.map((candidate) => ({
        ...candidate,
        key: crypto.randomUUID(),
        displayPath: candidateDisplayPath(candidate, catalog),
      }))
      const selected = entry.result.selected
      const selectedCandidate = selected ? candidates.find((candidate) => candidate.sku === selected.sku && candidate.variantId === selected.variantId) : undefined
      items.push(await req.payload.create({
        collection: 'price-import-items' as any, overrideAccess: true, req,
        data: {
          author, session: session.id, itemNumber: index + 1, ...entry.item,
          matchStatus: entry.result.status, reason: entry.result.reason, candidates,
          resolution: selectedCandidate ? 'automatic' : 'pending',
          selectedCandidateKey: selectedCandidate?.key,
          selectedSku: selectedCandidate?.sku,
          selectedProduct: selectedCandidate?.productId,
          selectedVariantId: selectedCandidate?.variantId,
        },
      }) as any)
    }
    if (shouldCommit) await commitTransaction(req)
    return json({
      session: { id: session.id, token, status: initialStatus, expiresAt, totalItems: matched.length, resolvedCount: automaticallyResolved, skippedCount: 0 },
      questions: extracted.questions,
      items: items.map(importItemResponse),
    })
  } catch (error) {
    if (shouldCommit) await killTransaction(req)
    const diagnostic = persistenceDiagnostic(error)
    req.payload.logger.error({ endpoint: '/api/price-updates/match-price-list', httpStatus: 500, operation: 'persist-match-result', importSessionId: persistedSessionID, itemNumber: persistedItemNumber, ...diagnostic }, 'Failed to persist price-list matching audit')
    return json({ error: 'Не удалось сохранить результат сопоставления.' }, 500)
  }
}

async function currentStoredCandidate(req: PayloadRequest, candidate: StoredCandidate): Promise<StoredCandidate | null> {
  const product = await req.payload.findByID({ collection: 'products', id: candidate.productId, depth: 2, overrideAccess: true, req }) as any
  if (isUsedCatalogProduct(product)) return null
  const current = catalogProduct(product)
  if (candidate.matchType === 'product') {
    return current.sku === candidate.sku ? { ...candidate, productName: current.name, displayPath: formatPriceUpdateTarget(current) } : null
  }
  const variant = current.variants.find((entry) => entry.id === candidate.variantId && entry.sku === candidate.sku)
  return variant ? { ...candidate, productName: current.name, storage: variant.storage, ram: variant.ram, color: variant.color, sim: variant.sim, displayPath: formatPriceUpdateTarget(current, variant) } : null
}

async function importResolveHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user || !canManagePrices(req.user)) return json({ error: 'Требуется авторизация.' }, 401)
  let body: { sessionId?: unknown; token?: unknown; itemId?: unknown; action?: unknown; candidateKey?: unknown }
  try { body = (await req.json!()) as typeof body } catch { return json({ error: 'Некорректный JSON.' }, 400) }
  const sessionID = Number(body.sessionId)
  const itemID = Number(body.itemId)
  const token = typeof body.token === 'string' ? body.token : ''
  const author = userID(req) as number
  if (!Number.isSafeInteger(sessionID) || !Number.isSafeInteger(itemID) || !token) return json({ error: 'Некорректный импорт.' }, 400)

  const session = await req.payload.findByID({ collection: 'price-import-sessions' as any, id: sessionID, depth: 0, overrideAccess: true, req }) as any
  if (relationshipID(session.author) !== author || session.sessionToken !== token) return json({ error: 'Импорт недоступен.' }, 403)
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await req.payload.update({ collection: 'price-import-sessions' as any, id: sessionID, overrideAccess: true, req, data: { status: 'expired' } })
    return json({ error: 'Срок сопоставления истёк.' }, 409)
  }
  if (session.status === 'previewed') return json({ error: 'Импорт уже передан в preview.' }, 409)

  const item = await req.payload.findByID({ collection: 'price-import-items' as any, id: itemID, depth: 0, overrideAccess: true, req }) as any
  if (relationshipID(item.session) !== sessionID || relationshipID(item.author) !== author) return json({ error: 'Позиция не относится к этому импорту.' }, 403)

  if (body.action === 'skip') {
    if (!['not_found', 'missing_attributes', 'manual_review', 'excluded_used'].includes(item.matchStatus)) return json({ error: 'Эту позицию нельзя пропустить данным действием.' }, 400)
    await req.payload.update({ collection: 'price-import-items' as any, id: itemID, overrideAccess: true, req, data: { resolution: 'skipped', selectedCandidateKey: null, selectedSku: null, selectedProduct: null, selectedVariantId: null } })
  } else if (body.action === 'select') {
    const storedCandidates = (item.candidates || []) as StoredCandidate[]
    const canSelect = item.matchStatus === 'ambiguous' || item.matchStatus === 'manual_review'
      || canManuallyConfirmMissingAttributes(item.matchStatus, storedCandidates)
    if (!canSelect) return json({ error: 'Ручное подтверждение доступно только для неоднозначной позиции или единственного найденного кандидата с неподдерживаемым атрибутом.' }, 400)
    const candidateKey = typeof body.candidateKey === 'string' ? body.candidateKey : ''
    const candidate = candidateByKey(storedCandidates, candidateKey)
    if (!candidate) return json({ error: 'Кандидат больше не доступен.' }, 409)
    const current = await currentStoredCandidate(req, candidate)
    if (!current) return json({ error: 'Товар или SKU изменился. Разберите прайс заново.' }, 409)
    await req.payload.update({
      collection: 'price-import-items' as any, id: itemID, overrideAccess: true, req,
      data: {
        resolution: 'manual', selectedCandidateKey: candidate.key, selectedSku: current.sku, selectedProduct: current.productId, selectedVariantId: current.variantId,
        candidates: storedCandidates.map((entry) => entry.key === candidate.key ? { ...entry, ...current } : entry),
      },
    })
    req.payload.logger.info({ sessionID, itemID, candidateKey: candidate.key.slice(0, 12), matchedSku: normalizeSku(current.sku), matchType: current.matchType }, 'Price import manual candidate selected')
  } else return json({ error: 'Неизвестное действие.' }, 400)

  const refreshed = await refreshImportSession(req, sessionID, author)
  return json({ session: { id: sessionID, token, status: refreshed.complete ? 'resolved' : 'matching', totalItems: refreshed.items.length, resolvedCount: refreshed.resolvedCount, skippedCount: refreshed.skippedCount }, items: refreshed.items.map(importItemResponse) })
}

async function importPreviewHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user || !canManagePrices(req.user)) return json({ error: 'Требуется авторизация.' }, 401)
  let body: { sessionId?: unknown; token?: unknown }
  try { body = (await req.json!()) as typeof body } catch { return json({ error: 'Некорректный JSON.' }, 400) }
  const sessionID = Number(body.sessionId)
  const token = typeof body.token === 'string' ? body.token : ''
  const author = userID(req) as number
  if (!Number.isSafeInteger(sessionID) || !token) return json({ error: 'Некорректный импорт.' }, 400)

  const session = await req.payload.findByID({ collection: 'price-import-sessions' as any, id: sessionID, depth: 0, overrideAccess: true, req }) as any
  if (relationshipID(session.author) !== author || session.sessionToken !== token) return json({ error: 'Импорт недоступен.' }, 403)
  if (new Date(session.expiresAt).getTime() <= Date.now()) return json({ error: 'Срок сопоставления истёк.' }, 409)
  const refreshed = await refreshImportSession(req, sessionID, author)
  if (!refreshed.complete || refreshed.items.some((item) => item.resolution === 'pending')) return json({ error: 'Сначала разрешите или пропустите все позиции.' }, 409)
  const selectedItems = refreshed.items.filter((item) => item.resolution === 'automatic' || item.resolution === 'manual')
  const catalog = await loadCatalog(req)
  let verified: VerifiedPreviewRow[]
  try {
    verified = buildVerifiedPreviewRows(selectedItems, catalog as any, (diagnostic) => {
      req.payload.logger.info({ sessionID, ...diagnostic }, 'Price import verified candidate checked')
    })
  } catch (error) {
    req.payload.logger.warn({
      sessionID,
      itemCount: selectedItems.length,
      manualCount: selectedItems.filter((item) => item.resolution === 'manual').length,
      error: error instanceof Error ? error.message : 'verification_failed',
    }, 'Price import verified row rejected')
    return json({ error: error instanceof Error ? error.message : 'Не удалось проверить выбранные товары.' }, 409)
  }
  if (verified.length === 0) return json({ error: 'Все позиции пропущены; создавать preview нечего.' }, 400)
  req.payload.logger.info({ sessionID, itemCount: verified.length, manualCount: selectedItems.filter((item) => item.resolution === 'manual').length, skus: verified.map((item) => item.sku.slice(0, 24)) }, 'Price import verified rows prepared')

  const claim = await (req.payload.db as any).drizzle.execute(sql`
    UPDATE "price_import_sessions" SET "status" = 'previewed', "updated_at" = NOW()
    WHERE "id" = ${sessionID} AND "author_id" = ${author} AND "session_token" = ${token}
      AND "status" = 'resolved' AND "expires_at" > NOW() RETURNING "id";
  `)
  if (Number(claim.rowCount || claim.rows?.length || 0) !== 1) return json({ error: 'Импорт уже передан в preview или больше недоступен.' }, 409)

  const response = await previewFromSourceText(req, verified.map((item) => `${item.sku} — ${item.newCashPrice}`).join('\n'), verified)
  if (response.ok) {
    const preview = await response.clone().json() as any
    await req.payload.update({ collection: 'price-import-sessions' as any, id: sessionID, overrideAccess: true, req, data: { previewBatch: preview.batch?.id } })
  } else {
    await req.payload.update({ collection: 'price-import-sessions' as any, id: sessionID, overrideAccess: true, req, data: { status: 'failed', errorMessage: 'Не удалось создать preview.' } })
  }
  return response
}

async function parseMessageHandler(req: PayloadRequest): Promise<Response> {
  if (!req.user || !canManagePrices(req.user)) return json({ error: 'Требуется авторизация.' }, 401)
  let body: { message?: unknown }
  try { body = (await req.json!()) as { message?: unknown } } catch { return json({ error: 'Некорректный JSON.' }, 400) }
  const message = typeof body.message === 'string' ? body.message : ''
  if (!message.trim()) return json({ error: 'Введите сообщение менеджера.' }, 400)
  try {
    return json(await parseManagerMessage(message))
  } catch (error) {
    req.payload.logger.warn({ err: error instanceof Error ? error.message : 'unknown' }, 'AI price parsing failed')
    return json({ error: error instanceof Error ? error.message : 'Не удалось разобрать сообщение.' }, 502)
  }
}

export const priceUpdateEndpoints: Endpoint[] = [
  { path: '/price-updates/parse-message', method: 'post', handler: parseMessageHandler },
  { path: '/price-updates/match-price-list', method: 'post', handler: priceListMatchHandler },
  { path: '/price-updates/resolve-import-item', method: 'post', handler: importResolveHandler },
  { path: '/price-updates/preview-import', method: 'post', handler: importPreviewHandler },
  { path: '/price-updates/preview', method: 'post', handler: previewHandler },
  { path: '/price-updates/confirm', method: 'post', handler: confirmHandler },
]
