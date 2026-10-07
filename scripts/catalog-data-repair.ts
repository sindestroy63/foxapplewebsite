import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { productCanonicalUrl } from '../src/lib/product-url.ts'

const apply = process.env.CATALOG_DATA_REPAIR_APPLY === '1'
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
type ProductPlan = { id: number; productGroup: string; brand: string; categoryId: number | null; parentId: number; reason: string }

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const products = (await client.query(`SELECT p.id, p.name, p.slug, p.product_group, p.brand, p.product_line, p.category_id, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id IN (101,173,174,175,184,185) ORDER BY p.id`)).rows as any[]
    const categories = (await client.query(`SELECT id, slug, name FROM categories WHERE lower(btrim(name)) IN ('другое', 'смартфоны') OR slug IN ('drugoe', 'smartphones') ORDER BY id`)).rows as any[]
    const navigation = (await client.query(`SELECT * FROM catalog_navigation ORDER BY id`)).rows as any[]
    const byId = new Map(navigation.map((row) => [Number(row.id), row]))
    const ancestors = (row: any) => { const chain: any[] = []; const seen = new Set<number>(); let current = row; while (current?.parent_id && !seen.has(Number(current.parent_id))) { seen.add(Number(current.parent_id)); current = byId.get(Number(current.parent_id)); if (current) chain.unshift(current) } return chain }
    const findPath = (group: string, brand: string) => navigation.filter((row) => row.kind === 'brand' && String(row.brand || row.title).toLowerCase() === brand.toLowerCase() && ancestors(row).some((parent) => parent.kind === 'group' && parent.product_group === group)).map((row) => row.id)
    const existingRayBanPlacement = navigation.find((row) => Number(row.product_id) === 101 && row.kind === 'product')
    const existingParent = (productId: number, group: string, brand: string) => {
      if (productId !== 101 && [173, 174, 175].includes(productId) && existingRayBanPlacement) return Number(existingRayBanPlacement.parent_id)
      return findPath(group, brand)[0] || null
    }
    const plans: ProductPlan[] = []
    for (const product of products) {
      const desired = product.id === 101 || [173, 174, 175].includes(product.id)
        ? { productGroup: 'smart-devices', brand: 'Ray-Ban', categorySlug: 'drugoe', categoryName: 'другое', brandName: 'Ray-Ban' }
        : product.id === 185
          ? { productGroup: 'smartphones', brand: 'Google', categorySlug: 'smartphones', categoryName: 'смартфоны', brandName: 'Google' }
          : product.id === 184
            ? { productGroup: 'other', brand: 'Keephone', categorySlug: 'drugoe', categoryName: 'другое', brandName: 'Keephone' }
            : null
      if (!desired) continue
      const parentId = existingParent(product.id, desired.productGroup, desired.brand)
      if (!parentId) { console.log(`REVIEW product ${product.id}: no unambiguous existing placement parent for ${desired.productGroup}/${desired.brand}`); continue }
      const categoryMatches = categories.filter((category) => category.slug === desired.categorySlug || String(category.name).trim().toLowerCase() === desired.categoryName)
      if (categoryMatches.length !== 1) { console.log(`REVIEW product ${product.id}: expected one category ${desired.categorySlug}, found ${categoryMatches.length}`); continue }
      const categoryId = Number(categoryMatches[0].id)
      plans.push({ id: product.id, productGroup: desired.productGroup, brand: desired.brandName, categoryId, parentId, reason: product.id === 101 || [173, 174, 175].includes(product.id) ? 'existing Ray-Ban product placement parent' : 'unique existing navigation ancestor' })
    }
    const hrefChanges = (await client.query(`SELECT n.id, n.product_id, n.href, p.slug, p.product_group, c.slug AS category_slug FROM catalog_navigation n JOIN products p ON p.id=n.product_id LEFT JOIN categories c ON c.id=p.category_id WHERE n.kind='product' AND n.id <> 275`)).rows as any[]
    const plannedIds = new Set(plans.map((plan) => plan.id))
    const report = { generatedAt: new Date().toISOString(), mode: apply ? 'apply' : 'dry-run', noProductDeletes: true, noProductCreates: true, plans, reviewProductIds: products.map((product) => product.id).filter((id) => !plannedIds.has(id)), canonicalCandidates: hrefChanges.map((row) => ({ id: row.id, productId: row.product_id, to: productCanonicalUrl({ slug: row.slug, productGroup: row.product_group, category: row.category_slug }) })) }
    const reportPath = path.resolve(process.cwd(), 'backups', `catalog-data-repair-${stamp()}.json`)
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    if (!apply) { await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(report, null, 2)); return }
    const affectedIds = [...new Set([...plans.map((plan) => plan.id), ...hrefChanges.map((row) => row.product_id)])]
    const backup = {
      ...report,
      products: (await client.query('SELECT * FROM products WHERE id = ANY($1::int[])', [affectedIds])).rows,
      navigation: (await client.query('SELECT * FROM catalog_navigation WHERE product_id = ANY($1::int[]) OR id IN (SELECT id FROM catalog_navigation WHERE href IS NOT NULL)', [affectedIds])).rows,
    }
    await fs.writeFile(reportPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
    await client.query('BEGIN')
    for (const plan of plans) {
      await client.query('UPDATE products SET product_group=$1, brand=$2, category_id=COALESCE($3, category_id) WHERE id=$4', [plan.productGroup, plan.brand, plan.categoryId, plan.id])
      const product = products.find((item) => item.id === plan.id)
      const existing = (await client.query(`SELECT id FROM catalog_navigation WHERE kind='product' AND (stable_key=$1 OR product_id=$2) ORDER BY CASE WHEN stable_key=$1 THEN 0 ELSE 1 END, id`, [`product:${plan.id}`, plan.id])).rows as any[]
      if (existing.length > 1) throw new Error(`REVIEW product ${plan.id}: duplicate navigation records (${existing.map((item) => item.id).join(',')})`)
      if (existing.length === 1) {
        await client.query('UPDATE catalog_navigation SET parent_id=$1, href=$2, product_group=$3, brand=$4, product_line=$5 WHERE id=$6', [plan.parentId, `/catalog/${plan.productGroup}/${product.slug}`, plan.productGroup, plan.brand, product.product_line || null, existing[0].id])
      } else if (existing.length === 0) {
        await client.query(`INSERT INTO catalog_navigation (title, kind, parent_id, product_id, href, sort_order, is_visible, is_new, stable_key, generated_by, product_group, brand, product_line) VALUES ($1, 'product', $2, $3, $4, 100, true, false, $5, 'generated:catalog-data-repair', $6, $7, $8)`, [product.name, plan.parentId, plan.id, `/catalog/${plan.productGroup}/${product.slug}`, `product:${plan.id}`, plan.productGroup, plan.brand, product.product_line || null])
      }
    }
    await client.query('COMMIT')
    console.log(JSON.stringify({ ...report, applied: plans.map((plan) => plan.id), backup: reportPath }, null, 2))
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })