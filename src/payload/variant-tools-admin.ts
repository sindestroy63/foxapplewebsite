import type { CollectionSlug, Endpoint, PayloadRequest, Where } from 'payload'

import type { Product } from '../payload-types.ts'
import { hasFullAdminAccess } from './access.ts'
import { isAllowedStorageValue } from './catalog-normalization/allowed-values.ts'
import { resolveDeviceType } from './products/device-type.ts'
import {
  DIMENSION_KEYS,
  COMMON_TEXT_KEYS,
  applyVariantChanges,
  isVariantStatus,
  planVariants,
  relationId,
  validateProductChange,
  type BuildInput,
  type CommonTextKey,
  type DimensionKey,
  type ProductChange,
  type RelationId,
  type VariantChange,
  type VariantRow,
} from './variant-tools/plan.ts'
import { profileFor } from './variant-tools/profiles.ts'

type Doc = Record<string, unknown>

function record(value: unknown): Doc {
  return value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value)) : {}
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status })
}

async function readBody(req: PayloadRequest): Promise<Doc> {
  try {
    return record(await req.json?.())
  } catch {
    return {}
  }
}

function dictionaryLabel(key: string, value: unknown): string {
  const doc = record(value)
  if (key === 'color') {
    const english = text(doc.englishLabel)
    const russian = text(doc.russianLabel)
    return english && russian ? `${english} · ${russian}` : english || russian
  }
  if (key === 'storage') return text(doc.value)
  return text(doc.label) || text(doc.value) || text(doc.key)
}

function variantTitle(variant: Doc): string {
  const parts = DIMENSION_KEYS.map((key) => dictionaryLabel(key, variant[key]))
  const extras = COMMON_TEXT_KEYS.map((key) => text(variant[key]))
  return [...parts, ...extras].filter(Boolean).join(' · ') || 'Без параметров'
}

const DICTIONARIES: Record<DimensionKey, { collection: CollectionSlug; where?: Where }> = {
  color: { collection: 'colors' },
  storage: { collection: 'storage-options', where: { archived: { not_equals: true } } },
  sim: { collection: 'sim-options', where: { value: { in: ['ESIM', 'SIM_ESIM'] } } },
  sizeOption: { collection: 'variant-size-options', where: { archived: { not_equals: true } } },
  ramOption: { collection: 'ram-options', where: { archived: { not_equals: true } } },
  connectivityOption: { collection: 'connectivity-options', where: { archived: { not_equals: true } } },
  screenSizeOption: { collection: 'screen-size-options', where: { archived: { not_equals: true } } },
}

const DIMENSION_TITLES: Record<DimensionKey, string> = {
  color: 'Цвета',
  storage: 'Память',
  sim: 'SIM',
  sizeOption: 'Размер корпуса',
  ramOption: 'Оперативная память',
  connectivityOption: 'Подключение',
  screenSizeOption: 'Диагональ',
}

const COMMON_TITLES: Record<CommonTextKey, string> = {
  chip: 'Чип',
  generation: 'Поколение / модель',
  packageLabel: 'Комплектация',
  material: 'Материал ремешка',
  strapSize: 'Размер ремешка',
}

function parseDimensions(value: unknown): Partial<Record<DimensionKey, RelationId[]>> {
  const source = record(value)
  const dims: Partial<Record<DimensionKey, RelationId[]>> = {}
  for (const key of DIMENSION_KEYS) {
    dims[key] = list(source[key]).filter((item): item is RelationId => typeof item === 'string' || typeof item === 'number')
  }
  return dims
}

function parseCommon(value: unknown): Partial<Record<CommonTextKey, string>> {
  const source = record(value)
  const common: Partial<Record<CommonTextKey, string>> = {}
  for (const key of COMMON_TEXT_KEYS) {
    const item = text(source[key])
    if (item) common[key] = item
  }
  return common
}

function parsePriceMap(value: unknown): Record<string, number> {
  const prices: Record<string, number> = {}
  for (const [key, item] of Object.entries(record(value))) {
    if (typeof item === 'number') prices[key] = item
  }
  return prices
}

