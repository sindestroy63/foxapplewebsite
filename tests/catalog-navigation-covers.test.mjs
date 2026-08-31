import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const migration = fs.readFileSync('src/migrations/20260831_170000_catalog_navigation_cover_image.ts', 'utf8')
const card = fs.readFileSync('src/components/CatalogGroupCard.tsx', 'utf8')
const catalog = fs.readFileSync('src/app/(frontend)/catalog/page.tsx', 'utf8')
const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')

test('navigation covers use nullable Media relations and expected IDs', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "media_id" integer/)
  for (const id of [626, 443, 503, 689, 647, 666, 767, 1642, 686]) assert.match(migration, new RegExp(`group:[\\s\\S]{0,40}${id}`))
  assert.match(migration, /group:trade-in/) 
  assert.match(migration, /37/)
  assert.match(migration, /NOT EXISTS/)
})

test('catalog cards prefer navigation cover, then fallback asset, then placeholder', () => {
  assert.match(card, /getMediaUrl\(coverImage/)
  assert.match(card, /catalogGroupAssetUrl\(slug\)/)
  assert.match(card, /placeholder/)
  assert.match(cms, /coverImage: doc\.coverImage/)
  assert.match(catalog, /getCatalogRootGroups/)
  assert.match(catalog, /coverImage=\{group\.coverImage\}/)
})

test('Trade-in is represented as a tenth catalog root and has an empty state', () => {
  assert.match(cms, /slug: 'trade-in'/)
  assert.match(fs.readFileSync('src/components/GroupCatalogPage.tsx', 'utf8'), /Сейчас в разделе Trade-in нет доступных товаров/)
})
