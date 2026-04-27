import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import pg from 'pg'

const { Client } = pg

function run(command) {
  execSync(command, {
    cwd: '/app',
    env: process.env,
    stdio: 'inherit',
  })
}

async function inspectDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  await client.connect()

  try {
    const { rows } = await client.query(`
      SELECT
        to_regclass('public.payload_migrations')::text AS payload_migrations,
        to_regclass('public.site_settings')::text AS site_settings
    `)

    const result = rows[0] || {}
    const hasMigrationsTable = Boolean(result.payload_migrations)
    const hasSiteSettingsTable = Boolean(result.site_settings)

    let migrationCount = 0

    if (hasMigrationsTable) {
      const countResult = await client.query('SELECT COUNT(*)::int AS count FROM payload_migrations')
      migrationCount = countResult.rows[0]?.count || 0
    }

    return {
      hasMigrationsTable,
      hasSiteSettingsTable,
      migrationCount,
      client,
    }
  } catch (error) {
    await client.end()
    throw error
  }
}

async function markExistingMigrations(client) {
  const migrationsDir = '/app/src/migrations'
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
    .map((file) => path.basename(file, '.ts'))
    .sort()

  for (const name of files) {
    await client.query(
      `
        INSERT INTO payload_migrations (name, batch, updated_at, created_at)
        SELECT $1, 1, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM payload_migrations WHERE name = $1
        )
      `,
      [name],
    )
  }
}

async function main() {
  if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
    const state = await inspectDatabase()

    try {
      if (!state.hasSiteSettingsTable) {
        run('npm run payload -- migrate')
      } else if (state.hasMigrationsTable && state.migrationCount === 0) {
        console.log('Schema already exists without payload_migrations records, marking current migrations as applied.')
        await markExistingMigrations(state.client)
      } else if (!state.hasMigrationsTable) {
        console.log('Schema already exists and payload_migrations table is missing, skipping migrations.')
      } else {
        run('npm run payload -- migrate')
      }
    } finally {
      await state.client.end()
    }
  }

  if (process.env.PAYLOAD_SEED_ON_START === 'true') {
    run('npm run seed')
  }

  run('npm run start')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