function parseChanges(value: unknown): VariantChange[] | null {
  const changes: VariantChange[] = []
  for (const item of list(value)) {
    const source = record(item)
    const variantId = text(source.variantId)
    if (!variantId) return null
    const change: VariantChange = { variantId }
    if (source.price !== undefined) {
      if (typeof source.price !== 'number') return null
      change.price = source.price
    }
    if (source.status !== undefined) {
      if (!isVariantStatus(source.status)) return null
      change.status = source.status
    }
    if (source.isAvailable !== undefined) {
      if (typeof source.isAvailable !== 'boolean') return null
      change.isAvailable = source.isAvailable
    }
    changes.push(change)
  }
  return changes
}

function parseProductChange(value: unknown): ProductChange | null {
  const source = record(value)
  const change: ProductChange = {}
  if (source.price !== undefined) {
    if (typeof source.price !== 'number') return null
    change.price = source.price
  }
  if (source.status !== undefined) {
    if (!isVariantStatus(source.status)) return null
    change.status = source.status
  }
  if (source.isAvailable !== undefined) {
    if (typeof source.isAvailable !== 'boolean') return null
    change.isAvailable = source.isAvailable
  }
  return change
}

async function loadProduct(req: PayloadRequest, id: unknown, depth = 0): Promise<Doc | null> {
  if (typeof id !== 'string' && typeof id !== 'number') return null
  try {
    return record(await req.payload.findByID({ collection: 'products', id, depth, req }))
  } catch {
    return null
  }
}

function existingRows(product: Doc): VariantRow[] {
  return list(product.variants).map((row) => record(row))
}

function productKey(product: Doc): string | number | null {
  return typeof product.id === 'number' || typeof product.id === 'string' ? product.id : null
}

async function saveVariants(req: PayloadRequest, productId: string | number, rows: VariantRow[]): Promise<string | null> {
  const variants = rows as NonNullable<Product['variants']>
  try {
    await req.payload.update({ collection: 'products', id: productId, data: { variants }, depth: 0, req })
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Не удалось сохранить товар.'
  }
}

async function saveProductFields(req: PayloadRequest, productId: string | number, data: ProductChange): Promise<string | null> {
  try {
    await req.payload.update({ collection: 'products', id: productId, data, depth: 0, req })
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Не удалось сохранить товар.'
  }
}

