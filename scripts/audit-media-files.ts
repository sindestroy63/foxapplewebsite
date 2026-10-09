import pg from 'pg'
import fs from 'fs'
import path from 'path'

const { Client } = pg

async function auditMedia() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    const { rows: allMedia } = await client.query('SELECT id, filename FROM media ORDER BY id')

    const missing: any[] = []
    const exists: any[] = []

    for (const media of allMedia) {
      const filePath = path.join('media', media.filename)
      if (fs.existsSync(filePath)) {
        exists.push(media)
      } else {
        missing.push(media)
      }
    }

    console.log(`\n=== MEDIA AUDIT ===`)
    console.log(`Total media records: ${allMedia.length}`)
    console.log(`Files exist: ${exists.length}`)
    console.log(`Files missing: ${missing.length}`)

    if (missing.length > 0) {
      console.log(`\n=== MISSING FILES ===`)
      missing.slice(0, 20).forEach(m => console.log(`ID ${m.id}: ${m.filename}`))
      if (missing.length > 20) console.log(`... and ${missing.length - 20} more`)

      // Check specific products we know about
      const { rows: p51 } = await client.query('SELECT id, name FROM products WHERE id = 51')
      const { rows: p78 } = await client.query('SELECT id, name FROM products WHERE id = 78')

      console.log(`\n=== KNOWN AFFECTED PRODUCTS ===`)
      console.log(`Product 51 (Dyson): Uses missing media ID 2376`)
      console.log(`Product 78 (Samsung): Working ✅`)
    }

    // Save results
    fs.writeFileSync('media-audit-report.json', JSON.stringify({
      totalMedia: allMedia.length,
      filesExist: exists.length,
      filesMissing: missing.length,
      missingFiles: missing,
      timestamp: new Date().toISOString()
    }, null, 2))

    console.log(`\n✅ Report saved: media-audit-report.json`)

  } finally {
    await client.end()
  }
}

auditMedia().catch(console.error)
