import pg from 'pg'

const { Client } = pg

async function diagnose() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    console.log('=== DATABASE VERIFICATION ===\n')

    // Check Product 78
    const { rows: p78 } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE id = 78
    `)
    console.log('Product 78:', p78[0])

    // Check Product 51
    const { rows: p51 } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE id = 51
    `)
    console.log('Product 51:', p51[0])

    // Check a working iPhone product
    const { rows: iphone } = await client.query(`
      SELECT id, name, slug, product_group, is_available
      FROM products
      WHERE name ILIKE '%iPhone%' AND is_available = true
      LIMIT 1
    `)
    console.log('Sample iPhone:', iphone[0])

    console.log('\n=== NAVIGATION ENTRIES ===\n')

    // Navigation for Product 78
    const { rows: nav78 } = await client.query(`
      SELECT id, product_id, href, kind
      FROM catalog_navigation
      WHERE product_id = 78
    `)
    console.log('Navigation for Product 78:', nav78)

    // Navigation for Product 51
    const { rows: nav51 } = await client.query(`
      SELECT id, product_id, href, kind
      FROM catalog_navigation
      WHERE product_id = 51
    `)
    console.log('Navigation for Product 51:', nav51)

  } finally {
    await client.end()
  }
}

diagnose().catch(console.error)
