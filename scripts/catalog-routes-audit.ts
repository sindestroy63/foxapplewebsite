import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const baseUrl = (process.env.CATALOG_AUDIT_BASE_URL || 'http://localhost:3001').replace(/\/$/u, '')
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const clean = (value: unknown) => String(value ?? '').trim()
const idOf = (value: unknown) => (value === null || value === undefined ? null : String(value))
const route = (value: string) => value.startsWith('/') ? value : `/${value}`

async function statusFor(href: string) {
  try {
    const response = await fetch(new URL(route(href), baseUrl), { redirect: 'manual' })
    return response.status
  } catch {
    return null
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    // A single pg.Client cannot execute concurrent queries reliably.
    const productsResult = await client.query(`SELECT p.id, p.sku, p.name, p.model, p.slug, p.product_group, p.brand, p.product_line, p.category_id, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id`)
    const categoriesResult = await client.query(`SELECT id, name, slug, is_active FROM categories ORDER BY id`)
    const navigationResult = await client.query(`SELECT id, kind, title, stable_key, parent_id, product_id, href, product_group, brand, product_line, is_visible FROM catalog_navigation ORDER BY sort_order, id`)
    const products = productsResult.rows as any[]
    const categories = categoriesResult.rows as any[]
    const navigation = navigationResult.rows as any[]
    const byId = new Map(navigation.map((row) => [String(row.id), row]))
    const navProducts = new Map<string, any[]>()
    for (const row of navigation.filter((item) => item.kind === 'product')) {
      const key = idOf(row.product_id)
      if (key) navProducts.set(key, [...(navProducts.get(key) || []), row])
    }
    const ancestorInfo = (row: any) => {
      const chain: any[] = []
      let current = row
      const seen = new Set<string>()
      while (current) {
        const key = String(current.id)
        if (seen.has(key)) return { chain, cycle: true }
        seen.add(key)
        chain.unshift(current)
        current = current.parent_id ? byId.get(String(current.parent_id)) : null
      }
      return { chain, cycle: false }
    }
    const navItems: any[] = navigation.filter((item) => item.kind === 'product').map((item) => {
      const product = products.find((entry) => String(entry.id) === String(item.product_id))
      const ancestors = ancestorInfo(item)
      const group = ancestors.chain.find((entry) => entry.kind === 'group')
      const brand = ancestors.chain.find((entry) => entry.kind === 'brand')
      const line = ancestors.chain.find((entry) => entry.kind === 'line')
      const canonicalHref = product?.slug && product?.product_group ? `/catalog/${product.product_group}/${product.slug}` : null
      return {
        navigationId: item.id,
        kind: item.kind,
        title: item.title,
        stableKey: item.stable_key,
        parentId: item.parent_id,
        ancestorGroup: group?.title || null,
        ancestorBrand: brand?.title || null,
        ancestorLine: line?.title || null,
        productId: item.product_id,
        navigationHref: item.href,
        canonicalHref,
        hrefMatchesCanonical: Boolean(canonicalHref && item.href === canonicalHref),
        product: product ? { id: product.id, sku: product.sku, name: product.name, model: product.model, slug: product.slug, categoryName: product.category_name, categorySlug: product.category_slug, productGroup: product.product_group, brand: product.brand, productLine: product.product_line } : null,
        semantic: {
          valid: Boolean(product && canonicalHref && !ancestors.cycle && (!group || group.product_group === product.product_group || product.product_group === 'accessories' && group.product_group === 'other') && (!brand || clean(brand.brand) === clean(product.brand)) && (!line || clean(line.product_line) === clean(product.product_line))),
          cycle: ancestors.cycle,
        },
      }
    })
    for (const item of navItems) {
      item.navigationHttpStatus = await statusFor(item.navigationHref)
      item.canonicalHttpStatus = item.canonicalHref ? await statusFor(item.canonicalHref) : null
      item.result = !item.product ? 'missing_product' : !item.product.slug ? 'missing_slug' : item.navigationHttpStatus !== 200 && item.canonicalHttpStatus === 200 ? 'wrong_href' : item.canonicalHttpStatus !== 200 ? 'route_not_supported' : item.hrefMatchesCanonical ? 'valid' : 'wrong_href'
    }
    const productRows = []
    for (const product of products) {
      const links = navProducts.get(String(product.id)) || []
      const canonicalHref = product.slug && product.product_group ? `/catalog/${product.product_group}/${product.slug}` : null
      productRows.push({
        id: product.id, sku: product.sku, name: product.name, model: product.model, slug: product.slug, categoryName: product.category_name, categorySlug: product.category_slug, productGroup: product.product_group, brand: product.brand, productLine: product.product_line,
        slugDiagnostics: product.slug ? {
          hasWhitespace: /\s/u.test(product.slug),
          hasUppercase: product.slug !== product.slug.toLowerCase(),
          hasNonAscii: /[^\x00-\x7F]/u.test(product.slug),
          hasUnsafePunctuation: /[()[\]{}]/u.test(product.slug),
        } : null,
        navigationProductIds: links.map((link) => link.id), navigationParentIds: links.map((link) => link.parent_id), navigationHrefs: links.map((link) => link.href), canonicalHref,
        canonicalHttpStatus: canonicalHref ? await statusFor(canonicalHref) : null,
        navigationHttpStatuses: await Promise.all(links.map((link) => statusFor(link.href))),
        result: !product.slug ? 'missing_slug' : links.length === 0 ? 'missing_navigation' : links.length > 1 ? 'duplicate_navigation' : 'audited',
      })
    }
    const categoryRoutes = []
    const legacyRoutes = ['iphone', 'ipad', 'macbook', 'airpods', 'apple-watch', 'playstation', 'dyson', 'ray-ban', 'accessories', 'used']
    for (const slug of legacyRoutes) categoryRoutes.push({ route: `/catalog/${slug}`, httpStatus: await statusFor(`/catalog/${slug}`), category: categories.find((item) => item.slug === slug) || null })
    const groupRoutes = ['smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles', 'home-appliances', 'smart-devices', 'other'].map((slug) => `/catalog?group=${slug}`)
    const groupRouteResults = []
    for (const href of groupRoutes) groupRouteResults.push({ route: href, httpStatus: await statusFor(href), productCount: products.filter((p) => (p.product_group === new URL(href, baseUrl).searchParams.get('group') || new URL(href, baseUrl).searchParams.get('group') === 'other' && ['other', 'accessories'].includes(p.product_group))).length })
    const filterRoutes = ['/catalog?group=smartphones&brand=Apple', '/catalog?group=smartphones&brand=Samsung', '/catalog?group=smartphones&brand=Samsung&line=Galaxy%20S', '/catalog?group=smartphones&brand=Samsung&line=Galaxy%20Z', '/catalog?group=gaming-consoles&brand=Sony&line=PlayStation', '/catalog?group=home-appliances&brand=Dyson']
    const filterResults = filterRoutes.map((href) => ({ route: href, httpStatus: null as number | null }))
    for (const item of filterResults) item.httpStatus = await statusFor(item.route)
    const slugCounts = new Map<string, number>()
    for (const product of products) if (product.slug) slugCounts.set(product.slug, (slugCounts.get(product.slug) || 0) + 1)
    const duplicateSlugs = [...slugCounts].filter(([, count]) => count > 1).map(([slug, count]) => ({ slug, count }))
    const report = {
      generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, baseUrl,
      summary: { products: products.length, navigationProductItems: navItems.length, workingCanonicalUrls: productRows.filter((p) => p.canonicalHttpStatus === 200).length, brokenCanonicalUrls: productRows.filter((p) => p.canonicalHttpStatus !== 200).length, wrongNavigationHrefs: navItems.filter((p) => p.result === 'wrong_href').length, missingSlugs: products.filter((p) => !p.slug).length, duplicateSlugs: duplicateSlugs.length, missingProducts: productRows.filter((p) => p.result === 'missing_navigation').length, duplicateNavigation: productRows.filter((p) => p.result === 'duplicate_navigation').length },
      products: productRows, navigationItems: navItems, brokenUrls: navItems.filter((p) => p.navigationHttpStatus !== 200), wrongHrefs: navItems.filter((p) => p.result === 'wrong_href'), missingProducts: productRows.filter((p) => p.result === 'missing_navigation'), duplicateProducts: productRows.filter((p) => p.result === 'duplicate_navigation'), duplicateSlugs, semanticErrors: navItems.filter((p) => !p.semantic.valid), categoryRoutes, groupRoutes: groupRouteResults, legacyRoutes: categoryRoutes, filterRoutes: filterResults,
      proposedFixes: navItems.filter((p) => p.result === 'wrong_href').map((p) => ({ navigationId: p.navigationId, action: 'href_fix_only', href: p.canonicalHref })),
    }
    const output = path.resolve(process.cwd(), 'backups', `catalog-routes-audit-fixed-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ ...report.summary, legacyErrors: categoryRoutes.filter((r) => r.httpStatus !== 200).length, groupErrors: groupRouteResults.filter((r) => r.httpStatus !== 200).length }, null, 2))
    for (const item of report.brokenUrls) console.log(`404 ${item.product?.name || item.title}: ${item.navigationHref} (canonical ${item.canonicalHref}, ${item.canonicalHttpStatus})`)
    console.log(output)
  } finally { await client.end() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
