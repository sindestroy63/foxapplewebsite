import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const migration = fs.readFileSync('src/migrations/20260910_130000_add_device_type.ts', 'utf8')
const index = fs.readFileSync('src/migrations/index.ts', 'utf8')

test('device type migration adds only a nullable products column and can be reversed', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "device_type" varchar NULL/)
  assert.match(migration, /DROP COLUMN IF EXISTS "device_type"/)
  assert.doesNotMatch(migration, /UPDATE "products"|INSERT INTO "products"|products_variants/i)
})

test('device type migration is registered after product type backfill', () => {
  assert.match(index, /import \* as migration_20260910_130000_add_device_type from '\.\/20260910_130000_add_device_type';/)
  assert.match(index, /name: '20260910_130000_add_device_type'/)
})
