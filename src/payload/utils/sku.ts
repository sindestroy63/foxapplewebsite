import type { PayloadRequest } from 'payload'

const SKU_SEPARATOR = /[^A-Z0-9]+/g

export function normalizeSku(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const normalized = value.trim().toUpperCase()
  return normalized || undefined
}

function skuPart(value: unknown, fallback: string): string {
  const normalized = normalizeSku(value)?.replace(SKU_SEPARATOR, '-').replace(/^-+|-+$/g, '')
  return normalized || fallback
}

export function productSku(slug: string): string {
  return `PRD-${skuPart(slug, 'PRODUCT')}`
}

export function variantSku(
  productSlug: string,
  variant: {
    color?: { value?: string } | string
    memory?: string
    simType?: string
    size?: string
  },
  index: number,
): string {
  const color = typeof variant.color === 'object' ? variant.color?.value : variant.color
  const attributes = [variant.memory || variant.size, color, variant.simType]
    .filter(Boolean)
    .map((value) => skuPart(value, ''))
    .filter(Boolean)

  const descriptor = attributes.length > 0 ? `-${attributes.join('-')}` : ''
  const stableSuffix = String(index + 1).padStart(3, '0')

  return `VAR-${skuPart(productSlug, 'PRODUCT')}${descriptor}-V${stableSuffix}`
}

type SkuVariant = { sku?: string | null }

type ValidateProductSkuArgs = {
  data?: Record<string, unknown> | null
  originalDoc?: Record<string, unknown> | null
  req: PayloadRequest
}

export async function validateProductSkus({ data, originalDoc, req }: ValidateProductSkuArgs) {
  const productSkuValue = normalizeSku(data?.sku ?? originalDoc?.sku)
  const variants = ((data?.variants ?? originalDoc?.variants ?? []) as SkuVariant[]).map((variant) => ({
    ...variant,
    sku: normalizeSku(variant.sku),
  }))

  if (data) {
    if (Object.prototype.hasOwnProperty.call(data, 'sku')) data.sku = productSkuValue ?? null
    if (Array.isArray(data.variants)) data.variants = variants
  }

  const skuOwners = [
    ...(productSkuValue ? [{ sku: productSkuValue, label: 'товара' }] : []),
    ...variants
      .map((variant, index) => ({ sku: normalizeSku(variant.sku), label: `варианта ${index + 1}` }))
      .filter((entry): entry is { sku: string; label: string } => Boolean(entry.sku)),
  ]

  const seen = new Map<string, string>()
  for (const owner of skuOwners) {
    const previousOwner = seen.get(owner.sku)
    if (previousOwner) {
      throw new Error(`SKU ${owner.sku} уже используется у ${previousOwner} в этом товаре.`)
    }
    seen.set(owner.sku, owner.label)
  }

  if (skuOwners.length === 0) return data

  const currentId = originalDoc?.id
  const result = await req.payload.find({
    collection: 'products',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        ...(currentId ? [{ id: { not_equals: currentId } }] : []),
        {
          or: [
            { sku: { in: [...seen.keys()] } },
            { 'variants.sku': { in: [...seen.keys()] } },
          ],
        },
      ],
    },
  })

  if (result.docs.length > 0) {
    throw new Error('Один из SKU уже используется другим товаром или его вариантом.')
  }

  return data
}
