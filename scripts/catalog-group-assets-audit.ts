import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const groups = ['smartphones','tablets','laptops','smart-watches','audio','gaming-consoles','home-appliances','smart-devices','other']
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const rows = (await client.query(`WITH c AS (SELECT p.product_group,r.media_id,m.filename,m.mime_type,m.url,ROW_NUMBER() OVER(PARTITION BY p.product_group ORDER BY p.id,r.id) rn FROM products p JOIN products_rels r ON r.parent_id=p.id JOIN media m ON m.id=r.media_id) SELECT product_group,media_id,filename,mime_type,url FROM c WHERE rn=1 ORDER BY product_group`)).rows
    const hero = (await client.query("SELECT id,filename,mime_type,url FROM media WHERE id=1410")).rows[0]
    const groupAssets = await Promise.all(rows.map(async (r: any) => ({ element: r.product_group, mediaId: r.media_id, filename: r.filename, url: r.url, mimeType: r.mime_type, physicalFile: await fs.access(path.join('/app/media', r.filename)).then(() => true).catch(() => false), confidence: 'high' })))
    const heroAsset = { element: 'hero', mediaId: hero?.id, filename: hero?.filename, url: hero?.url, mimeType: hero?.mime_type, physicalFile: hero ? await fs.access(path.join('/app/media', hero.filename)).then(() => true).catch(() => false) : false, confidence: hero ? 'exact' : 'missing' }
    const all = [...groupAssets, heroAsset]
    const output = path.resolve(process.cwd(), 'backups', `catalog-group-assets-audit-${stamp()}.json`); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), readOnly: true, assets: all, groups }, null, 2)}\n`); console.log(JSON.stringify({ output, assets: all, writesPerformed: 0 }, null, 2))
  } finally { await client.end() }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
