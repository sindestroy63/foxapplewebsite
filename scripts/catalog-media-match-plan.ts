import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const media = (await client.query(`SELECT id,filename,alt,mime_type,url,filesize FROM media ORDER BY id`)).rows
    const products = (await client.query(`SELECT p.id,p.name,p.model,p.slug,p.sku,p.product_group,p.brand,p.product_type,p.product_line,p.category_id,c.name category_name,c.slug category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id`)).rows
    const variants = (await client.query(`SELECT v.id,v._parent_id product_id,v.sku,v.generation,v.color_id,v.price,v.is_available,v.package_label FROM products_variants v ORDER BY v._parent_id,v.id`)).rows
    const productRels = (await client.query(`SELECT id,parent_id,path,media_id FROM products_rels ORDER BY id`)).rows
    const variantRels = (await client.query(`SELECT id,parent_id,path,media_id FROM products_variants_rels ORDER BY id`)).rows
    const navigation = (await client.query(`SELECT id,kind,title,product_id,href,is_visible,stable_key FROM catalog_navigation ORDER BY id`)).rows
    const byMedia = new Map<number, any[]>()
    for (const r of productRels) byMedia.set(r.media_id, [...(byMedia.get(r.media_id) || []), { type: 'product', productId: r.parent_id, path: r.path, relationId: r.id }])
    for (const r of variantRels) byMedia.set(r.media_id, [...(byMedia.get(r.media_id) || []), { type: 'variant', variantId: r.parent_id, path: r.path, relationId: r.id }])
    const productById = new Map(products.map((p: any) => [p.id, p]))
    const variantById = new Map(variants.map((v: any) => [String(v.id), v]))
    const rows = media.map((m: any) => {
      const links = byMedia.get(m.id) || []
      const candidates = links.map((l: any) => l.type === 'product' ? productById.get(l.productId) : variantById.get(String(l.variantId))).filter(Boolean)
      const physical = Boolean(m.filename) && Boolean(m.url)
      const confidence = !physical ? 'missing_file' : links.length === 1 ? 'exact' : links.length > 1 ? 'ambiguous' : 'low'
      return { mediaId: m.id, filename: m.filename, alt: m.alt, mimeType: m.mime_type, physicalFile: physical, currentLinks: links, candidates, confidence, action: !physical ? 'missing_file' : links.length ? (links.length === 1 ? 'keep' : 'manual_review') : 'manual_review' }
    })
    const apple = products.filter((p: any) => [66,115,116,117,118].includes(p.id)).map((p: any) => ({ product: p, variants: variants.filter((v: any) => v.product_id === p.id), productMedia: rows.filter((r: any) => r.currentLinks.some((l: any) => l.type === 'product' && l.productId === p.id)), navigation: navigation.filter((n: any) => n.product_id === p.id) }))
    const dependencies = {
      product66: { variants: variants.filter((v: any) => v.product_id === 66), productMediaRelations: productRels.filter((r: any) => r.parent_id === 66), variantMediaRelations: variantRels.filter((r: any) => variants.some((v: any) => v.id === Number(r.parent_id) && v.product_id === 66)), navigation: navigation.filter((n: any) => n.product_id === 66) },
      foreignReferences: (await client.query(`SELECT 'leads' table_name,count(*)::int count FROM leads WHERE product_id=66 UNION ALL SELECT 'price_update_items',count(*)::int FROM price_update_items WHERE product_id=66 UNION ALL SELECT 'price_import_items',count(*)::int FROM price_import_items WHERE selected_product_id=66`)).rows,
    }
    const report = { generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, summary: { products: products.length, variants: variants.length, media: media.length, mediaWithLinks: rows.filter((r: any) => r.currentLinks.length).length, missingFiles: rows.filter((r: any) => r.confidence === 'missing_file').length, ambiguous: rows.filter((r: any) => r.confidence === 'ambiguous').length }, media: rows, products, variants, navigation, appleAccessories: apple, dependencies, deletionDecision: { productId: 66, canDelete: false, reason: 'products_rels contains six variant image relations for Product 66; resolve/verify media dependencies first' }, proposedActions: [{ action: 'manual_review', scope: 'Product 66 media relations 25474-25479' }, { action: 'run apply only with MEDIA_MATCH_APPLY_CONFIRM=YES', scope: 'exact/high confidence media links' }] }
    const output = path.resolve(process.cwd(), 'backups', `catalog-media-match-plan-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify({ ...report.summary, product66Dependencies: dependencies.product66.productMediaRelations.length, writesPerformed: 0, output }, null, 2))
  } finally { await client.end() }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
