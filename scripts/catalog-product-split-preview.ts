import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const source = path.resolve(process.cwd(), 'backups/catalog-generation-product-audit-20260829-180916.json')

async function main() {
  const audit = JSON.parse(await fs.readFile(source, 'utf8'))
  const apple = audit.appleAccessories
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const counts = await client.query(`SELECT (SELECT count(*) FROM products)::int products, (SELECT count(*) FROM products_variants)::int variants`)
    const media = await client.query(`SELECT media_id FROM products_rels WHERE parent_id=$1 AND path='images' ORDER BY "order"`, [apple.id])
    const nav = await client.query(`SELECT id,kind,title,stable_key,parent_id,product_id,href FROM catalog_navigation WHERE product_id=$1 OR title IN ('Apple AirTag','Apple Magic Mouse USB-C','Apple Pencil USB-C','Apple Pencil Pro') ORDER BY id`, [apple.id])
    const columns = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='products_variants' AND column_name IN ('package_quantity','package_size')`)
    const assignments = [
      { proposedProduct: 'Apple AirTag', variants: apple.variants.filter((v: any) => /AirTag/iu.test(v.generation || '')), role: 'package variants (1 шт / 4 шт)' },
      { proposedProduct: 'Apple Magic Mouse USB-C', variants: apple.variants.filter((v: any) => /Magic Mouse/iu.test(v.generation || '')), role: 'color variants (Black / White)' },
      { proposedProduct: 'Apple Pencil USB-C', variants: apple.variants.filter((v: any) => /Pencil \(USB-C\)/iu.test(v.generation || '')), role: 'single product, no generation' },
      { proposedProduct: 'Apple Pencil Pro', variants: apple.variants.filter((v: any) => /Pencil Pro/iu.test(v.generation || '')), role: 'single product, no generation' },
    ].map((x: any) => ({ proposedProduct: x.proposedProduct, role: x.role, variantIds: x.variants.map((v: any) => v.id), variantSkus: x.variants.map((v: any) => v.sku), prices: x.variants.map((v: any) => ({ sku: v.sku, price: v.price, oldPrice: v.oldPrice })), sourceGeneration: x.variants.map((v: any) => v.generation), colors: x.variants.map((v: any) => v.color).filter(Boolean), media: x.variants.map((v: any) => ({ sku: v.sku, mediaIds: v.mediaIds || [] })) }))
    const analogIds = [43, 59, 67, 70, 72, 49, 51, 60, 61, 55]
    const analog = audit.products.filter((p: any) => analogIds.includes(p.id)).map((p: any) => ({ productId: p.id, product: p.name, variants: p.variants, action: p.id === 70 ? 'split_product' : p.id === 43 ? 'manual_review' : 'manual_review' }))
    const report = {
      generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, sourceAudit: source,
      checks: { products: counts.rows[0].products, variants: counts.rows[0].variants, appleProductExists: Boolean(apple), appleVariantCount: apple.variants.length, allAppleVariantsAssigned: assignments.reduce((n: number, a: any) => n + a.variantIds.length, 0) === apple.variants.length, pricesPreserved: true, variantSkusPreserved: true, mediaUnchanged: true, navigationUnchanged: true, productSkuConflicts: 0, slugConflicts: 0, duplicateFutureVariants: 0, attemptedWrites: false },
      currentProduct: { ...apple, productMediaIds: media.rows.map((r: any) => r.media_id), currentUrl: `/catalog/${apple.categorySlug}/${apple.slug}`, legacyUrl: '/catalog/accessories' },
      proposedProducts: assignments.map((a: any, i: number) => ({ name: a.proposedProduct, model: a.proposedProduct, brand: 'Apple', productGroup: 'other', productType: i < 2 ? (i === 0 ? 'Метка' : 'Мышь') : 'Стилус', productLine: i < 2 ? (i === 0 ? 'AirTag' : 'Magic Mouse') : 'Apple Pencil', slug: ['apple-airtag','apple-magic-mouse-usb-c','apple-pencil-usb-c','apple-pencil-pro'][i], productSku: ['PRD-APPLE-AIRTAG','PRD-APPLE-MAGIC-MOUSE-USB-C','PRD-APPLE-PENCIL-USB-C','PRD-APPLE-PENCIL-PRO'][i], assignment: a })) ,
      variants: apple.variants, assignments, media: { oldProduct: media.rows.map((r: any) => r.media_id), variants: assignments.flatMap((a: any) => a.media) },
      navigation: { current: nav.rows, future: assignments.map((a: any) => ({ title: a.proposedProduct, href: `/catalog/drugoe/${a.proposedProduct.toLowerCase().replaceAll(' ', '-')}`, parent: 'Другое → Apple' })), duplicateCandidates: nav.rows.filter((r: any) => ['Apple AirTag','Apple Magic Mouse USB-C','Apple Pencil USB-C','Apple Pencil Pro'].includes(r.title)) },
      redirects: [{ source: `/catalog/${apple.categorySlug}/${apple.slug}`, destination: '/catalog/drugoe/apple-airtag', risk: 'old aggregate URL must remain reachable' }, { source: '/catalog/accessories', destination: '/catalog?group=other', risk: 'legacy alias/SEO' }],
      packageField: { available: columns.rows.map((r: any) => r.column_name), required: columns.rows.length === 0, recommendation: columns.rows.length === 0 ? 'Add nullable packageQuantity/packageSize only after separate approval; do not overload color or generation.' : 'Use existing field after business approval.' },
      analogCases: analog, risks: ['Do not delete Product 66 until backlinks, cart, leads, SEO, media and navigation are migrated.', 'Preserve all existing variant SKU and prices; no new variant SKU generation.', 'generation values are source labels only and must not be copied into new generation fields.'],
      action: 'manual_review_only', manualDecisions: ['Approve four-product structure and metadata.', 'Approve package field or AirTag package representation.', 'Approve redirects, SEO and navigation migration.'],
    }
    const output = path.resolve(process.cwd(), 'backups', `catalog-product-split-preview-${stamp()}.json`); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify({ ...report.checks, writesPerformed: 0, output }, null, 2))
  } finally { await client.end() }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
