import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('storage options list defaults to active records', () => {
  const source = fs.readFileSync('src/payload/collections/StorageOptions.ts', 'utf8')
  assert.match(source, /baseFilter:\s*\(\{\s*req\s*\}\)\s*=>/)
  assert.match(source, /archived:\s*\{\s*not_equals:\s*true\s*\}/)
  assert.match(source, /defaultColumns: \['value', 'archived', 'sortOrder'\]/)
})

test('clean storage values remain active and archived values are excluded by default', () => {
  const clean = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB']
  const archived = ['8|256', '47mm', '40mm LTE']
  assert.equal(clean.length, 6)
  assert.equal(archived.length, 3)
})

test('watch sizes use the dedicated DeviceModels relationship', () => {
  const source = fs.readFileSync('src/payload/collections/DeviceModels.ts', 'utf8')
  assert.match(source, /name: 'availableSizes'/)
  assert.match(source, /relationTo: 'variant-size-options'/)
  assert.match(source, /hasMany: true/)
})

test('VariantGenerator uses availableSizes for watch models', () => {
  const source = fs.readFileSync('src/payload/components/admin/VariantGenerator.tsx', 'utf8')
  assert.match(source, /availableSizes\?: SizeDoc\[\]/)
  assert.match(source, /model\.storageIsSize \? sizes : storages/)
  assert.match(source, /size: size\?\.value/)
})
