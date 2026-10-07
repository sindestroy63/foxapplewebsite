import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')

test('product reads use the canonical URL guard without mutating CMS data', () => {
  assert.match(cms, /export async function getProductBySlugs\(categorySlug: string, productSlug: string\)/)
  assert.match(cms, /const slugCandidates = \[\.\.\.new Set\(\[productSlug, decodedSlug, decodedSlug\.trim\(\)\]\)\]/)
  assert.match(cms, /productCanonicalUrl\(matched\)\?\.startsWith\(`\/catalog\/\$\{categorySlug\}\/`\)/)
  assert.match(cms, /: null/)
  assert.doesNotMatch(cms, /update\(.*slug|delete\(.*products|merge.*products/i)
})

test('alias keeps canonical product reads at depth 2 with variants', () => {
  assert.match(cms, /collection: 'products',[\s\S]*depth: 2,[\s\S]*limit: 1/)
  assert.match(fs.readFileSync('src/lib/normalize.ts', 'utf8'), /variants: raw\.variants\?\.map\(nv\)/)
})
