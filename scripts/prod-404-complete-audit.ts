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

    console.log('═══ PRODUCTION 404 COMPLETE AUDIT ═══\n')

    // 1. ALL APPLE PRODUCTS MENTIONED
    console.log('📱 ALL APPLE PRODUCTS:')
    const allApple = await client.query(`
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
    console.table(allApple.rows)
    console.log(`Total found: ${allApple.rows.length}`)

    // 2. CHECK IF MISSING PRODUCTS EXIST AT ALL
    console.log('\n🔍 SEARCHING FOR MISSING PRODUCTS:')
    const missing = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE (name ILIKE '%iPad%' AND (name ILIKE '%Pro%' OR name ILIKE '%Air%'))
         OR (name ILIKE '%MacBook%' AND (name ILIKE '%Pro%' OR name ILIKE '%Air%'))
      ORDER BY name
      LIMIT 20
    `)
    console.table(missing.rows)

    // 3. INSTAX CATEGORY CHECK
    console.log('\n📷 INSTAX CATEGORY ANALYSIS:')

    // Check navigation structure for "Фото и видео"
    const photoVideoNav = await client.query(`
      SELECT id, title, kind, product_group, brand, product_line, stable_key, parent_id
      FROM catalog_navigation
      WHERE title ILIKE '%фото%видео%'
         OR title ILIKE '%photo%'
         OR stable_key LIKE '%foto%'
         OR stable_key LIKE '%photo%'
      ORDER BY id
    `)
    console.log('Photo/Video navigation entries:')
    console.table(photoVideoNav.rows)

    // Check what filter the category uses
    const instaxProducts = await client.query(`
      SELECT p.id, p.name, p.slug, p.product_group, p.brand, p.product_line, p.is_available,
        COUNT(cn.id) as nav_count
      FROM products p
      LEFT JOIN catalog_navigation cn ON cn.product_id = p.id
      WHERE p.name ILIKE '%instax%'
      GROUP BY p.id, p.name, p.slug, p.product_group, p.brand, p.product_line, p.is_available
      ORDER BY p.name
    `)
    console.log('\nInstax products and navigation:')
    console.table(instaxProducts.rows)

    // 4. CHECK NEW SLUGS FOR CONFLICTS
    console.log('\n🔄 SLUG CONFLICT CHECK:')
    const newSlugs = [
      'apple-airpods-max-2-2026',
      'apple-macbook-neo-a18-pro-2026',
      'chasy-samsung-galaxy-watch-8',
      'chasy-samsung-galaxy-watch-8-classic',
      'naushniki-marshall',
      'ekshn-kamera-gopro',
      'vypryamitel-dyson-ht01',
      'fen-dyson-supersonic-nural-hd16',
    ]

    for (const slug of newSlugs) {
      const conflict = await client.query(`
        SELECT id, name, slug FROM products WHERE slug = $1
      `, [slug])
      if (conflict.rows.length > 0) {
        console.log(`⚠️  CONFLICT: ${slug}`)
        console.table(conflict.rows)
      }
    }
    console.log('✅ No conflicts found for new slugs')

    // 5. URL_REDIRECTS TABLE STRUCTURE (try with different user if needed)
    console.log('\n🔄 URL_REDIRECTS TABLE CHECK:')
    try {
      const redirectsSchema = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'url_redirects'
        ORDER BY ordinal_position
      `)
      console.table(redirectsSchema.rows)

      const redirectsCount = await client.query(`
        SELECT COUNT(*) as total FROM url_redirects
      `)
      console.log(`Total redirects: ${redirectsCount.rows[0].total}`)
    } catch (e: any) {
      console.log(`❌ Cannot access url_redirects: ${e.message}`)
      console.log('✅ Table exists but requires higher privileges')
    }

    // 6. NAVIGATION SYNC ANALYSIS
    console.log('\n🗺️  NAVIGATION SYNC ANALYSIS:')

    // Count all mismatches
    const allMismatches = await client.query(`
      SELECT COUNT(*) as total
      FROM catalog_navigation cn
      JOIN products p ON cn.product_id = p.id
      WHERE cn.href != '/catalog/' || p.product_group || '/' || p.slug
    `)
    console.log(`\nTotal navigation mismatches: ${allMismatches.rows[0].total}`)

    // Show affected products from our fix list
    const ourMismatches = await client.query(`
      SELECT
        cn.id as nav_id,
        p.id as product_id,
        p.name,
        cn.href as current_href,
        '/catalog/' || p.product_group || '/' || p.slug as canonical_before_fix
      FROM catalog_navigation cn
      JOIN products p ON cn.product_id = p.id
      WHERE p.id IN (63, 20, 69, 74, 78, 67, 72, 51, 60)
      ORDER BY p.id
    `)
    console.log('\nOur products navigation (BEFORE slug fix):')
    console.table(ourMismatches.rows)

    // 7. PRODUCTION DOMAIN CHECK
    console.log('\n🌐 SITE SETTINGS:')
    const siteSettingsSchema = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'site_settings'
      ORDER BY ordinal_position
    `)
    console.log('Available columns:', siteSettingsSchema.rows.map(r => r.column_name).join(', '))

    const siteSettings = await client.query(`
      SELECT * FROM site_settings LIMIT 1
    `)
    console.table(siteSettings.rows)

    // 8. PREPARE MIGRATION VERIFICATION
    console.log('\n📋 MIGRATION TARGET PRODUCTS:')
    const targets = await client.query(`
      SELECT
        id,
        name,
        slug as old_slug,
        product_group,
        CASE
          WHEN id = 63 THEN 'apple-airpods-max-2-2026'
          WHEN id = 20 THEN 'apple-macbook-neo-a18-pro-2026'
          WHEN id = 69 THEN 'chasy-samsung-galaxy-watch-8'
          WHEN id = 78 THEN 'chasy-samsung-galaxy-watch-8-classic'
          WHEN id = 67 THEN 'naushniki-marshall'
          WHEN id = 72 THEN 'ekshn-kamera-gopro'
          WHEN id = 51 THEN 'vypryamitel-dyson-ht01'
          WHEN id = 60 THEN 'fen-dyson-supersonic-nural-hd16'
        END as new_slug
      FROM products
      WHERE id IN (63, 20, 69, 78, 67, 72, 51, 60)
      ORDER BY id
    `)
    console.table(targets.rows)

    console.log('\n✅ Complete audit finished')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
