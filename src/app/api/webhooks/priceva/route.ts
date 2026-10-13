import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { productCanonicalUrl } from '@/lib/product-url'

export const dynamic = 'force-dynamic'

interface PriceUpdateInputItem {
  sku?: string
  id?: string | number
  article?: string
  offer_id?: string | number
  offerId?: string | number
  price?: number | string
  new_price?: number | string
  newPrice?: number | string
  discount_price?: number | string
  discountPrice?: number | string
}

function parsePrice(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 ? null : value
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s+/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) || parsed <= 0 ? null : parsed
  }
  return null
}

function normalizeSku(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).trim().toUpperCase()
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'priceva-webhook' })
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.PRICEVA_WEBHOOK_TOKEN || process.env.PRICEVA_TOKEN || process.env.WEBHOOK_SECRET
    const headerToken = request.headers.get('x-webhook-token')
    const queryToken = request.nextUrl.searchParams.get('token')
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null

    const providedToken = headerToken || queryToken || bearerToken

    if (!webhookSecret || !providedToken || providedToken !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    let rawList: PriceUpdateInputItem[] = []
    if (Array.isArray(body)) {
      rawList = body
    } else if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>
      if (Array.isArray(record.items)) rawList = record.items
      else if (Array.isArray(record.updates)) rawList = record.updates
      else if (Array.isArray(record.data)) rawList = record.data
      else if (Array.isArray(record.products)) rawList = record.products
      else if (record.sku && (record.price != null || record.new_price != null)) rawList = [record as PriceUpdateInputItem]
    }

    const skuPriceMap = new Map<string, number>()
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue
      const rawSku = item.sku ?? item.id ?? item.article ?? item.offer_id ?? item.offerId
      const sku = normalizeSku(rawSku)
      const rawPrice = item.price ?? item.new_price ?? item.newPrice ?? item.discount_price ?? item.discountPrice
      const price = parsePrice(rawPrice)

      if (sku && price !== null) {
        const rounded = Math.round(price)
        skuPriceMap.set(sku, rounded)
        skuPriceMap.set(sku.toLowerCase(), rounded)
        const hex = rawSku != null ? String(rawSku).match(/[a-f0-9]{24}/i)?.[0] : null
        if (hex) {
          skuPriceMap.set(hex.toLowerCase(), rounded)
          skuPriceMap.set(hex.toUpperCase(), rounded)
        }
      }
    }

    if (skuPriceMap.size === 0) {
      return NextResponse.json({
        success: true,
        status: 'ok',
        updated: 0,
        message: 'No valid SKU price updates found in request',
      })
    }

    const payload = await getPayload({ config })
    const targetSkus = Array.from(skuPriceMap.keys())
    const productsMap = new Map<number | string, any>()
    const CHUNK_SIZE = 200

    const drizzle = (payload.db as any)?.drizzle
    const matchedProductIds = new Set<number>()

    if (drizzle && targetSkus.length > 0) {
      for (let i = 0; i < targetSkus.length; i += CHUNK_SIZE) {
        const chunk = targetSkus.slice(i, i + CHUNK_SIZE)
        const lowerList = chunk.map((s) => s.toLowerCase())
        const hexIds = chunk
          .map((s) => s.match(/[a-f0-9]{24}/i)?.[0]?.toLowerCase())
          .filter((id): id is string => Boolean(id))
        const numIds = chunk
          .map((s) => {
            const m = s.match(/^offer-(\d+)/i)
            return m ? Number(m[1]) : Number(s)
          })
          .filter((n) => Number.isInteger(n) && n > 0)

        try {
          const pRes = await drizzle.execute({
            sql: 'SELECT id FROM "products" WHERE LOWER("sku") = ANY($1)',
            args: [lowerList],
          })
          for (const r of (pRes.rows || pRes) as any[]) {
            if (r.id != null) matchedProductIds.add(Number(r.id))
          }

          const vRes = await drizzle.execute({
            sql: 'SELECT "_parent_id" AS id FROM "products_variants" WHERE LOWER("sku") = ANY($1) OR LOWER("id") = ANY($2)',
            args: [lowerList, hexIds.length > 0 ? hexIds : lowerList],
          })
          for (const r of (vRes.rows || vRes) as any[]) {
            if (r.id != null) matchedProductIds.add(Number(r.id))
          }

          if (numIds.length > 0) {
            const numRes = await drizzle.execute({
              sql: 'SELECT id FROM "products" WHERE id = ANY($1)',
              args: [numIds],
            })
            for (const r of (numRes.rows || numRes) as any[]) {
              if (r.id != null) matchedProductIds.add(Number(r.id))
            }
          }
        } catch {}
      }
    }

    if (matchedProductIds.size > 0) {
      const pDocs = await payload.find({
        collection: 'products',
        depth: 0,
        limit: matchedProductIds.size,
        pagination: false,
        overrideAccess: true,
        where: { id: { in: Array.from(matchedProductIds) } },
      })
      for (const doc of pDocs.docs as any[]) {
        productsMap.set(doc.id, doc)
      }
    }

    for (let i = 0; i < targetSkus.length; i += CHUNK_SIZE) {
      const chunk = targetSkus.slice(i, i + CHUNK_SIZE)
      const numericIds = chunk.map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0)
      const termsSet = new Set<string>()
      for (const item of chunk) {
        termsSet.add(item)
        termsSet.add(item.toUpperCase())
        termsSet.add(item.toLowerCase())
      }
      const searchTerms = Array.from(termsSet)
      const orConditions: any[] = [
        { sku: { in: searchTerms } },
        { 'variants.sku': { in: searchTerms } },
        { 'variants.id': { in: searchTerms } },
      ]
      if (numericIds.length > 0) {
        orConditions.push({ id: { in: numericIds } })
      }
      const foundDocs = await payload.find({
        collection: 'products',
        depth: 0,
        limit: CHUNK_SIZE * 4,
        pagination: false,
        overrideAccess: true,
        where: { or: orConditions },
      })

      for (const doc of foundDocs.docs as any[]) {
        productsMap.set(doc.id, doc)
      }
    }

    let totalUpdatedPositions = 0
    let productsUpdatedCount = 0
    const affectedPaths = new Set<string>()

    for (const product of productsMap.values()) {
      let productChanged = false
      const modifiedVariantRows: Array<{ id: string; price: number }> = []

      const hasVariants = Array.isArray(product.variants) && product.variants.length > 0
      let updatedVariants = hasVariants ? [...product.variants] : []

      if (hasVariants) {
        updatedVariants = updatedVariants.map((variant: any, idx: number) => {
          const vSkuNorm = normalizeSku(variant.sku)
          const vSkuLower = String(variant.sku || '').trim().toLowerCase()
          const vId = String(variant.id || '').trim().toLowerCase()
          const combo1 = product.sku ? normalizeSku(`${product.sku}-${variant.id || idx + 1}`) : ''
          const combo2 = normalizeSku(`OFFER-${product.id}-${variant.id || idx + 1}`)

          let targetPrice: number | undefined
          if (vSkuNorm && skuPriceMap.has(vSkuNorm)) targetPrice = skuPriceMap.get(vSkuNorm)
          else if (vSkuLower && skuPriceMap.has(vSkuLower)) targetPrice = skuPriceMap.get(vSkuLower)
          else if (vId && skuPriceMap.has(vId)) targetPrice = skuPriceMap.get(vId)
          else if (combo1 && skuPriceMap.has(combo1)) targetPrice = skuPriceMap.get(combo1)
          else if (combo2 && skuPriceMap.has(combo2)) targetPrice = skuPriceMap.get(combo2)

          if (targetPrice != null && Number(variant.price) !== targetPrice) {
            productChanged = true
            modifiedVariantRows.push({ id: String(variant.id), price: targetPrice })
            return { ...variant, price: targetPrice }
          }
          return variant
        })
      }

      let newProductPrice = Number(product.price)

      if (hasVariants) {
        if (productChanged) {
          const validVariantPrices = updatedVariants
            .map((v: any) => Number(v.price))
            .filter((p: number) => !isNaN(p) && p > 0)
          if (validVariantPrices.length > 0) {
            newProductPrice = Math.min(...validVariantPrices)
          }
        }
      } else {
        const pSkuNorm = normalizeSku(product.sku)
        const pSkuLower = String(product.sku || '').trim().toLowerCase()
        const pId = String(product.id || '').trim().toLowerCase()
        const comboOffer = normalizeSku(`OFFER-${product.id}`)

        let targetPrice: number | undefined
        if (pSkuNorm && skuPriceMap.has(pSkuNorm)) targetPrice = skuPriceMap.get(pSkuNorm)
        else if (pSkuLower && skuPriceMap.has(pSkuLower)) targetPrice = skuPriceMap.get(pSkuLower)
        else if (pId && skuPriceMap.has(pId)) targetPrice = skuPriceMap.get(pId)
        else if (comboOffer && skuPriceMap.has(comboOffer)) targetPrice = skuPriceMap.get(comboOffer)

        if (targetPrice != null && newProductPrice !== targetPrice) {
          newProductPrice = targetPrice
          productChanged = true
          totalUpdatedPositions++
        }
      }

      if (productChanged) {
        totalUpdatedPositions += modifiedVariantRows.length
        productsUpdatedCount++

        if (drizzle) {
          try {
            for (const row of modifiedVariantRows) {
              await drizzle.execute({
                sql: 'UPDATE "products_variants" SET "price" = $1 WHERE "id" = $2',
                args: [row.price, row.id],
              })
            }
            await drizzle.execute({
              sql: 'UPDATE "products" SET "price" = $1, "updated_at" = NOW() WHERE "id" = $2',
              args: [newProductPrice, product.id],
            })
          } catch {
            const updateData: Record<string, any> = { price: newProductPrice }
            if (hasVariants) updateData.variants = updatedVariants
            await payload.update({
              collection: 'products',
              id: product.id,
              overrideAccess: true,
              data: updateData,
            })
          }
        } else {
          const updateData: Record<string, any> = { price: newProductPrice }
          if (hasVariants) updateData.variants = updatedVariants
          await payload.update({
            collection: 'products',
            id: product.id,
            overrideAccess: true,
            data: updateData,
          })
        }

        const canonicalPath = productCanonicalUrl({
          slug: product.slug,
          productGroup: product.productGroup,
          category: product.category,
        })
        if (canonicalPath) {
          affectedPaths.add(canonicalPath)
        }
      }
    }

    if (totalUpdatedPositions > 0) {
      try {
        revalidatePath('/catalog', 'layout')
        revalidatePath('/')
        for (const path of affectedPaths) {
          revalidatePath(path)
        }
      } catch (err) {
        payload.logger.error({ err }, 'Priceva webhook cache revalidation error')
      }
    }

    return NextResponse.json({
      success: true,
      status: 'ok',
      updated: totalUpdatedPositions,
      productsUpdated: productsUpdatedCount,
      totalRequested: targetSkus.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
