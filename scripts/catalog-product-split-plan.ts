import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const auditPath = path.resolve(process.cwd(), 'backups/catalog-generation-product-audit-20260829-180916.json')

async function main() {
  const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'))
  const current = audit.appleAccessories
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const nav = await client.query(`SELECT id, kind, title, stable_key, parent_id, product_id, href, is_visible, sort_order FROM catalog_navigation WHERE product_id=$1 OR id IN (SELECT parent_id FROM catalog_navigation WHERE product_id=$1) ORDER BY sort_order,id`, [current.id])
    const variants = current.variants.map((v: any) => ({
      variantId: v.id, variantSku: v.sku, generation: v.generation, color: v.color,
      price: v.price, oldPrice: v.oldPrice, status: v.status, isAvailable: v.isAvailable,
      mediaIds: v.mediaIds || [], allAttributes: v,
    }))
    const groups = [
      { key: 'airtag', name: 'Apple AirTag', model: 'Apple AirTag', productType: 'Метка', productLine: 'AirTag', slug: 'apple-airtag', sku: 'PRD-APPLE-AIRTAG', variantTerms: ['AirTag 1шт', 'AirTag 4шт'] },
      { key: 'magic-mouse', name: 'Apple Magic Mouse USB-C', model: 'Apple Magic Mouse USB-C', productType: 'Мышь', productLine: 'Magic Mouse', slug: 'apple-magic-mouse-usb-c', sku: 'PRD-APPLE-MAGIC-MOUSE-USB-C', variantTerms: ['Magic Mouse (USB-C) Black', 'Magic Mouse (USB-C) White'] },
      { key: 'pencil-usb-c', name: 'Apple Pencil USB-C', model: 'Apple Pencil USB-C', productType: 'Стилус', productLine: 'Apple Pencil', slug: 'apple-pencil-usb-c', sku: 'PRD-APPLE-PENCIL-USB-C', variantTerms: ['Apple Pencil (USB-C)'] },
      { key: 'pencil-pro', name: 'Apple Pencil Pro', model: 'Apple Pencil Pro', productType: 'Стилус', productLine: 'Apple Pencil', slug: 'apple-pencil-pro', sku: 'PRD-APPLE-PENCIL-PRO', variantTerms: ['Apple Pencil Pro'] },
    ]
    const proposedProducts = groups.map((group: any) => {
      const assigned = variants.filter((v: any) => group.variantTerms.some((term: string) => String(v.generation || '').includes(term)))
      return {
        proposedProductName: group.name, proposedModel: group.model, productGroup: 'other', brand: 'Apple',
        productType: group.productType, productLine: group.productLine, proposedSlug: group.slug, proposedProductSku: group.sku,
        oldVariantSkus: assigned.map((v: any) => v.variantSku), prices: assigned.map((v: any) => ({ variantSku: v.variantSku, price: v.price, oldPrice: v.oldPrice })),
        oldColors: assigned.map((v: any) => v.color).filter(Boolean), oldGenerations: assigned.map((v: any) => v.generation),
        media: assigned.map((v: any) => ({ variantSku: v.variantSku, mediaIds: v.mediaIds })),
        inventory: assigned.map((v: any) => ({ variantSku: v.variantSku, status: v.status, isAvailable: v.isAvailable })),
        sourceVariantIds: assigned.map((v: any) => v.variantId), action: 'future_manual_split',
      }
    })
    const report = {
      generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, sourceAudit: auditPath,
      currentProducts: [{ id: current.id, name: current.name, sku: current.sku, model: current.model, slug: current.slug, productGroup: current.productGroup, brand: current.brand, productType: current.productType, productLine: current.productLine, categoryId: current.categoryId, categoryName: current.categoryName, categorySlug: current.categorySlug, price: current.price, navigationUrl: `/catalog/${current.categorySlug}/${current.slug}`, legacyUrl: '/catalog/accessories' }],
      proposedProducts, variants, currentSku: { productSku: current.sku, variantSkus: variants.map((v: any) => v.variantSku) }, proposedSku: proposedProducts.map((p: any) => ({ productName: p.proposedProductName, productSku: p.proposedProductSku })),
      currentSlug: { productSlug: current.slug, canonicalUrl: `/catalog/${current.categorySlug}/${current.slug}` }, proposedSlug: proposedProducts.map((p: any) => ({ productName: p.proposedProductName, slug: p.proposedSlug, url: `/catalog/drugoe/${p.proposedSlug}` })),
      prices: variants.map((v: any) => ({ variantSku: v.variantSku, price: v.price, oldPrice: v.oldPrice })), media: variants.map((v: any) => ({ variantSku: v.variantSku, mediaIds: v.mediaIds })),
      navigation: { currentItems: nav.rows, futureProductItems: proposedProducts.map((p: any) => ({ title: p.proposedProductName, kind: 'product', href: `/catalog/drugoe/${p.proposedSlug}`, parent: 'Другое → Apple (optional)' })) },
      risks: ['New product SKUs must be unique and approved manually.', 'Preserve old variant SKU ownership during migration; price import and matching depend on these keys.', 'Current Product 66 has brand/productType unset and requires an explicit business decision.', 'Variant media arrays are currently empty for these records; verify before migration.'],
      redirects: [{ from: `/catalog/${current.categorySlug}/${current.slug}`, to: '/catalog/drugoe/apple-airtag', reason: 'preserve legacy aggregate product URL' }, { from: '/catalog/accessories', to: '/catalog?group=other', reason: 'legacy group alias' }],
      action: 'manual_review_only', manualDecisions: ['Approve four-product split and product metadata.', 'Choose whether AirTag 1/4 remain variants or separate products.', 'Assign/confirm brand Apple, productType and navigation parent.', 'Confirm redirects, SEO metadata and media ownership.'],
    }
    const output = path.resolve(process.cwd(), 'backups', `catalog-product-split-plan-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ currentProducts: 1, proposedProducts: proposedProducts.length, variants: variants.length, writesPerformed: 0, output }, null, 2))
  } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
