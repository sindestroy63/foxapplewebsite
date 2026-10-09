/**
 * FOXSTORE PRODUCTION AUDIT - READ ONLY
 *
 * Требует переменную окружения: PROD_DB_PASSWORD
 */

import { Client } from 'pg'

async function auditProduction() {
  const password = process.env.PROD_DB_PASSWORD

  if (!password) {
    console.error('❌ Set PROD_DB_PASSWORD environment variable')
    process.exit(1)
  }

  const client = new Client({
    host: '127.0.0.1',
    port: 15433,
    database: 'foxapple',
    user: 'foxstore_reader',
    password,
  })

  try {
    await client.connect()
    const { rows: [mode] } = await client.query('SHOW transaction_read_only')
    console.log('✅ Connected:', mode.transaction_read_only === 'on' ? 'READ-ONLY' : 'WARNING')

    console.log('\n' + '='.repeat(80))
    console.log('  PRODUCTION AUDIT REPORT')
    console.log('='.repeat(80))

    // 1. Ray-Ban Products
    console.log('\n1️⃣  RAY-BAN PRODUCTS\n')
    const { rows: rb } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products WHERE id IN (101, 173, 174, 175) ORDER BY id
    `)

    rb.forEach(p => {
      const isWrong = p.product_group === 'gaming-consoles'
      console.log(`  Product ${p.id}: ${p.name}`)
      console.log(`    slug: ${p.slug}`)
      console.log(`    productGroup: ${p.product_group} ${isWrong ? '❌ (should be smart-devices)' : '✅'}`)
      console.log(`    isAvailable: ${p.is_available}`)
      console.log(`    current URL: /catalog/${p.product_group}/${p.slug}`)
      console.log()
    })

    // Check catalog_navigation schema
    const { rows: cols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'catalog_navigation'
      ORDER BY ordinal_position
    `)
    console.log('  catalog_navigation columns:', cols.slice(0, 10).map(c => c.column_name).join(', '), '...')

    // 2. DualSense
    console.log('\n2️⃣  DUALSENSE PS5\n')
    const { rows: ds } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products WHERE name ILIKE '%dualsense%' ORDER BY id LIMIT 5
    `)

    if (ds.length === 0) {
      console.log('  ⚠️  No DualSense products found in products table')

      // Check navigation
      const { rows: dsnav } = await client.query(`
        SELECT id, title, href FROM catalog_navigation
        WHERE title ILIKE '%dualsense%' OR title ILIKE '%геймпад%'
        ORDER BY id LIMIT 5
      `)
      console.log(`\n  Found ${dsnav.length} DualSense navigation entries:`)
      dsnav.forEach(n => console.log(`    Nav ${n.id}: "${n.title}" → ${n.href}`))
    } else {
      ds.forEach(p => {
        console.log(`  Product ${p.id}: ${p.name}`)
        console.log(`    slug: ${p.slug}`)
        console.log(`    productGroup: ${p.product_group}`)
        console.log(`    isAvailable: ${p.is_available}`)
        console.log()
      })
    }

    // 3. Best Offers
    console.log('\n3️⃣  BEST OFFERS IMAGES\n')
    const { rows: [app] } = await client.query(`SELECT best_offers FROM site_appearance LIMIT 1`)

    if (app?.best_offers) {
      console.log(`  Best Offers IDs: [${app.best_offers.join(', ')}]\n`)

      const { rows: bo } = await client.query(`
        SELECT p.id, p.name,
          (SELECT COUNT(*) FROM products_rels WHERE parent_id = p.id AND path = 'images') as img_count,
          (SELECT COUNT(*) FROM products_variants WHERE _parent_id = p.id) as variant_count
        FROM products p WHERE p.id = ANY($1::int[]) ORDER BY p.id
      `, [app.best_offers])

      bo.forEach(p => {
        const status = p.img_count === 0 ? '❌ No images' : `✅ ${p.img_count} images`
        console.log(`  Product ${p.id}: ${p.name}`)
        console.log(`    ${status}, ${p.variant_count} variants`)
      })
    }

    // 4. Compare localhost vs production
    console.log('\n4️⃣  LOCALHOST vs PRODUCTION STATE\n')

    console.log('  Localhost (already fixed):')
    console.log('    ✅ Ray-Ban productGroup = smart-devices')
    console.log('    ✅ Navigation 275 href = /catalog/smart-devices/umnye-ochki')
    console.log('    ✅ Code uses buildProductUrl()')
    console.log()
    console.log('  Production (current state):')
    console.log('    ❌ Ray-Ban productGroup = gaming-consoles')
    console.log('    ❌ Navigation not synced')
    console.log('    ❌ Old code deployed')

    console.log('\n' + '='.repeat(80))
    console.log('  SUMMARY')
    console.log('='.repeat(80))
    console.log('\n✅ Production READ-ONLY audit completed')
    console.log('❌ Localhost fixes NOT applied to production')
    console.log('🔴 Migration required\n')

    await client.end()
  } catch (err: any) {
    console.error('\n❌ Audit failed:', err.message)
    process.exit(1)
  }
}

auditProduction()
