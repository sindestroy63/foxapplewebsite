import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('admin labels remain valid UTF-8 Russian and contain no mojibake markers', () => {
  const files = [
    'src/payload/collections/Products.ts',
    'src/payload/products/device-type.ts',
    'src/payload/products/product-type.ts',
    'src/payload/products/variant-validation.ts',
    'src/payload/components/admin/DeviceTypeField.tsx',
    'src/payload/components/admin/ProductTypeField.tsx',
    'src/payload/components/admin/CatalogNavigationView.tsx',
  ]
  const text = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
  for (const label of ['Поколение / модель', 'Комплектация', 'Размер корпуса', 'Подключение', 'Новинка']) {
    assert.match(text, new RegExp(label.replace(/[ /]/g, '\\$&')))
  }
  assert.doesNotMatch(text, /Р[РС]|С[РС]|Ð|Ñ/)
})
