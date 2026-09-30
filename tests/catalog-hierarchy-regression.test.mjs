import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')
const page = fs.readFileSync('src/app/(frontend)/catalog/page.tsx', 'utf8')

test('brand roots with CMS children render subsection cards before product loading', () => {
  assert.match(page, /findBrandNavigationRoot\(brandNavigation, filters\)/)
  assert.match(page, /brandRoot && brandChildren\.length > 0 && !filters\.placement/)
  assert.match(page, /brandChildren\.map\(\(child\) => <CatalogGroupCard/)
  assert.ok(page.indexOf('brandRoot && brandChildren.length') < page.indexOf('if (filters.placement)'))
})

test('terminal CMS child filtering excludes products assigned to a more specific sibling', () => {
  assert.match(cms, /filterProductsForNavigationChild\(products, placementChildren, placementChild\)/)
  assert.match(cms, /specificity\(child\) === Math\.max\(\.\.\.matches\.map\(specificity\)\)/)
  assert.match(cms, /directIds\.has\(String\(product\.id\)\)/)
})

test('root and child state remain URL-driven and do not auto-select a subsection', () => {
  assert.match(page, /!filters\.placement/)
  assert.match(page, /filters\.placement\)/)
  assert.doesNotMatch(page, /children\[0\]/)
})

test('public root aliases resolve through the CMS group key without a brand-specific branch', () => {
  assert.match(cms, /params\.brand\?\.toLowerCase\(\) === group\.key\.toLowerCase\(\)/)
  assert.doesNotMatch(page, /filters\.brand\s*===?\s*['"](?:PlayStation|Other|other)['"]/i)
})