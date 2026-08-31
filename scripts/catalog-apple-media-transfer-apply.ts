import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const confirm = process.env.APPLE_MEDIA_TRANSFER_CONFIRM === 'YES'
const media = [
  { id: 1216, filename: 'airtag.webp', productId: 115, variant: '1 шт', reason: 'filename and AirTag packageLabel match', confidence: 'exact' },
  { id: 1217, filename: 'airtag 4.webp', productId: 115, variant: '4 шт', reason: 'filename and AirTag packageLabel match', confidence: 'exact' },
  { id: 1212, filename: 'magic.webp', productId: 116, variant: null, reason: 'filename identifies Magic Mouse; color not inferred', confidence: 'high' },
  { id: 1213, filename: 'magic-1.webp', productId: 116, variant: null, reason: 'filename identifies Magic Mouse; color not inferred', confidence: 'high' },
  { id: 1214, filename: 'pensil.webp', productId: 117, variant: null, reason: 'filename identifies Pencil USB-C', confidence: 'exact' },
  { id: 1215, filename: 'pensil 8990.webp', productId: 118, variant: null, reason: 'filename/price identifies Pencil Pro', confidence: 'exact' },
]

async function report(name: string, value: unknown) {
  const output = path.resolve(process.cwd(), 'backups', `${name}-${new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')}.json`)
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(value, null, 2)}\n`); return output
}
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const products = (await client.query('SELECT id,name,sku,slug FROM products WHERE id=ANY($1::int[]) ORDER BY id', [[66,115,116,117,118]])).rows
    const rows = (await client.query('SELECT r.id,r.parent_id,r.path,r.media_id,m.filename,m.url,m.alt FROM products_rels r JOIN media m ON m.id=r.media_id WHERE r.parent_id=66 AND r.media_id=ANY($1::int[]) ORDER BY r.id', [media.map((m) => m.id)])).rows
    const files = await Promise.all(media.map(async (m) => ({ ...m, exists: await fs.access(path.join('/app/media', m.filename)).then(() => true).catch(() => false) })))
    const plan = { generatedAt: new Date().toISOString(), readOnly: !confirm, products, sourceRelations: rows, media: files, targetRelations: media.map((m) => ({ ...m, path: 'images', action: 'create_product_level_relation' })), writesPerformed: 0 }
    const planOutput = await report('catalog-apple-media-transfer-plan', plan)
    if (!confirm) { console.log(JSON.stringify({ planOutput, writesPerformed: 0 }, null, 2)); return }
    if (products.length !== 5 || rows.length !== 6 || files.some((m) => !m.exists)) throw new Error('Media transfer preflight failed')
    await client.query('BEGIN')
    for (const item of media) await client.query("INSERT INTO products_rels (parent_id,path,media_id,\"order\") SELECT $1,'images',$2,COALESCE((SELECT max(\"order\")+1 FROM products_rels WHERE parent_id=$1 AND path='images'),0) WHERE NOT EXISTS (SELECT 1 FROM products_rels WHERE parent_id=$1 AND path='images' AND media_id=$2)", [item.productId, item.id])
    await client.query('COMMIT')
    const after = (await client.query('SELECT r.parent_id,r.path,r.media_id,m.filename,m.url,m.alt FROM products_rels r JOIN media m ON m.id=r.media_id WHERE r.parent_id=ANY($1::int[]) AND r.media_id=ANY($2::int[]) ORDER BY r.parent_id,r.id', [[66,115,116,117,118], media.map((m) => m.id)])).rows
    const afterOutput = await report('catalog-apple-media-transfer-after', { generatedAt: new Date().toISOString(), sourceRelations: rows, targetRelations: after, writesPerformed: 1 })
    console.log(JSON.stringify({ applied: true, planOutput, afterOutput, targetRelations: after, writesPerformed: 1 }, null, 2))
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { await client.end() }
}
if (!confirm) { main().catch((error) => { console.error(error); process.exitCode = 1 }) } else main().catch((error) => { console.error(error); process.exitCode = 1 })
