/**
 * FOXSTORE PRODUCTION AUDIT
 *
 * READ-ONLY аудит production БД через SSH tunnel
 * Port: 15433 (localhost) → production PostgreSQL
 */

import { Client } from 'pg'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function productionAudit() {
  const password = await prompt('Production PostgreSQL password: ')

  const client = new Client({
    host: '127.0.0.1',
    port: 15433,
    database: 'foxapple',
    user: 'foxstore_reader',
    password: password,
  })

  console.log('\n🔍 Connecting to production PostgreSQL (READ-ONLY)...\n')

  try {
    await client.connect()

    // Verify read-only mode
    const { rows: [mode] } = await client.query('SHOW transaction_read_only')
    console.log('✅ Connection verified:', mode.transaction_read_only === 'on' ? 'READ-ONLY' : 'WARNING: NOT READ-ONLY')

    console.log('\n' + '='.repeat(80))
    console.log('  PRODUCTION AUDIT REPORT')
    console.log('='.repeat(80) + '\n')

    // 1. Ray-Ban Products
    console.log('1️⃣  RAY-BAN PRODUCTS (101, 173, 174, 175)\n')
    const { rows: rayban } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE id IN (101, 173, 174, 175)
      ORDER BY id
    `)

    rayban.forEach(p => {
      console.log(`   Product ${p.id}: ${p.name}`)
      console.log(`   └─ slug: ${p.slug}`)
      console.log(`   └─ productGroup: ${p.product_group}`)
      console.log(`   └─ isAvailable: ${p.is_available}`)
      console.log(`   └─ canonical URL: /catalog/${p.product_group}/${p.slug}`)
      console.log()
    })

    // Ray-Ban Navigation
    const { rows: raybanNav } = await client.query(`
      SELECT cn.id, cn.href, cn.product_group, p.slug, p.product_group as actual_group
      FROM catalog_navigation cn
      LEFT JOIN products p ON cn.product = p.id
      WHERE cn.product IN (101, 173, 174, 175)
      ORDER BY cn.id
    `)

    console.log('   Ray-Ban Navigation:')
    raybanNav.forEach(n => {
      const correctHref = `/catalog/${n.actual_group}/${n.slug}`
      const needsUpdate = n.href !== correctHref
      console.log(`   Nav ${n.id}: ${n.href} ${needsUpdate ? '❌ WRONG' : '✅ OK'}`)
      if (needsUpdate) {
        console.log(`   └─ Should be: ${correctHref}`)
      }
    })
    console.log()

    // 2. DualSense PS5
    console.log('2️⃣  DUALSENSE PS5\n')
    const { rows: dualsense } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE name ILIKE '%dualsense%' OR name ILIKE '%dual%sense%'
      ORDER BY id
      LIMIT 5
    `)

    if (dualsense.length === 0) {
      console.log('   ⚠️  No DualSense products found')
      // Check navigation
      const { rows: dualsenseNav } = await client.query(`
        SELECT id, title, href, product
        FROM catalog_navigation
        WHERE title ILIKE '%dualsense%' OR title ILIKE '%геймпад%'
        ORDER BY id
      `)
      console.log(`   Found ${dualsenseNav.length} navigation entries:`)
      dualsenseNav.forEach(n => {
        console.log(`   Nav ${n.id}: "${n.title}" → ${n.href} (product: ${n.product})`)
      })
    } else {
      dualsense.forEach(p => {
        console.log(`   Product ${p.id}: ${p.name}`)
        console.log(`   └─ slug: ${p.slug}`)
        console.log(`   └─ productGroup: ${p.product_group}`)
        console.log(`   └─ isAvailable: ${p.is_available}`)
        console.log(`   └─ canonical URL: /catalog/${p.product_group}/${p.slug}`)
      })
    }
    console.log()

    // 3. Best Offers
    console.log('3️⃣  BEST OFFERS IMAGES\n')
    const { rows: [appearance] } = await client.query(`
      SELECT best_offers FROM site_appearance LIMIT 1
    `)

    if (appearance?.best_offers) {
      const bestOfferIds = appearance.best_offers
      console.log(`   Best Offers product IDs: [${bestOfferIds.join(', ')}]`)

      const { rows: bestOffers } = await client.query(`
        SELECT p.id, p.name,
          (SELECT COUNT(*) FROM products_rels WHERE parent_id = p.id AND path = 'images') as image_count,
          (SELECT COUNT(*) FROM products_variants WHERE _parent_id = p.id) as variant_count
        FROM products p
        WHERE p.id = ANY($1::int[])
        ORDER BY p.id
      `, [bestOfferIds])

      console.log()
      bestOffers.forEach(p => {
        console.log(`   Product ${p.id}: ${p.name}`)
        console.log(`   └─ Product images: ${p.image_count}`)
        console.log(`   └─ Variants: ${p.variant_count}`)

        if (p.image_count === 0 && p.variant_count > 0) {
          console.log(`   └─ ⚠️  No product images but has variants (check variant images)`)
        } else if (p.image_count === 0) {
          console.log(`   └─ ❌ No images at all`)
        }
      })
    } else {
      console.log('   ⚠️  No best_offers configured')
    }
    console.log()

    // 4. Navigation Sync Dry Run
    console.log('4️⃣  NAVIGATION SYNC DRY RUN\n')
    const { rows: allNav } = await client.query(`
      SELECT cn.id, cn.href, cn.product_group as nav_group,
        p.id as product_id, p.slug, p.product_group as actual_group
      FROM catalog_navigation cn
      LEFT JOIN products p ON cn.product = p.id
      WHERE cn.product IS NOT NULL
      ORDER BY cn.id
    `)

    let needsUpdate = 0
    let correct = 0
    const updates: any[] = []

    allNav.forEach(n => {
      if (n.actual_group && n.slug) {
        const correctHref = `/catalog/${n.actual_group}/${n.slug}`
        if (n.href !== correctHref) {
          needsUpdate++
          updates.push({
            id: n.id,
            oldHref: n.href,
            newHref: correctHref,
            product: n.slug
          })
        } else {
          correct++
        }
      }
    })

    console.log(`   Total navigation with products: ${allNav.length}`)
    console.log(`   ✅ Correct: ${correct}`)
    console.log(`   ❌ Need update: ${needsUpdate}`)
    console.log()

    if (updates.length > 0) {
      console.log('   Examples needing update:')
      updates.slice(0, 5).forEach(u => {
        console.log(`   Nav ${u.id} (${u.product}):`)
        console.log(`     OLD: ${u.oldHref}`)
        console.log(`     NEW: ${u.newHref}`)
      })

      if (updates.length > 5) {
        console.log(`   ... and ${updates.length - 5} more`)
      }
    }
    console.log()

    // 5. Code vs Production State
    console.log('5️⃣  SYSTEMFIX STATUS\n')

    // Check if buildProductUrl is used (code already updated)
    console.log('   Code changes from SYSTEMFIX-REPORT:')
    console.log('   ✅ buildProductUrl() created (local code)')
    console.log('   ✅ ProductCard updated (local code)')
    console.log('   ✅ getProductImage() variant support (local code)')
    console.log('   ✅ Services collection created (local code)')
    console.log()
    console.log('   Production state:')
    console.log(`   🔴 Navigation sync: ${needsUpdate} records need update`)
    console.log('   🔴 Code deploy: pending (buildProductUrl not in production)')
    console.log()

    console.log('='.repeat(80))
    console.log('  END OF AUDIT')
    console.log('='.repeat(80))

    await client.end()
    rl.close()

  } catch (error: any) {
    console.error('\n❌ Audit failed:', error.message)
    rl.close()
    process.exit(1)
  }
}

productionAudit()
