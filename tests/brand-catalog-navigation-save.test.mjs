import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const endpoint = fs.readFileSync('src/payload/brand-catalog-navigation-admin.ts', 'utf8')
const view = fs.readFileSync('src/payload/components/admin/CatalogNavigationView.tsx', 'utf8')

test('brand navigation PUT normalizes children and Media relationships', () => {
  assert.match(endpoint, /normalizeBrandCatalogGroups/)
  assert.match(endpoint, /Array\.isArray\(rawChildren\)/)
  assert.match(endpoint, /rawCover == null[\s\S]{0,80}\? null/)
  assert.match(endpoint, /data: \{ groups \}/)
  assert.doesNotMatch(endpoint, /Invalid child structure/)
})

test('brand navigation validation reports an exact field and reason', () => {
  assert.match(endpoint, /error instanceof StructureError \? error\.field/)
  assert.match(endpoint, /reason: error\.message/)
  assert.match(endpoint, /groups\[\$\{groupIndex\}\]\.children/)
})

test('root and child moves reorder only their own arrays and persist sortOrder', () => {
  assert.match(view, /if \(!parent\)/)
  assert.match(view, /const list = \[\.\.\.all\]/)
  assert.match(view, /group\.key !== parent/)
  assert.match(view, /children: children\.map/)
  assert.match(view, /sortOrder: groupIndex/)
  assert.match(view, /sortOrder: childIndex/)
})

test('save payload keeps strings, booleans, children and nullable cover IDs', () => {
  assert.match(view, /title: String\(group\.title\)/)
  assert.match(view, /isVisible: group\.isVisible !== false/)
  assert.match(view, /coverImage: coverId\(group\) \|\| null/)
  assert.match(view, /children: \(group\.children \|\| \[\]\)\.map/)
  assert.match(view, /saving \? 'Сохранение\.\.\.'/)
})
