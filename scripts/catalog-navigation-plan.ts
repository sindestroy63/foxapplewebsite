import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const GROUPS = ['smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles', 'home-appliances', 'smart-devices', 'other']
const clean = (v: unknown) => String(v ?? '').trim()
const norm = (v: unknown) => clean(v).toLowerCase().replace(/[\[\](),]/gu, ' ').replace(/\b(?:19|20)\d{2}\b/gu, ' ').replace(/[-_]+/gu, ' ').replace(/\s+/gu, ' ').trim().replace(/^(apple|samsung|sony|dyson|ray\s*ban)\s+/u, '')
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

function classify(group: string, brand: string, rows: any[]) {
  const map = new Map<string, any[]>()
  for (const row of rows) { const value = clean(row.product_line); if (value) { if (!map.has(value)) map.set(value, []); map.get(value)!.push(row) } }
  return [...map].map(([line, items]) => {
    const same = items.some((p) => norm(line) === norm(p.name) || norm(line) === norm(p.product_line))
    let title: string | null = null; let decision = 'collapse_singleton'; let reason = 'line has one product'
    if (group === 'smartphones' && brand === 'Samsung') { if (/\bgalaxy\s+s\d/iu.test(line)) { title = 'Galaxy S'; decision = 'approved_business_line'; reason = 'approved Samsung family' } else if (/\bgalaxy\s+a\d/iu.test(line)) { title = 'Galaxy A'; decision = 'approved_business_line'; reason = 'approved Samsung family' } else if (/\bgalaxy\s+z/iu.test(line)) { title = 'Galaxy Z'; decision = 'approved_business_line'; reason = 'approved Samsung family' } }
    else if (group === 'gaming-consoles' && brand === 'Sony' && /^playstation\s+5/iu.test(line)) { title = 'PlayStation'; decision = 'approved_business_line'; reason = 'approved PlayStation family' }
    else if (group === 'gaming-consoles' && brand === 'Sony' && /геймпад/iu.test(line)) { title = line; decision = 'approved_business_line'; reason = 'gamepad classification' }
    else if (items.length >= 2 && !same) { title = line; decision = 'keep_line'; reason = 'multiple products grouped' }
    else if (same) { decision = 'collapse_duplicate_title'; reason = 'line matches product title' }
    return { group, brand, line, count: items.length, products: items.map((p) => ({ id: p.id, name: p.name })), decision, reason, title }
  })
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const result = await client.query('SELECT p.*, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.is_available = true ORDER BY p.id'); const products = result.rows as any[]; const usable = products.filter((p) => clean(p.status).toLowerCase() !== 'used' && clean(p.category_slug).toLowerCase() !== 'used')
    const decisions = GROUPS.flatMap((group) => { const rows = usable.filter((p) => (GROUPS.includes(p.product_group) ? p.product_group : 'other') === group); return [...new Set(rows.map((p) => clean(p.brand)).filter(Boolean))].flatMap((brand) => classify(group, brand, rows.filter((p) => clean(p.brand) === brand))) })
    const report = { generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, summary: { products: usable.length, groups: GROUPS.length, linesBefore: decisions.length, linesAfter: new Set(decisions.filter((d) => d.title).map((d) => `${d.group}:${d.brand}:${d.title}`)).size, collapsed: decisions.filter((d) => !d.title).length }, lineDecisions: decisions }
    const output = path.resolve(process.cwd(), 'backups', `catalog-navigation-depth-plan-${stamp()}.json`); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(report.summary, null, 2)); console.log(output)
  } finally { await client.end() }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
