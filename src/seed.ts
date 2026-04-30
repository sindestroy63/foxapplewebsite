import fs from 'fs'
import path from 'path'
import type { Payload, SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

import { CATEGORY_SEED, CONTACTS } from './lib/constants'
import { slugify } from './payload/utils/slugify'
import { MODEL_IMAGES } from './seed-images'
import { ALL_PRODUCTS, type ProductSeed as ProductSeedNew } from './seed-products'

type RichText = {
  root: {
    type: 'root'
    children: Array<{
      type: 'paragraph' | 'heading' | 'list'
      tag?: 'h2' | 'h3'
      children: Array<{ type?: 'listitem'; children?: Array<{ type: 'text'; text: string }> } | { type: 'text'; text: string }>
    }>
  }
}

const richText = (paragraphs: string[]): RichText => ({
  root: {
    type: 'root',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      children: [{ type: 'text', text }],
    })),
  },
})

const pageText: Record<string, string[]> = {
  installment: [
    'Рассрочка помогает забрать нужную технику сейчас и распределить платежи. Точные условия зависят от выбранной модели и решения партнера.',
    'Перед оформлением сотрудник FOX APPLE проверит наличие, подберет комплектацию и расскажет все условия без скрытых платежей.',
  ],
  'trade-in': [
    'Принесите свое устройство в магазин, чтобы сотрудник оценил состояние, комплектацию и рыночную стоимость.',
    'Сумму оценки можно использовать как часть оплаты новой техники. Финальное предложение зависит от состояния устройства.',
  ],
  warranty: [],
  repair: [],
  contacts: [
    'Магазин FOX APPLE находится в Самаре. Напишите в Telegram или позвоните, чтобы уточнить наличие нужной модели перед визитом.',
  ],
}

function buildFromNew(seed: ProductSeedNew): ProductSeedNew & { shortDescription: string; slug: string } {
  const slug = slugify(seed.name)
  return {
    ...seed,
    shortDescription:
      seed.shortDescription ||
      `${seed.name}. Актуальная поставка FOX APPLE, наличие и итоговую комплектацию уточнит сотрудник магазина.`,
    slug,
  }
}

const products = ALL_PRODUCTS.map(buildFromNew)

const TMP_DIR = path.resolve(process.cwd(), '.seed-tmp')
const mediaCache = new Map<string, number>()

async function downloadImage(url: string, filename: string): Promise<string | null> {
  try {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
    const filePath = path.join(TMP_DIR, filename)
    if (fs.existsSync(filePath)) return filePath

    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    return filePath
  } catch {
    return null
  }
}

async function getOrCreateMedia(payload: Payload, model: string): Promise<number | null> {
  if (mediaCache.has(model)) return mediaCache.get(model)!

  const imageUrl = MODEL_IMAGES[model]
  if (!imageUrl) return null

  const existing = await payload.find({
    collection: 'media',
    limit: 1,
    where: { alt: { equals: model } },
  })

  if (existing.docs[0]) {
    mediaCache.set(model, existing.docs[0].id as number)
    return existing.docs[0].id as number
  }

  const ext = imageUrl.includes('fmt=png') ? 'png' : 'jpg'
  const safeName = model.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const filePath = await downloadImage(imageUrl, `${safeName}.${ext}`)
  if (!filePath) return null

  try {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: model },
      filePath,
    })
    mediaCache.set(model, doc.id as number)
    return doc.id as number
  } catch (e) {
    payload.logger.warn(`Failed to upload image for ${model}: ${e}`)
    return null
  }
}

