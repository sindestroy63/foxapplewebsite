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

    console.log('═══ PRODUCTION SCHEMA DEEP AUDIT ═══\n')

    // 1. URL_REDIRECTS TABLE STRUCTURE
    console.log('🔄 URL_REDIRECTS TABLE STRUCTURE:')
    try {
      const redirectsSchema = await client.query(`
        SELECT
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length
        FROM information_schema.columns c
        WHERE c.table_name = 'url_redirects'
        ORDER BY c.ordinal_position
      `)
      console.table(redirectsSchema.rows)

      // Check constraints
      const constraints = await client.query(`
        SELECT
          con.conname as constraint_name,
          con.contype as constraint_type,
          pg_get_constraintdef(con.oid) as definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'url_redirects'
        ORDER BY con.contype, con.conname
      `)
      console.log('\nConstraints:')
      console.table(constraints.rows)

      // Check indexes
      const indexes = await client.query(`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary
        FROM pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = 'url_redirects'
        ORDER BY i.relname, a.attnum
      `)
      console.log('\nIndexes:')
      console.table(indexes.rows)

    } catch (e: any) {
      console.log(`❌ Cannot access url_redirects: ${e.message}`)
    }

    // 2. PRODUCTS TABLE - SLUG RELATED
    console.log('\n📦 PRODUCTS TABLE - SLUG & NAVIGATION:')
    const productsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name IN ('id', 'name', 'slug', 'product_group', 'brand', 'product_line', 'product_type', 'category')
      ORDER BY ordinal_position
    `)
    console.table(productsSchema.rows)

    // Check slug constraints
    const slugConstraints = await client.query(`
      SELECT
        con.conname,
        con.contype,
        pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'products'
        AND pg_get_constraintdef(con.oid) ILIKE '%slug%'
    `)
    console.log('\nSlug constraints:')
    console.table(slugConstraints.rows)

    // 3. CATALOG_NAVIGATION RELATED TABLES
    console.log('\n🗺️  CATALOG_NAVIGATION RELATIONSHIPS:')

    // Check if there's a separate product_line or category table
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%product%'
        OR table_name LIKE '%category%'
        OR table_name LIKE '%navigation%'
      ORDER BY table_name
    `)
    console.log('Related tables:')
    console.table(tables.rows)

    // 4. INSTAX DETAILED ANALYSIS
    console.log('\n📷 INSTAX DEEP ANALYSIS:')

    // Get all Instax data
    const instax = await client.query(`
      SELECT
        id, name, slug, product_group, brand, product_line, product_type,
        is_available, meta_title, meta_description
      FROM products
      WHERE name ILIKE '%instax%'
      ORDER BY id
    `)
    console.table(instax.rows)

    // Get GoPro for comparison
    const gopro = await client.query(`
      SELECT
        id, name, slug, product_group, brand, product_line, product_type,
        is_available
      FROM products
      WHERE name ILIKE '%gopro%'
    `)
    console.log('\nGoPro for comparison:')
    console.table(gopro.rows)

    // Check navigation for "other" category
    const otherNav = await client.query(`
      SELECT id, title, kind, product_group, brand, product_line, href, parent_id, stable_key
      FROM catalog_navigation
      WHERE product_group = 'other'
        OR title ILIKE '%другое%'
        OR title ILIKE '%other%'
      ORDER BY parent_id NULLS FIRST, sort_order, id
      LIMIT 20
    `)
    console.log('\n"Other" category navigation:')
    console.table(otherNav.rows)

    // 5. CHECK ALL 14 TARGET PRODUCTS
    console.log('\n🎯 ALL 14 TARGET PRODUCTS:')
    const targets = await client.query(`
      SELECT
        id, name, slug, product_group, brand, product_line,
        is_available,
        (SELECT COUNT(*) FROM catalog_navigation WHERE product_id = p.id) as nav_count
      FROM products p
      WHERE id IN (20, 51, 56, 57, 58, 60, 62, 63, 67, 69, 72, 78, 204, 205)
      ORDER BY id
    `)
    console.table(targets.rows)

    // 6. CHECK RAY-BAN & DUALSENSE (previously fixed)
    console.log('\n✅ PREVIOUSLY FIXED PRODUCTS (Ray-Ban + DualSense):')
    const previouslyFixed = await client.query(`
      SELECT
        id, name, slug, product_group,
        (SELECT COUNT(*) FROM catalog_navigation WHERE product_id = p.id) as nav_count
      FROM products p
      WHERE id IN (55, 101, 173, 174, 175)
      ORDER BY id
    `)
    console.table(previouslyFixed.rows)

    // 7. NAVIGATION FOR TARGET PRODUCTS
    console.log('\n🗺️  NAVIGATION FOR TARGET PRODUCTS:')
    const targetNav = await client.query(`
      SELECT
        cn.id as nav_id,
        cn.href,
        cn.stable_key,
        p.id as product_id,
        p.name,
        p.slug,
        p.product_group
      FROM catalog_navigation cn
      JOIN products p ON cn.product_id = p.id
      WHERE p.id IN (20, 51, 56, 57, 58, 60, 62, 63, 67, 69, 72, 78)
      ORDER BY p.id
    `)
    console.table(targetNav.rows)

    // 8. COUNT EXACT NAVIGATION MISMATCHES
    console.log('\n📊 NAVIGATION MISMATCH BREAKDOWN:')
    const mismatchBreakdown = await client.query(`
      SELECT
        CASE
          WHEN p.id IN (20, 51, 56, 57, 58, 60, 62, 63, 67, 69, 72, 78) THEN 'OUR_TARGETS'
          ELSE 'OTHER_PRODUCTS'
        END as category,
        COUNT(*) as count
      FROM catalog_navigation cn
      JOIN products p ON cn.product_id = p.id
      WHERE cn.href != '/catalog/' || p.product_group || '/' || p.slug
      GROUP BY category
    `)
    console.table(mismatchBreakdown.rows)

    console.log('\n✅ Deep audit complete')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
