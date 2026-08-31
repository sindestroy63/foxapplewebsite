import fs from 'node:fs'
import pg from 'pg'

const { Pool } = pg
const backupPath = process.env.CATALOG_CLEANUP_BACKUP
const confirmed = process.env.CLEANUP_APPLY_CONFIRM === 'YES'
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')
if (!backupPath || !fs.existsSync(backupPath)) throw new Error('CATALOG_CLEANUP_BACKUP must point to an existing local backup')

const pool = new Pool({ connectionString: databaseUrl })
const client = await pool.connect()
try {
  await client.query('BEGIN')
  const { rows } = await client.query(`
    SELECT v._parent_id AS product_id, v.id AS variant_id, s.value AS storage,
      p.name AS product_name, v.sku AS variant_sku
    FROM products_variants v
    JOIN storage_options s ON s.id = v.storage_id
    JOIN products p ON p.id = v._parent_id
    WHERE s.value IN ('8|128','8|256','12 | 256 ГБ','12 | 512 ГБ','12 | 1 ТБ','16 | 512 ГБ','16 | 1 TB','24 | 1 TB')
  `)
  if (!confirmed) {
    await client.query('ROLLBACK')
    console.log(JSON.stringify({ readOnly: true, candidateVariants: rows.length, backup: backupPath }))
    process.exitCode = 0
  } else {
    for (const row of rows) {
      const match = String(row.storage).replace(/\s+/gu, '').match(/^(\d+)\|(\d+)(GB|TB)?$/iu)
      if (!match) throw new Error(`Ambiguous storage value: ${row.storage}`)
      const ram = `${match[1]}GB`
      const storage = `${match[2]}${(match[3] || 'GB').toUpperCase()}`
      const storageResult = await client.query('SELECT id FROM storage_options WHERE value = $1 AND archived IS NOT TRUE', [storage])
      if (storageResult.rowCount !== 1) throw new Error(`Missing unique clean storage: ${storage}`)
      await client.query('UPDATE products_variants SET ram = $1, storage_id = $2 WHERE _parent_id = $3 AND id = $4', [ram, storageResult.rows[0].id, row.product_id, row.variant_id])
    }
    await client.query(`UPDATE storage_options s SET archived = TRUE WHERE s.archived IS NOT TRUE AND s.value = 'ПАМЯТЬ' AND NOT EXISTS (SELECT 1 FROM products_variants v WHERE v.storage_id = s.id) AND NOT EXISTS (SELECT 1 FROM device_models_rels r WHERE r.storage_options_id = s.id)`)
    await client.query('COMMIT')
    console.log(JSON.stringify({ applied: rows.length, backup: backupPath }))
  }
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