export const variantToolsEndpoints: Endpoint[] = [
  {
    path: '/variant-tools/overview',
    method: 'get',
    handler: async (req) => {
      if (!hasFullAdminAccess(req.user)) return fail(403, 'Нет доступа.')
      const result = await req.payload.find({ collection: 'products', depth: 1, limit: 10000, pagination: false, sort: 'name', req })
      const products = result.docs.map((raw) => {
        const doc = record(raw)
        return {
          id: doc.id,
          name: text(doc.name),
          group: text(doc.productGroup),
          brand: text(doc.brand),
          status: text(doc.status),
          isAvailable: doc.isAvailable !== false,
          price: typeof doc.price === 'number' ? doc.price : null,
          variants: list(doc.variants).map((row) => {
            const variant = record(row)
            return {
              id: text(variant.id),
              sku: text(variant.sku),
              title: variantTitle(variant),
              colorHex: text(record(variant.color).primaryHex),
              price: typeof variant.price === 'number' ? variant.price : null,
              status: text(variant.status),
              isAvailable: variant.isAvailable !== false,
            }
          }),
        }
      })
      return Response.json({ products })
    },
  },
  {
    path: '/variant-tools/options',
    method: 'get',
    handler: async (req) => {
      if (!hasFullAdminAccess(req.user)) return fail(403, 'Нет доступа.')
      const productId = req.searchParams.get('productId')
      const product = await loadProduct(req, productId, 1)
      if (!product) return fail(404, 'Товар не найден.')
      const deviceType = resolveDeviceType(product)
      const profile = profileFor(deviceType)

      const dimensions = await Promise.all(
        profile.dimensions.map(async (key) => {
          const source = DICTIONARIES[key]
          const found = await req.payload.find({
            collection: source.collection,
            where: source.where,
            depth: 0,
            limit: 1000,
            pagination: false,
            sort: 'sortOrder',
            req,
          })
          return {
            key,
            title: DIMENSION_TITLES[key],
            options: found.docs
              .map((raw) => record(raw))
              .filter((doc) => key !== 'storage' || isAllowedStorageValue(doc.value))
              .map((doc) => ({ id: doc.id, label: dictionaryLabel(key, doc), hex: text(doc.primaryHex) })),
          }
        }),
      )

      return Response.json({
        product: { id: product.id, name: text(product.name), deviceType, hint: profile.hint },
        dimensions,
        common: profile.common.map((key) => ({ key, title: COMMON_TITLES[key] })),
        existing: existingRows(product).map((row) => ({
          id: text(row.id),
          title: variantTitle(row),
          combo: Object.fromEntries(DIMENSION_KEYS.map((key) => [key, relationId(row[key])])),
        })),
      })
    },
  },
  {
    path: '/variant-tools/build',
    method: 'post',
    handler: async (req) => {
      if (!hasFullAdminAccess(req.user)) return fail(403, 'Нет доступа.')
      const body = await readBody(req)
      const product = await loadProduct(req, body.productId)
      if (!product) return fail(404, 'Товар не найден.')
      const productId = productKey(product)
      if (productId === null) return fail(500, 'Некорректный идентификатор товара.')

      const input: BuildInput = {
        dims: parseDimensions(body.dims),
        common: parseCommon(body.common),
        basePrice: typeof body.basePrice === 'number' ? body.basePrice : undefined,
        priceByStorage: parsePriceMap(body.priceByStorage),
        status: isVariantStatus(body.status) ? body.status : undefined,
      }
      const rows = existingRows(product)
      const plan = planVariants(input, rows)
      if (!plan.ok) return fail(400, plan.error)
      if (plan.add.length === 0) return fail(400, 'Все выбранные комбинации уже есть у товара.')
      if (body.dryRun === true) return Response.json({ add: plan.add.length, skipped: plan.skipped })

      const problem = await saveVariants(req, productId, [...rows, ...plan.add])
      if (problem) return fail(400, problem)
      return Response.json({ added: plan.add.length, skipped: plan.skipped, total: rows.length + plan.add.length })
    },
  },
  {
    path: '/variant-tools/update',
    method: 'post',
    handler: async (req) => {
      if (!hasFullAdminAccess(req.user)) return fail(403, 'Нет доступа.')
      const body = await readBody(req)
      const product = await loadProduct(req, body.productId)
      if (!product) return fail(404, 'Товар не найден.')
      const productId = productKey(product)
      if (productId === null) return fail(500, 'Некорректный идентификатор товара.')
      const variantChanges = body.changes === undefined ? [] : parseChanges(body.changes)
      if (!variantChanges) return fail(400, 'Некорректные данные изменений.')
      const productChange = body.product === undefined ? null : parseProductChange(body.product)
      if (body.product !== undefined && !productChange) return fail(400, 'Некорректные данные изменений.')
      if (variantChanges.length === 0 && !productChange) return fail(400, 'Нет изменений для сохранения.')

      let changed = 0

      if (variantChanges.length > 0) {
        const result = applyVariantChanges(existingRows(product), variantChanges)
        if (!result.ok) return fail(400, result.error)
        if (result.changed > 0) {
          const problem = await saveVariants(req, productId, result.rows)
          if (problem) return fail(400, problem)
          changed += result.changed
        }
      }

      if (productChange) {
        const checked = validateProductChange(productChange)
        if (!checked.ok) return fail(400, checked.error)
        const { price, status, isAvailable } = checked.data
        const differs =
          (price !== undefined && price !== product.price) ||
          (status !== undefined && status !== product.status) ||
          (isAvailable !== undefined && isAvailable !== (product.isAvailable !== false))
        if (differs) {
          const problem = await saveProductFields(req, productId, checked.data)
          if (problem) return fail(400, problem)
          changed += 1
        }
      }

      return Response.json({ changed })
    },
  },
]
