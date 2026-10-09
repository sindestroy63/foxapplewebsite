import pg from 'pg'
import fs from 'fs'
import path from 'path'

const { Client } = pg

async function checkMediaFiles() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    // Check media records
    const { rows } = await client.query(`
      SELECT id, filename, url, mime_type
      FROM media
      WHERE filename LIKE '%ksry843989%'
      LIMIT 1
    `)

    console.log('=== Media Record ===')
    console.log(rows[0])

    // Check sample media records
    const { rows: samples } = await client.query(`
      SELECT id, filename, url
      FROM media
      ORDER BY id DESC
      LIMIT 5
    `)

    console.log('\n=== Sample Media Records ===')
    samples.forEach(r => console.log(r))

    // Check media directory
    const mediaDir = path.resolve(process.cwd(), 'media')
    console.log('\n=== Media Directory ===')
    console.log('Path:', mediaDir)
    console.log('Exists:', fs.existsSync(mediaDir))

    if (fs.existsSync(mediaDir)) {
      const files = fs.readdirSync(mediaDir)
      console.log('Files count:', files.length)
      console.log('First 5 files:', files.slice(0, 5))
    }

  } finally {
    await client.end()
  }
}

checkMediaFiles().catch(console.error)