async function upsertBySlug<T extends Record<string, unknown>>(
  payload: Payload,
  collection: 'categories' | 'products' | 'pages',
  slug: string,
  data: T,
) {
  const existing = await payload.find({
    collection,
    limit: 1,
    depth: 0,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  if (existing.docs[0]) {
    return payload.update({
      collection,
      id: existing.docs[0].id,
      data: data as any,
      draft: false,
    })
  }

  return payload.create({
    collection,
    data: data as any,
    draft: false,
  })
}

async function upsertProduct(
  payload: Payload,
  categoryId: number,
  product: ProductSeedNew & { shortDescription: string; slug: string },
  sortOrder: number,
) {
  const bySlug = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1,
    where: { slug: { equals: product.slug } },
  })

  const byIdentity =
    bySlug.docs[0] ||
    (
      await payload.find({
        collection: 'products',
        depth: 0,
        limit: 1,
        where: {
          and: [
            { category: { equals: categoryId } },
            { model: { equals: product.model } },
          ],
        },
      })
    ).docs[0]

  const data: Record<string, unknown> = {
    category: categoryId,
    name: product.name,
    slug: product.slug,
    model: product.model,
    memory: product.memory,
    color: product.color,
    simType: product.simType,
    size: product.size,
    price: product.price,
    status: 'in_stock',
    isAvailable: true,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    sortOrder,
    shortDescription: product.shortDescription,
    description: richText([product.shortDescription]),
    seoTitle: product.name,
    seoDescription: `${product.name} в FOX APPLE, Самара. Актуальная цена и наличие.`,
  }

  if (product.variants && product.variants.length > 0) {
    data.variants = product.variants.map((v) => ({
      color: v.color,
      colorHex: v.colorHex,
      colorSecondaryHex: v.colorSecondaryHex,
      memory: v.memory,
      simType: v.simType,
      size: v.size,
      chip: v.chip,
      ram: v.ram,
      screenSize: v.screenSize,
      connectivity: v.connectivity,
      price: v.price,
      oldPrice: v.oldPrice,
      status: v.status || 'in_stock',
      isAvailable: true,
    }))
  }

  if (process.env.SEED_IMAGES === 'true') {
    const mediaId = await getOrCreateMedia(payload, product.model)
    if (mediaId) {
      data.images = [mediaId]
    }
  }

  if (byIdentity) {
    return payload.update({
      collection: 'products',
      id: byIdentity.id,
      data: data as any,
      draft: false,
    })
  }

  return payload.create({
    collection: 'products',
    data: data as any,
    draft: false,
  })
}

export const script = async (config: SanitizedConfig) => {
  const payload = await getPayload({ config })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      ...CONTACTS,
      whatsappUrl: '',
      mapUrl: '',
    },
  })

  const categoriesBySlug = new Map<string, number>()

  for (const [index, category] of CATEGORY_SEED.entries()) {
    const doc = await upsertBySlug(payload, 'categories', category.slug, {
      name: category.name,
      slug: category.slug,
      sortOrder: index + 1,
      isActive: true,
    })
    categoriesBySlug.set(category.slug, doc.id as number)
  }

  for (const [index, product] of products.entries()) {
    const categoryId = categoriesBySlug.get(product.categorySlug)
    if (!categoryId) {
      continue
    }

    await upsertProduct(payload, categoryId, product, index + 1)
  }

  const pages = [
    { slug: 'installment', title: 'Рассрочка на технику Apple' },
    { slug: 'trade-in', title: 'Trade-In в FOX APPLE' },
    { slug: 'warranty', title: 'Гарантия 12 месяцев' },
    { slug: 'repair', title: 'Ремонт техники Apple' },
    { slug: 'contacts', title: 'Контакты FOX APPLE' },
  ]

  for (const page of pages) {
    const texts = pageText[page.slug] || []
    const data: Record<string, unknown> = {
      ...page,
      content: texts.length > 0 ? richText(texts) : null,
      seoTitle: page.title,
      seoDescription: `${page.title}. FOX APPLE, Самара.`,
    }
    await upsertBySlug(payload, 'pages', page.slug, data)
  }

  const adminUsers = [
    {
      email: 'IntellexGroup@foxapple.ru',
      password: 'Fx!Adm1n_2026$Grp',
      name: 'IntellexGroup',
      role: 'superadmin',
    },
    {
      email: 'Danil@foxapple.ru',
      password: 'Fx!Dnl_2026$Mgr',
      name: 'Danil',
      role: 'admin',
    },
  ]

  const existingUsers = await payload.find({
    collection: 'users',
    limit: 100,
    depth: 0,
  })

  for (const user of existingUsers.docs) {
    await payload.delete({ collection: 'users', id: user.id })
  }

  for (const admin of adminUsers) {
    await payload.create({
      collection: 'users',
      data: admin,
    })
  }

  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true })
  }

  payload.logger.info('FOX APPLE seed completed (users reset)')
  process.exit(0)
}
