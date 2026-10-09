import pg from 'pg'

const { Client } = pg

async function testConnection() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    console.log('🔍 Testing PostgreSQL connection...\n')

    await client.connect()

    // Test 1: Database version
    const versionResult = await client.query('SELECT version()')
    console.log('✅ Database version:')
    console.log(versionResult.rows[0]?.version || 'Unknown')
    console.log()

    // Test 2: Current database and user
    const dbInfoResult = await client.query(
      'SELECT current_database(), current_user, inet_server_addr(), inet_server_port()'
    )
    const dbInfo = dbInfoResult.rows[0]
    console.log('✅ Connection info:')
    console.log(`  Database: ${dbInfo?.current_database}`)
    console.log(`  User: ${dbInfo?.current_user}`)
    console.log(`  Server: ${dbInfo?.inet_server_addr}:${dbInfo?.inet_server_port}`)
    console.log()

    // Test 3: Table count
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `)
    console.log(`✅ Tables in public schema: ${tablesResult.rows[0]?.count}`)
    console.log()

    // Test 4: Main collections row counts
    const collections = ['products', 'categories', 'product_groups', 'users', 'media', 'catalog_navigation']
    console.log('✅ Collection row counts:')
    for (const table of collections) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`)
        console.log(`  ${table}: ${countResult.rows[0]?.count}`)
      } catch (err) {
        console.log(`  ${table}: (table not found)`)
      }
    }

    console.log('\n✅ PostgreSQL connection test completed successfully')
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

testConnection()
