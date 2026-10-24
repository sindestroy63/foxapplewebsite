import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { productCanonicalUrl } from '@/lib/product-url'
import { CONTACTS, SELLER } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function escapeXml(unsafe: unknown): string {
  if (unsafe == null) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatYmlDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getMediaUrl(media: unknown, siteUrl: string): string | null {
  if (!media) return null
  const url = typeof media === 'object' && media !== null && 'url' in media ? (media as { url?: string }).url : (typeof media === 'string' ? media : null)
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const normalized = url.startsWith('/') ? url : `/${url}`
  return `${siteUrl}${normalized}`
}

function resolveOfferImage(product: any, variant?: any, siteUrl = ''): string | null {
  if (variant && Array.isArray(variant.images) && variant.images.length > 0) {
    const url = getMediaUrl(variant.images[0], siteUrl)
    if (url) return url
  }

  const variantColor = variant?.color
  const colorVal = typeof variantColor === 'object' && variantColor !== null ? variantColor.value : variantColor
  if (colorVal && Array.isArray(product.colorImages)) {
    const group = product.colorImages.find((g: any) => {
      const gc = typeof g.color === 'object' && g.color !== null ? g.color.value : g.color
      return gc && String(gc).toLowerCase() === String(colorVal).toLowerCase()
    })
    if (group && Array.isArray(group.images) && group.images.length > 0) {
      const url = getMediaUrl(group.images[0], siteUrl)
      if (url) return url
    }
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    const url = getMediaUrl(product.images[0], siteUrl)
    if (url) return url
  }

  return null
}

function extractColorLabel(color: unknown): string {
  if (!color) return ''
  if (typeof color === 'string') return color.trim()
  if (typeof color === 'object' && color !== null) {
    const c = color as { russianLabel?: string; englishLabel?: string; value?: string }
    return (c.russianLabel || c.englishLabel || c.value || '').trim()
  }
  return ''
}

function extractStorageLabel(storage: unknown, memory: unknown): string {
  if (storage) {
    if (typeof storage === 'string') return storage.trim()
    if (typeof storage === 'object' && storage !== null) {
      const s = storage as { value?: string; label?: string }
      return (s.value || s.label || '').trim()
    }
  }
  if (typeof memory === 'string') return memory.trim()
  return ''
}

function extractRamLabel(ramOption: unknown, ram: unknown): string {
  if (ramOption && typeof ramOption === 'object') {
    const option = ramOption as { label?: string; key?: string }
    const label = (option.label || option.key || '').trim()
    if (label) return label
  }
  return typeof ram === 'string' ? ram.trim() : ''
}

function extractChipLabel(chip: unknown): string {
  return typeof chip === 'string' ? chip.trim() : ''
}

function stripMemoryUnit(label: string): string {
  return label.replace(/\s*(gb|гб)$/i, '')
}

function extractSimLabel(sim: unknown, simType: unknown): string {
  let val = ''
  if (sim) {
    if (typeof sim === 'string') val = sim.trim()
    else if (typeof sim === 'object' && sim !== null) {
      const s = sim as { label?: string; value?: string }
      val = (s.label || s.value || '').trim()
    }
  }
  if (!val && typeof simType === 'string') {
    val = simType.trim()
  }
  if (!val) return ''
  const upper = val.toUpperCase()
  if (upper === 'SIM_ESIM' || upper === 'SIM+ESIM' || upper === 'SIM_AND_ESIM') return 'SIM + eSIM'
  if (upper === 'ESIM') return 'eSIM'
  return val
}

type OfferNameParts = {
  chip: string
  ram: string
  storage: string
  color: string
  sim: string
}

function buildOfferName(baseName: string, parts: OfferNameParts): string {
  const name = baseName.trim()
  const lowerBase = name.toLowerCase()
  const has = (value: string) => lowerBase.includes(value.toLowerCase())
  const result: string[] = [name]

  if (parts.chip && !has(parts.chip)) {
    result.push(parts.chip)
  }

  const storageInBase = parts.storage ? has(parts.storage) : false
  let memory = ''
  if (parts.ram && parts.storage && !storageInBase) memory = `${stripMemoryUnit(parts.ram)}/${parts.storage}`
  else if (parts.ram) memory = parts.ram
  else if (parts.storage && !storageInBase) memory = parts.storage
  if (memory && !has(memory)) {
    result.push(memory)
  }

  if (parts.color && !has(parts.color)) {
    result.push(parts.color)
  }
  if (parts.sim && !has(parts.sim)) {
    result.push(parts.sim)
  }

  return result.join(' ')
}

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.PAYLOAD_PUBLIC_SERVER_URL ||
      'https://фохстор.рф'
    ).replace(/\/$/, '')

    const [categoriesResult, productsResult] = await Promise.all([
      payload.find({
        collection: 'categories',
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'products',
        depth: 2,
        limit: 10000,
        pagination: false,
        overrideAccess: true,
        where: {
          isAvailable: {
            equals: true,
          },
        },
      }),
    ])

    const knownCategories = new Map<string | number, string>()
    for (const cat of categoriesResult.docs as any[]) {
      if (cat.id != null) {
        knownCategories.set(cat.id, cat.name || String(cat.slug || cat.id))
      }
    }

    if (knownCategories.size === 0) {
      knownCategories.set(1, 'Каталог')
    }

    const firstCategoryId = knownCategories.keys().next().value ?? 1

    const offersXml: string[] = []

    for (const product of productsResult.docs as any[]) {
      if (product.status === 'out_of_stock') continue

      const baseName = String(product.name || product.model || '').trim()
      if (!baseName) continue

      const vendor = String(product.brand || 'Apple').trim()
      const canonicalPath = productCanonicalUrl({
        slug: product.slug,
        productGroup: product.productGroup,
        category: product.category,
      }) || `/catalog/${product.productGroup || 'other'}/${product.slug || product.id}`

      let categoryId: string | number = firstCategoryId
      if (product.category) {
        const rawId = typeof product.category === 'object' && product.category !== null ? product.category.id : product.category
        if (rawId != null) {
          categoryId = rawId
          if (!knownCategories.has(rawId)) {
            const catName = typeof product.category === 'object' && product.category.name ? product.category.name : String(rawId)
            knownCategories.set(rawId, catName)
          }
        }
      }

      const hasVariants = Array.isArray(product.variants) && product.variants.length > 0

      if (hasVariants) {
        for (let i = 0; i < product.variants.length; i++) {
          const variant = product.variants[i]
          if (variant.isAvailable === false || variant.status === 'out_of_stock') continue

          const offerId = (variant.sku && String(variant.sku).trim()) || (product.sku ? `${product.sku}-${variant.id || i + 1}` : `offer-${product.id}-${variant.id || i + 1}`)
          const colorName = extractColorLabel(variant.color) || extractColorLabel(product.color)
          const storageName = extractStorageLabel(variant.storage, variant.memory) || extractStorageLabel(null, product.memory)
          const simName = extractSimLabel(variant.sim, variant.simType) || extractSimLabel(null, product.simType)
          const offerName = buildOfferName(baseName, {
            chip: extractChipLabel(variant.chip) || extractChipLabel(product.chip),
            ram: extractRamLabel(variant.ramOption, variant.ram) || extractRamLabel(null, product.ram),
            storage: storageName,
            color: colorName,
            sim: simName,
          })

          const rawPrice = variant.price != null && variant.price !== '' ? Number(variant.price) : Number(product.price)
          const price = Math.round(Number(rawPrice || 0))
          if (price <= 0) continue

          const offerUrl = `${siteUrl}${canonicalPath}?sku=${encodeURIComponent(offerId)}`
          const pictureUrl = resolveOfferImage(product, variant, siteUrl)

          offersXml.push(
            `      <offer id="${escapeXml(offerId)}" available="true">\n` +
            `        <name>${escapeXml(offerName)}</name>\n` +
            `        <url>${escapeXml(offerUrl)}</url>\n` +
            `        <price>${price}</price>\n` +
            `        <currencyId>RUR</currencyId>\n` +
            `        <categoryId>${escapeXml(categoryId)}</categoryId>\n` +
            (pictureUrl ? `        <picture>${escapeXml(pictureUrl)}</picture>\n` : '') +
            `        <delivery>true</delivery>\n` +
            `        <vendor>${escapeXml(vendor)}</vendor>\n` +
            `      </offer>`
          )
        }
      } else {
        const offerId = (product.sku && String(product.sku).trim()) || `offer-${product.id}`
        const colorName = extractColorLabel(product.color)
        const storageName = extractStorageLabel(null, product.memory)
        const simName = extractSimLabel(null, product.simType)
        const offerName = buildOfferName(baseName, {
          chip: extractChipLabel(product.chip),
          ram: extractRamLabel(null, product.ram),
          storage: storageName,
          color: colorName,
          sim: simName,
        })

        const price = Math.round(Number(product.price || 0))
        if (price <= 0) continue

        const offerUrl = `${siteUrl}${canonicalPath}?sku=${encodeURIComponent(offerId)}`
        const pictureUrl = resolveOfferImage(product, undefined, siteUrl)

        offersXml.push(
          `      <offer id="${escapeXml(offerId)}" available="true">\n` +
          `        <name>${escapeXml(offerName)}</name>\n` +
          `        <url>${escapeXml(offerUrl)}</url>\n` +
          `        <price>${price}</price>\n` +
          `        <currencyId>RUR</currencyId>\n` +
          `        <categoryId>${escapeXml(categoryId)}</categoryId>\n` +
          (pictureUrl ? `        <picture>${escapeXml(pictureUrl)}</picture>\n` : '') +
          `        <delivery>true</delivery>\n` +
          `        <vendor>${escapeXml(vendor)}</vendor>\n` +
          `      </offer>`
        )
      }
    }

    const categoriesXml = Array.from(knownCategories.entries())
      .map(([id, name]) => `      <category id="${escapeXml(id)}">${escapeXml(name)}</category>`)
      .join('\n')

    const dateStr = formatYmlDate(new Date())
    const shopName = CONTACTS.shopName || 'ФОХСТОР'
    const company = SELLER.typeAndName || shopName

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<yml_catalog date="${dateStr}">\n` +
      `  <shop>\n` +
      `    <name>${escapeXml(shopName)}</name>\n` +
      `    <company>${escapeXml(company)}</company>\n` +
      `    <url>${escapeXml(siteUrl)}</url>\n` +
      `    <currencies>\n` +
      `      <currency id="RUR" rate="1"/>\n` +
      `    </currencies>\n` +
      `    <categories>\n` +
      `${categoriesXml}\n` +
      `    </categories>\n` +
      `    <offers>\n` +
      `${offersXml.join('\n')}\n` +
      `    </offers>\n` +
      `  </shop>\n` +
      `</yml_catalog>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(error instanceof Error ? error.message : 'Internal Server Error')}</error>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    )
  }
}
