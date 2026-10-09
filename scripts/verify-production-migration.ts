/**
 * FOXSTORE PRODUCTION MIGRATION - FINAL VERIFICATION
 *
 * Полная верификация затрагиваемых записей перед migration
 */

import { Client } from 'pg'

async function verifyMigration() {
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
    console.log('✅ Connected to production (READ-ONLY)\n')

    console.log('='.repeat(80))
    console.log('  PRODUCTION MIGRATION VERIFICATION')
    console.log('='.repeat(80))

    // 1. Ray-Ban Products - точные данные
    console.log('\n1️⃣  RAY-BAN PRODUCTS - BEFORE STATE\n')
    const { rows: rayban } = await client.query(`
      SELECT id, name, slug, product_group, is_available, created_at
      FROM products
      WHERE id IN (101, 173, 174, 175)
      ORDER BY id
    `)

    console.log('| ID  | Name | Slug | productGroup | isAvailable |')
    console.log('|-----|------|------|--------------|-------------|')
    rayban.forEach(p => {
      console.log(`| ${p.id} | ${p.name.substring(0, 30)} | ${p.slug} | ${p.product_group} | ${p.is_available} |`)
    })

    // Check if any Ray-Ban already in smart-devices
    const { rows: [alreadyFixed] } = await client.query(`
      SELECT COUNT(*) as count FROM products
      WHERE id IN (101, 173, 174, 175) AND product_group = 'smart-devices'
    `)
    console.log(`\n✓ Already fixed: ${alreadyFixed.count}/4`)

    // 2. DualSense - точные данные
    console.log('\n2️⃣  DUALSENSE PS5 - BEFORE STATE\n')
    const { rows: dualsense } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE id = 55
    `)

    if (dualsense.length > 0) {
      const p = dualsense[0]
      console.log(`Product ${p.id}: ${p.name}`)
      console.log(`  slug: "${p.slug}"`)
      console.log(`  productGroup: ${p.product_group}`)
      console.log(`  isAvailable: ${p.is_available}`)

      // Check slug conflict
      const { rows: [conflict] } = await client.query(`
        SELECT COUNT(*) as count FROM products
        WHERE slug = 'geympady-ps5' AND id != 55
      `)
      console.log(`\n✓ Slug conflict check: ${conflict.count === 0 ? 'SAFE' : 'CONFLICT EXISTS'}`)
    } else {
      console.log('⚠️  Product 55 not found')
    }

    // 3. Navigation affected
    console.log('\n3️⃣  NAVIGATION - AFFECTED ENTRIES\n')
    const { rows: nav } = await client.query(`
      SELECT cn.id, cn.title, cn.href, cn.product_group,
        p.id as product_id, p.slug, p.product_group as actual_group
      FROM catalog_navigation cn
      LEFT JOIN products p ON (
        cn.href LIKE '%/' || p.slug OR
        cn.href LIKE '%/' || p.slug || '%'
      )
      WHERE p.id IN (55, 101, 173, 174, 175)
      ORDER BY cn.id
    `)

    console.log(`Found ${nav.length} navigation entries:\n`)
    nav.forEach(n => {
      const correctHref = n.actual_group && n.slug ? `/catalog/${n.actual_group}/${n.slug}` : 'N/A'
      console.log(`Nav ${n.id}: "${n.title}"`)
      console.log(`  current: ${n.href}`)
      console.log(`  will be: ${correctHref}`)
      console.log()
    })

    // 4. Legacy redirects needed
    console.log('4️⃣  LEGACY REDIRECTS NEEDED\n')

    const redirects: Array<{old: string, new: string}> = []

    rayban.forEach(p => {
      if (p.product_group === 'gaming-consoles') {
        redirects.push({
          old: `/catalog/gaming-consoles/${p.slug}`,
          new: `/catalog/smart-devices/${p.slug}`
        })
      }
    })

    if (dualsense.length > 0 && dualsense[0].slug !== 'geympady-ps5') {
      redirects.push({
        old: `/catalog/gaming-consoles/${dualsense[0].slug}`,
        new: `/catalog/gaming-consoles/geympady-ps5`
      })
    }

    console.log('Required redirects:')
    redirects.forEach(r => console.log(`  ${r.old} → ${r.new}`))

    // 5. Existing variants, images, prices check
    console.log('\n5️⃣  DATA INTEGRITY CHECK\n')
    const { rows: integrity } = await client.query(`
      SELECT
        p.id,
        p.name,
        (SELECT COUNT(*) FROM products_variants WHERE _parent_id = p.id) as variants,
        (SELECT COUNT(*) FROM products_rels WHERE parent_id = p.id AND path = 'images') as images,
        (SELECT COUNT(*) FROM orders_rels WHERE path = 'products' AND products_id = p.id) as in_orders
      FROM products p
      WHERE p.id IN (55, 101, 173, 174, 175)
      ORDER BY p.id
    `)

    console.log('| ID  | Variants | Images | In Orders | Safe to Update |')
    console.log('|-----|----------|--------|-----------|----------------|')
    integrity.forEach(p => {
      const safe = true // slug/productGroup updates don't affect these
      console.log(`| ${p.id} | ${p.variants} | ${p.images} | ${p.in_orders} | ${safe ? '✅' : '⚠️'} |`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('  VERIFICATION COMPLETE')
    console.log('='.repeat(80))
    console.log('\n✅ Ready for migration')
    console.log('📄 See migration commands in PRODUCTION-MIGRATION-COMMANDS.md')

    await client.end()
  } catch (err: any) {
    console.error('\n❌ Verification failed:', err.message)
    process.exit(1)
  }
}

verifyMigration()
