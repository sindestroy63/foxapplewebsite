import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const view = fs.readFileSync('src/payload/components/admin/CatalogNavigationView.tsx', 'utf8')
const endpoint = fs.readFileSync('src/payload/brand-catalog-navigation-admin.ts', 'utf8')
const catalog = fs.readFileSync('src/app/(frontend)/catalog/page.tsx', 'utf8')
const header = fs.readFileSync('src/components/Header.tsx', 'utf8')

test('catalog navigation admin presents only the fixed brand structure', () => {
  for (const title of ['Apple', 'Samsung', 'Dyson', 'PlayStation', 'TRADE-IN']) assert.match(endpoint, new RegExp(title))
  assert.match(view, /brand-nav-grid/)
  assert.doesNotMatch(view, /items\.filter\(\(item\) => !\(typeof item\.parent/) 
  assert.match(view, /coverImage/)
})

test('catalog always renders six cards including independent Trade-in card', () => {
  assert.match(catalog, /brandNavigation\.map/)
  assert.match(catalog, /group\.title/)
  assert.match(catalog, /group\.href/)
})

test('header keeps separate Trade-in service and catalog links', () => {
  assert.match(header, /href: '\/trade-in', label: 'Trade-In'/)
  assert.match(endpoint, /\/trade-in\/catalog/)
})
