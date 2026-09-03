import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')

test('iPhone 17 Pro duplicate URL uses a read-only canonical alias', () => {
  assert.match(cms, /'iphone-17-pro-gwbejz': 'iphone-17-pro'/)
  assert.match(cms, /const resolvedSlug = readOnlyAlias\[productSlug\]/)
  assert.match(cms, /const slugCandidates = isAliased/)
  assert.match(cms, /Temporary read-only alias/) 
  assert.doesNotMatch(cms, /update\(.*slug|delete\(.*products|merge.*products/i)
})

test('alias keeps canonical product reads at depth 2 with variants', () => {
  assert.match(cms, /collection: 'products',[\s\S]*depth: 2,[\s\S]*limit: 1/)
  assert.match(cms, /return normalizeProduct\(matched\)/)
  assert.match(fs.readFileSync('src/lib/normalize.ts', 'utf8'), /variants: raw\.variants\?\.map\(nv\)/)
})
