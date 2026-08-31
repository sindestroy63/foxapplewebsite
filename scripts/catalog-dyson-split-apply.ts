import pg from 'pg'

const { Client } = pg
const confirm = process.env.DYSON_SPLIT_APPLY_CONFIRM === 'YES'
const targets = [
  { source: 49, generation: 'HS08', name: 'Стайлер Dyson HS08', model: 'Dyson HS08', sku: 'PRD-DYSON-HS08', slug: 'dyson-hs08', type: 'Стайлер', line: 'Стайлеры Dyson' },
  { source: 49, generation: 'HS09 Coanda 2x', name: 'Стайлер Dyson HS09 Coanda 2x', model: 'Dyson HS09 Coanda 2x', sku: 'PRD-DYSON-HS09-COANDA-2X', slug: 'dyson-hs09-coanda-2x', type: 'Стайлер', line: 'Стайлеры Dyson' },
  { source: 61, generation: 'SV23', name: 'Пылесос Dyson SV23', model: 'Dyson SV23', sku: 'PRD-DYSON-SV23', slug: 'dyson-sv23', type: 'Пылесос', line: 'Пылесосы Dyson' },
  { source: 61, generation: 'SV50', name: 'Пылесос Dyson SV50', model: 'Dyson SV50', sku: 'PRD-DYSON-SV50', slug: 'dyson-sv50', type: 'Пылесос', line: 'Пылесосы Dyson' },
]

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('BEGIN')
    const sourceIds = [...new Set(targets.map((t) => t.source))]
    const sources = (await client.query('SELECT * FROM products WHERE id = ANY($1::int[]) FOR UPDATE', [sourceIds])).rows
    if (sources.length !== sourceIds.length) throw new Error('Required Dyson source Product is missing')
    const conflicts = (await client.query('SELECT id,sku,slug,name FROM products WHERE sku = ANY($1::text[]) OR slug = ANY($2::text[])', [targets.map((t) => t.sku), targets.map((t) => t.slug)])).rows
    for (const row of conflicts) if (!targets.some((t) => t.sku === row.sku && t.slug === row.slug && row.id > 100)) throw new Error(`SKU/slug conflict: ${JSON.stringify(row)}`)
    const result: any[] = []
    for (const target of targets) {
      let product = (await client.query('SELECT * FROM products WHERE sku=$1 FOR UPDATE', [target.sku])).rows[0]
      if (!product) {
        product = (await client.query(`INSERT INTO products (name,model,slug,sku,price,is_available,status,product_group,brand,product_type,product_line,category_id,created_at,updated_at) VALUES ($1,$2,$3,$4,0,true,'in_stock','home-appliances','Dyson',$5,$6,NULL,now(),now()) RETURNING *`, [target.name, target.model, target.slug, target.sku, target.type, target.line])).rows[0]
      }
      const variants = (await client.query('SELECT * FROM products_variants WHERE _parent_id=$1 AND generation=$2 FOR UPDATE', [target.source, target.generation])).rows
      if (!variants.length) {
        const already = (await client.query('SELECT count(*)::int AS n FROM products_variants WHERE _parent_id=$1', [product.id])).rows[0].n
        if (!already) throw new Error(`No variants to move for ${target.generation}`)
      }
      for (const variant of variants) {
        const oldIndex = Number(variant._order) - 1
        await client.query('UPDATE products_variants SET _parent_id=$1,generation=NULL WHERE id=$2', [product.id, variant.id])
        await client.query("UPDATE products_rels SET parent_id=$1,path='variants.0.images' WHERE parent_id=$2 AND path=$3", [product.id, target.source, `variants.${oldIndex}.images`])
      }
      const price = (await client.query('SELECT min(price)::int AS price FROM products_variants WHERE _parent_id=$1', [product.id])).rows[0].price
      await client.query('UPDATE products SET price=$1,updated_at=now() WHERE id=$2', [price, product.id])
      const targetVariants = (await client.query('SELECT id FROM products_variants WHERE _parent_id=$1 ORDER BY _order,id FOR UPDATE', [product.id])).rows
      for (let index = 0; index < targetVariants.length; index += 1) {
        await client.query('UPDATE products_variants SET _order=$1 WHERE id=$2', [index + 1, targetVariants[index].id])
      }
      const targetMedia = (await client.query("SELECT id FROM products_rels WHERE parent_id=$1 AND path LIKE 'variants.%' ORDER BY id FOR UPDATE", [product.id])).rows
      if (targetMedia.length && targetMedia.length !== targetVariants.length) throw new Error(`Media relation count mismatch for ${target.sku}`)
      for (let index = 0; index < targetMedia.length; index += 1) {
        await client.query('UPDATE products_rels SET path=$1 WHERE id=$2', [`variants.${index}.images`, targetMedia[index].id])
      }
      const group = (await client.query("SELECT id FROM catalog_navigation WHERE stable_key='group:home-appliances' LIMIT 1")).rows[0]
      const brand = (await client.query("SELECT id FROM catalog_navigation WHERE stable_key='brand:home-appliances:Dyson' LIMIT 1")).rows[0]
      if (!group || !brand) throw new Error('Dyson navigation group/brand missing')
      await client.query(`INSERT INTO catalog_navigation (title,kind,parent_id,product_id,href,sort_order,is_visible,is_new,stable_key,generated_by,product_group,brand,product_line,created_at,updated_at) SELECT $1::text,'product',$2::integer,$3::integer,$4::text,100,true,false,$5::text,'dyson-split','home-appliances','Dyson',$6::text,now(),now() WHERE NOT EXISTS (SELECT 1 FROM catalog_navigation WHERE stable_key=$5::text)`, [target.name, brand.id, product.id, `/catalog/home-appliances/${target.slug}`, `product:${product.id}`, target.line])
      result.push({ ...target, productId: product.id, variantCount: variants.length, price })
    }
    for (const source of sourceIds) {
      await client.query("UPDATE catalog_navigation SET is_visible=false WHERE product_id=$1 AND kind='product' AND generated_by <> 'manual'", [source])
    }
    await client.query('COMMIT')
    console.log(JSON.stringify({ applied: true, confirm, targets: result, writesPerformed: 1 }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK'); throw error
  } finally { await client.end() }
}

if (!confirm) { console.log(JSON.stringify({ applied: false, requires: 'DYSON_SPLIT_APPLY_CONFIRM=YES', targets, writesPerformed: 0 }, null, 2)); process.exit(0) }
main().catch((error) => { console.error(error); process.exitCode = 1 })
