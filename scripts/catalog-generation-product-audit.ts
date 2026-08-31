import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const text = (value: unknown) => typeof value === 'string' ? value : value == null ? null : String(value)

function variantAction(product: any, variant: any) {
  const generation = text(variant.generation)?.trim() || ''
  if (!generation) return 'keep_variant'
  const suspicious = generation.length > 24 || /(кабел|заряд|мыш|стилус|метк|наушник|пылесос|фен|камера|геймпад|airtag|pencil|mouse|dyson|gopro)/iu.test(generation)
  if (!suspicious) return 'keep_variant'
  if (product.id === 66) return 'split_product'
  if (product.id === 70) return 'split_product'
  return 'manual_review'
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const productsResult = await client.query(`
      SELECT p.*, c.id AS category_id_joined, c.name AS category_name, c.slug AS category_slug,
        COALESCE((SELECT json_agg(json_build_object(
          'id',v.id,'sku',v.sku,'generation',v.generation,'colorId',v.color_id,
          'color',coalesce(col.value,col.russian_label),'storageId',v.storage_id,'simId',v.sim_id,
          'chip',v.chip,'ram',v.ram,'screenSize',v.screen_size,'connectivity',v.connectivity,
          'size',v.size,'hasTouchId',v.has_touch_id,'ramOptionId',v.ram_option_id,
          'sizeOptionId',v.size_option_id,'screenSizeOptionId',v.screen_size_option_id,
          'connectivityOptionId',v.connectivity_option_id,'price',v.price,'oldPrice',v.old_price,
          'status',v.status,'isAvailable',v.is_available,
          'mediaIds',COALESCE((SELECT json_agg(vr.media_id ORDER BY vr.order) FROM products_variants_rels vr WHERE vr.parent_id=v.id AND vr.path='images'), '[]'::json)
        ) ORDER BY v._order) FROM products_variants v LEFT JOIN colors col ON col.id=v.color_id WHERE v._parent_id=p.id), '[]'::json) AS variants_json
      FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id`)
    const products = productsResult.rows.map((p: any) => ({
      id: p.id, sku: p.sku, name: p.name, model: p.model, slug: p.slug, productGroup: p.product_group,
      brand: p.brand, productType: p.product_type, productLine: p.product_line, categoryId: p.category_id_joined,
      categoryName: p.category_name, categorySlug: p.category_slug, price: p.price, isAvailable: p.is_available,
      variants: (p.variants_json || []).map((v: any) => ({ ...v, action: variantAction(p, v) })),
    }))
    const suspiciousGeneration = products.flatMap((p: any) => p.variants.filter((v: any) => v.action !== 'keep_variant').map((v: any) => ({ productId: p.id, product: p.name, ...v, proposedModel: v.generation, reason: 'generation contains a likely independent product or package name' })))
    const suspiciousColor = products.flatMap((p: any) => p.variants.filter((v: any) => v.color && /(airtag|pencil|mouse|major|hero|dualsense|дисков|заряд|кабел|наушник|камера)/iu.test(v.color)).map((v: any) => ({ productId: p.id, product: p.name, variantId: v.id, variantSku: v.sku, color: v.color, action: 'manual_review', proposedField: 'generation or product split' })))
    const apple = products.find((p: any) => p.id === 66) || null
    const report = {
      generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0,
      summary: { products: products.length, variants: products.reduce((n: number, p: any) => n + p.variants.length, 0), suspiciousGeneration: suspiciousGeneration.length, suspiciousColor: suspiciousColor.length },
      appleAccessories: apple,
      products,
      suspiciousGeneration, suspiciousColor,
      recommendedActions: suspiciousGeneration,
      proposedProductStructure: [
        { name: 'Apple AirTag', model: 'Apple AirTag', brand: 'Apple', productGroup: 'other', variants: ['1 шт', '4 шт'], action: 'split_product' },
        { name: 'Apple Magic Mouse USB-C', model: 'Apple Magic Mouse USB-C', brand: 'Apple', productGroup: 'other', variants: ['Black', 'White'], action: 'split_product' },
        { name: 'Apple Pencil USB-C', model: 'Apple Pencil USB-C', brand: 'Apple', productGroup: 'other', variants: [], action: 'split_product' },
        { name: 'Apple Pencil Pro', model: 'Apple Pencil Pro', brand: 'Apple', productGroup: 'other', variants: [], action: 'split_product' },
      ],
      risks: ['New product SKUs and slugs require manual approval; preserve old URL redirects and variant SKU mappings.', 'Generation/color values may be consumed by price matching and cart display.'],
      manualDecisions: suspiciousGeneration.filter((x: any) => x.action === 'manual_review'),
    }
    const output = path.resolve(process.cwd(), 'backups', `catalog-generation-product-audit-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ ...report.summary, output }, null, 2))
  } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
