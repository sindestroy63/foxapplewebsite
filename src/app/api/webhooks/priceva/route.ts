import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
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

    if (webhookSecret && providedToken !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!webhookSecret && !providedToken) {
      return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 401 })
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
        skuPriceMap.set(sku, Math.round(price))
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

    for (let i = 0; i < targetSkus.length; i += CHUNK_SIZE) {
      const chunk = targetSkus.slice(i, i + CHUNK_SIZE)
      const numericIds = chunk.map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0)
      const orConditions: any[] = [
        { sku: { in: chunk } },
        { 'variants.sku': { in: chunk } },
        { 'variants.id': { in: chunk } },
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
      let updatedVariantsInProduct = 0

      const hasVariants = Array.isArray(product.variants) && product.variants.length > 0
      let updatedVariants = hasVariants ? [...product.variants] : []

      if (hasVariants) {
        updatedVariants = updatedVariants.map((variant: any, idx: number) => {
          const vSku = normalizeSku(variant.sku)
          const vId = normalizeSku(variant.id)
          const combo1 = product.sku ? normalizeSku(`${product.sku}-${variant.id || idx + 1}`) : ''
          const combo2 = normalizeSku(`OFFER-${product.id}-${variant.id || idx + 1}`)

          let targetPrice: number | undefined
          if (vSku && skuPriceMap.has(vSku)) targetPrice = skuPriceMap.get(vSku)
          else if (vId && skuPriceMap.has(vId)) targetPrice = skuPriceMap.get(vId)
          else if (combo1 && skuPriceMap.has(combo1)) targetPrice = skuPriceMap.get(combo1)
          else if (combo2 && skuPriceMap.has(combo2)) targetPrice = skuPriceMap.get(combo2)

          if (targetPrice != null && Number(variant.price) !== targetPrice) {
            productChanged = true
            updatedVariantsInProduct++
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
        const pSku = normalizeSku(product.sku)
        const pId = normalizeSku(product.id)
        const comboOffer = normalizeSku(`OFFER-${product.id}`)

        let targetPrice: number | undefined
        if (pSku && skuPriceMap.has(pSku)) targetPrice = skuPriceMap.get(pSku)
        else if (pId && skuPriceMap.has(pId)) targetPrice = skuPriceMap.get(pId)
        else if (comboOffer && skuPriceMap.has(comboOffer)) targetPrice = skuPriceMap.get(comboOffer)

        if (targetPrice != null && newProductPrice !== targetPrice) {
          newProductPrice = targetPrice
          productChanged = true
          totalUpdatedPositions++
        }
      }

      if (productChanged) {
        totalUpdatedPositions += updatedVariantsInProduct
        productsUpdatedCount++

        const updateData: Record<string, any> = {
          price: newProductPrice,
        }
        if (hasVariants) {
          updateData.variants = updatedVariants
        }

        await payload.update({
          collection: 'products',
          id: product.id,
          overrideAccess: true,
          data: updateData,
        })

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
