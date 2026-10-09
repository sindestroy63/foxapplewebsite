import pg from 'pg'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve))
}

async function main() {
  const password = await question('Production PostgreSQL password: ')
  rl.close()

  const client = new pg.Client({
    host: '127.0.0.1',
    port: 15433,
    database: 'foxapple',
    user: 'foxstore_reader',
    password,
  })

  try {
    await client.connect()
    console.log('✅ Connected to production PostgreSQL\n')

    // First, check catalog_navigation schema
    console.log('🔍 CATALOG_NAVIGATION SCHEMA:')
    const schema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'catalog_navigation'
      ORDER BY ordinal_position
    `)
    console.table(schema.rows)

    console.log('\n═══ PRODUCTION 404 DIAGNOSTICS ═══\n')

    // Apple products
    console.log('📱 APPLE PRODUCTS:')
    const apple = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE name ILIKE '%iPad Pro M5%'
         OR name ILIKE '%iPad Air M4%'
         OR name ILIKE '%AirPods Max 2%'
         OR name ILIKE '%MacBook Pro M5%'
         OR name ILIKE '%MacBook Air M5%'
         OR name ILIKE '%MacBook Neo%'
      ORDER BY name
    `)
    console.table(apple.rows)

    // Samsung products
    console.log('\n📱 SAMSUNG PRODUCTS:')
    const samsung = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE name ILIKE '%Galaxy Watch 8%'
      ORDER BY name
    `)
    console.table(samsung.rows)

    // Other products
    console.log('\n🎧 OTHER PRODUCTS:')
    const other = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE name ILIKE '%Marshall%'
         OR name ILIKE '%GoPro%'
         OR name ILIKE '%Instax Mini 12%'
         OR name ILIKE '%Instax Mini 13%'
      ORDER BY name
    `)
    console.table(other.rows)

    // Dyson products
    console.log('\n💨 DYSON PRODUCTS:')
    const dyson = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE name ILIKE '%Supersonic%'
         OR name ILIKE '%HT01%'
         OR name ILIKE '%Dyson Airstrait%'
      ORDER BY name
    `)
    console.table(dyson.rows)

    // Navigation for these products
    console.log('\n🗺️  NAVIGATION ENTRIES:')
    const nav = await client.query(`
      SELECT cn.id, cn.href, cn.stable_key, p.id as product_id, p.name, p.slug, p.product_group
      FROM catalog_navigation cn
      JOIN products p ON cn.product_id = p.id
      WHERE p.name ILIKE '%iPad Pro M5%'
         OR p.name ILIKE '%iPad Air M4%'
         OR p.name ILIKE '%AirPods Max 2%'
         OR p.name ILIKE '%MacBook Pro M5%'
         OR p.name ILIKE '%MacBook Air M5%'
         OR p.name ILIKE '%MacBook Neo%'
         OR p.name ILIKE '%Galaxy Watch 8%'
         OR p.name ILIKE '%Marshall%'
         OR p.name ILIKE '%GoPro%'
         OR p.name ILIKE '%Instax Mini%'
         OR p.name ILIKE '%Supersonic%'
         OR p.name ILIKE '%HT01%'
      ORDER BY p.name
    `)
    console.table(nav.rows)
    console.table(nav.rows)

    // URL mismatches
    console.log('\n⚠️  URL MISMATCHES (href != canonical):')
    const mismatches = await client.query(`
      SELECT
        cn.id as nav_id,
        p.id as product_id,
        p.name,
        p.slug,
        p.product_group,
        cn.href as current_href,
        '/catalog/' || p.product_group || '/' || p.slug as canonical_url,
        CASE
          WHEN cn.href = '/catalog/' || p.product_group || '/' || p.slug THEN '✅'
          ELSE '❌'
        END as match
      FROM catalog_navigation cn
      JOIN products p ON cn.product_id = p.id
      WHERE cn.href != '/catalog/' || p.product_group || '/' || p.slug
         AND (p.name ILIKE '%iPad Pro M5%'
           OR p.name ILIKE '%iPad Air M4%'
           OR p.name ILIKE '%AirPods Max 2%'
           OR p.name ILIKE '%MacBook Pro M5%'
           OR p.name ILIKE '%MacBook Air M5%'
           OR p.name ILIKE '%MacBook Neo%'
           OR p.name ILIKE '%Galaxy Watch 8%'
           OR p.name ILIKE '%Marshall%'
           OR p.name ILIKE '%GoPro%'
           OR p.name ILIKE '%Instax Mini%'
           OR p.name ILIKE '%Supersonic%'
           OR p.name ILIKE '%HT01%')
      ORDER BY p.name
    `)
    console.table(mismatches.rows)

    // Check for Cyrillic/invalid slugs
    console.log('\n🔤 SLUG VALIDATION:')
    const invalidSlugs = await client.query(`
      SELECT id, name, slug, product_group,
        CASE
          WHEN slug ~ '[А-Яа-яЁё]' THEN 'Cyrillic'
          WHEN slug ~ '[A-Z]' THEN 'Uppercase'
          WHEN slug ~ '\\s' THEN 'Spaces'
          WHEN slug ~ '[^a-z0-9-]' THEN 'Invalid chars'
          ELSE 'OK'
        END as issue
      FROM products
      WHERE (name ILIKE '%iPad Pro M5%'
           OR name ILIKE '%iPad Air M4%'
           OR name ILIKE '%AirPods Max 2%'
           OR name ILIKE '%MacBook Pro M5%'
           OR name ILIKE '%MacBook Air M5%'
           OR name ILIKE '%MacBook Neo%'
           OR name ILIKE '%Galaxy Watch 8%'
           OR name ILIKE '%Marshall%'
           OR name ILIKE '%GoPro%'
           OR name ILIKE '%Instax Mini%'
           OR name ILIKE '%Supersonic%'
           OR name ILIKE '%HT01%')
        AND (slug ~ '[А-Яа-яЁё]' OR slug ~ '[A-Z]' OR slug ~ '\\s' OR slug ~ '[^a-z0-9-]')
      ORDER BY name
    `)
    console.table(invalidSlugs.rows)

    // Check existing redirects
    console.log('\n🔄 EXISTING URL REDIRECTS:')
    const redirects = await client.query(`
      SELECT id, "from", "to", permanent, source, created_at
      FROM url_redirects
      ORDER BY created_at DESC
      LIMIT 20
    `)
    console.table(redirects.rows)

    console.log('\n✅ Diagnostics complete')

  } catch (error) {
    console.error('❌ Connection error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
