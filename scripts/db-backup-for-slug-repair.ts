import pg from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'

const { Client } = pg

async function createBackup() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '-')

    // Backup products table (relevant columns only)
    const { rows: products } = await client.query(`
      SELECT id, name, slug, product_group, is_available, category_id
      FROM products
      WHERE id IN (78, 72, 70, 69, 67, 66, 63, 62, 60, 58, 57, 56, 55, 51, 49)
      ORDER BY id
    `)

    // Backup catalog_navigation (relevant entries)
    const { rows: navigation } = await client.query(`
      SELECT id, product_id, href, kind
      FROM catalog_navigation
      WHERE product_id IN (78, 72, 70, 69, 67, 66, 63, 62, 60, 58, 57, 56, 55, 51, 49)
      ORDER BY id
    `)

    const backup = {
      timestamp,
      database: 'localhost:5433/foxapple',
      purpose: 'pre-slug-repair-backup',
      products,
      navigation,
    }

    const backupPath = path.resolve(process.cwd(), 'backups', `slug-repair-backup-${timestamp}.json`)
    await fs.mkdir(path.dirname(backupPath), { recursive: true })
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2) + '\n', 'utf8')

    console.log(`✅ Backup created: ${backupPath}`)
    console.log(`   Products: ${products.length}`)
    console.log(`   Navigation: ${navigation.length}`)

  } finally {
    await client.end()
  }
}

createBackup().catch((error) => {
  console.error('❌ Backup failed:', error.message)
  process.exitCode = 1
})
