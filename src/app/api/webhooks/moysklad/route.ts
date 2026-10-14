import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { productCanonicalUrl } from '@/lib/product-url'

export const dynamic = 'force-dynamic'

interface MoySkladEvent {
  meta?: {
    type?: string
    href?: string
  }
  action?: string
}

interface WebhookPayload {
  events?: MoySkladEvent[]
  sku?: string
  stock?: number
  quantity?: number
  is_available?: boolean
  items?: Array<{
    sku?: string
    stock?: number
    quantity?: number
    is_available?: boolean
  }>
  positions?: Array<{
    assortment?: {
      id?: string
      article?: string
      code?: string
      externalCode?: string
      meta?: { href?: string; type?: string }
    }
  }>
}

async function fetchMoySkladJson(url: string, token: string) {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'moysklad-webhook' })
}

export async function POST(request: NextRequest) {
  try {
    const configuredToken = process.env.MOYSKLAD_WEBHOOK_TOKEN || process.env.MOYSKLAD_TOKEN || '03b076486453ce090a8f28978a12af9a6dfbe137'
    const apiToken = process.env.MOYSKLAD_API_TOKEN || process.env.MOYSKLAD_TOKEN || '03b076486453ce090a8f28978a12af9a6dfbe137'

    const headerToken = request.headers.get('x-webhook-token') || request.headers.get('x-hook-secret')
    const queryToken = request.nextUrl.searchParams.get('token') || request.nextUrl.searchParams.get('secret')
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader && authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null

    const providedToken = headerToken || queryToken || bearerToken

    if (configuredToken && providedToken !== configuredToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: WebhookPayload
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const skuStockMap = new Map<string, boolean>()

    if (body.sku) {
      const isAvail = typeof body.is_available === 'boolean'
        ? body.is_available
        : (Number(body.quantity ?? body.stock ?? 0) > 0)
      skuStockMap.set(body.sku.trim().toLowerCase(), isAvail)
    }

    if (Array.isArray(body.items)) {
      for (const item of body.items) {
        if (!item?.sku) continue
        const isAvail = typeof item.is_available === 'boolean'
          ? item.is_available
          : (Number(item.quantity ?? item.stock ?? 0) > 0)
        skuStockMap.set(item.sku.trim().toLowerCase(), isAvail)
      }
    }

    const targetAssortmentIds = new Set<string>()
    const targetCodes = new Set<string>()
    const targetArticles = new Set<string>()

    if (Array.isArray(body.positions)) {
      for (const pos of body.positions) {
        const ass = pos.assortment
        if (ass?.id) targetAssortmentIds.add(ass.id)
        if (ass?.article) targetArticles.add(ass.article.trim())
        if (ass?.code) targetCodes.add(ass.code.trim())
      }
    }

    if (Array.isArray(body.events)) {
      for (const event of body.events) {
        const eventType = event.meta?.type
        const eventHref = event.meta?.href
        if (!eventHref) continue

        if (eventType === 'product' || eventType === 'variant') {
          const parts = eventHref.split('/')
          const lastPart = parts[parts.length - 1]
          if (lastPart) targetAssortmentIds.add(lastPart)
        } else {
          const positionsData = await fetchMoySkladJson(`${eventHref}/positions?expand=assortment`, apiToken)
          if (positionsData && Array.isArray(positionsData.rows)) {
            for (const row of positionsData.rows) {
              const ass = row.assortment
              if (ass?.id) targetAssortmentIds.add(ass.id)
              if (ass?.meta?.href) {
                const idFromHref = ass.meta.href.split('/').pop()
                if (idFromHref) targetAssortmentIds.add(idFromHref)
              }
              if (ass?.article) targetArticles.add(ass.article.trim())
              if (ass?.code) targetCodes.add(ass.code.trim())
            }
          }
        }
      }
    }

    const CHUNK_SIZE = 20
    const assortmentIdList = Array.from(targetAssortmentIds)

    for (let i = 0; i < assortmentIdList.length; i += CHUNK_SIZE) {
      const chunk = assortmentIdList.slice(i, i + CHUNK_SIZE)
      const filterStr = chunk.map((id) => `id=${encodeURIComponent(id)}`).join(';')
      const url = `https://api.moysklad.ru/api/remap/1.2/entity/assortment?filter=${filterStr}`
      const res = await fetchMoySkladJson(url, apiToken)

      if (res && Array.isArray(res.rows)) {
        for (const row of res.rows) {
          const sku = (row.article || row.code || row.externalCode || '').trim()
          if (!sku) continue
          const currentStock = typeof row.quantity === 'number'
            ? row.quantity
            : (typeof row.stock === 'number' ? row.stock : 0)
          skuStockMap.set(sku.toLowerCase(), currentStock > 0)
        }
      }
    }

    const codeList = Array.from(targetCodes)
    for (let i = 0; i < codeList.length; i += CHUNK_SIZE) {
      const chunk = codeList.slice(i, i + CHUNK_SIZE)
      const filterStr = chunk.map((c) => `code=${encodeURIComponent(c)}`).join(';')
      const url = `https://api.moysklad.ru/api/remap/1.2/entity/assortment?filter=${filterStr}`
      const res = await fetchMoySkladJson(url, apiToken)

      if (res && Array.isArray(res.rows)) {
        for (const row of res.rows) {
          const sku = (row.article || row.code || row.externalCode || '').trim()
          if (!sku) continue
          const currentStock = typeof row.quantity === 'number'
            ? row.quantity
            : (typeof row.stock === 'number' ? row.stock : 0)
          skuStockMap.set(sku.toLowerCase(), currentStock > 0)
        }
      }
    }

    const articleList = Array.from(targetArticles)
    for (let i = 0; i < articleList.length; i += CHUNK_SIZE) {
      const chunk = articleList.slice(i, i + CHUNK_SIZE)
      const filterStr = chunk.map((a) => `article=${encodeURIComponent(a)}`).join(';')
      const url = `https://api.moysklad.ru/api/remap/1.2/entity/assortment?filter=${filterStr}`
      const res = await fetchMoySkladJson(url, apiToken)

      if (res && Array.isArray(res.rows)) {
        for (const row of res.rows) {
          const sku = (row.article || row.code || row.externalCode || '').trim()
          if (!sku) continue
          const currentStock = typeof row.quantity === 'number'
            ? row.quantity
            : (typeof row.stock === 'number' ? row.stock : 0)
          skuStockMap.set(sku.toLowerCase(), currentStock > 0)
        }
      }
    }

    if (skuStockMap.size === 0) {
      return NextResponse.json({
        success: true,
        status: 'ok',
        updatedVariants: 0,
        updatedProducts: 0,
        message: 'No matching items or positions found to synchronize',
      })
    }

    const payload = await getPayload({ config })
    const drizzle = (payload.db as any).drizzle

    let totalUpdatedVariants = 0
    let totalUpdatedProducts = 0
    const affectedParentIds = new Set<number>()
    const affectedProductRows: Array<{ id: number; slug: string; product_group?: string; category_id?: number }> = []

    for (const [sku, isAvailable] of skuStockMap.entries()) {
      const variantStatus = isAvailable ? 'in_stock' : 'out_of_stock'
      const variantRes = await drizzle.execute(sql`
        UPDATE "products_variants"
        SET "is_available" = ${isAvailable},
            "status" = ${variantStatus}::"enum_products_variants_status"
        WHERE LOWER(BTRIM("sku")) = ${sku}
        RETURNING "_parent_id", "id", "sku", "is_available";
      `)

      const updatedVariantRows = Array.isArray(variantRes) ? variantRes : (variantRes?.rows || [])
      for (const row of updatedVariantRows) {
        totalUpdatedVariants++
        if (row._parent_id != null) {
          affectedParentIds.add(Number(row._parent_id))
        }
      }

      const productStatus = isAvailable ? 'in_stock' : 'out_of_stock'
      const productRes = await drizzle.execute(sql`
        UPDATE "products"
        SET "is_available" = ${isAvailable},
            "status" = ${productStatus}::"enum_products_status",
            "updated_at" = NOW()
        WHERE LOWER(BTRIM("sku")) = ${sku}
        RETURNING "id", "slug", "product_group", "category_id";
      `)

      const updatedProdRows = Array.isArray(productRes) ? productRes : (productRes?.rows || [])
      for (const row of updatedProdRows) {
        totalUpdatedProducts++
        affectedProductRows.push({
          id: Number(row.id),
          slug: String(row.slug),
          product_group: row.product_group ? String(row.product_group) : undefined,
          category_id: row.category_id != null ? Number(row.category_id) : undefined,
        })
      }
    }

    for (const parentId of affectedParentIds) {
      const parentRes = await drizzle.execute(sql`
        UPDATE "products" p
        SET "is_available" = COALESCE((
              SELECT bool_or(v."is_available")
              FROM "products_variants" v
              WHERE v."_parent_id" = p."id"
            ), p."is_available"),
            "status" = CASE
              WHEN COALESCE((SELECT bool_or(v."is_available") FROM "products_variants" v WHERE v."_parent_id" = p."id"), p."is_available") = true
                THEN 'in_stock'::"enum_products_status"
              ELSE 'out_of_stock'::"enum_products_status"
            END,
            "updated_at" = NOW()
        WHERE p."id" = ${parentId}
        RETURNING p."id", p."slug", p."product_group", p."category_id";
      `)

      const parentRows = Array.isArray(parentRes) ? parentRes : (parentRes?.rows || [])
      for (const row of parentRows) {
        affectedProductRows.push({
          id: Number(row.id),
          slug: String(row.slug),
          product_group: row.product_group ? String(row.product_group) : undefined,
          category_id: row.category_id != null ? Number(row.category_id) : undefined,
        })
      }
    }

    const affectedPaths = new Set<string>()
    for (const prod of affectedProductRows) {
      const canonicalPath = productCanonicalUrl({
        slug: prod.slug,
        productGroup: prod.product_group,
        category: prod.category_id,
      }) || `/catalog/${prod.product_group || 'other'}/${prod.slug}`
      if (canonicalPath) {
        affectedPaths.add(canonicalPath)
      }
    }

    if (affectedPaths.size > 0 || totalUpdatedVariants > 0 || totalUpdatedProducts > 0) {
      try {
        revalidatePath('/catalog', 'layout')
        revalidatePath('/')
        for (const path of affectedPaths) {
          revalidatePath(path)
        }
      } catch (err) {
        payload.logger.error({ err }, 'MoySklad webhook cache revalidation error')
      }
    }

    return NextResponse.json({
      success: true,
      status: 'ok',
      updatedVariants: totalUpdatedVariants,
      updatedProducts: totalUpdatedProducts,
      affectedPages: affectedPaths.size,
      processedSkus: Array.from(skuStockMap.keys()),
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
