import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const config = fs.readFileSync('src/payload.config.ts', 'utf8')
const endpoint = fs.readFileSync('src/payload/trade-in-admin.ts', 'utf8')
const view = fs.readFileSync('src/payload/components/admin/TradeInView.tsx', 'utf8')
const form = fs.readFileSync('src/payload/components/admin/TradeInForm.tsx', 'utf8')
const styles = fs.readFileSync('src/payload/components/admin/TradeInView.module.css', 'utf8')
const nav = fs.readFileSync('src/payload/components/admin/TradeInNavLink.tsx', 'utf8')
const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')
const placement = fs.readFileSync('src/payload/components/admin/ProductCatalogPlacement.tsx', 'utf8')

test('Trade-in is a protected Products view, not a separate collection', () => {
  assert.match(config, /tradeIn: \{[\s\S]*?path: '\/trade-in'/)
  assert.match(config, /tradeInAdminEndpoints/)
  assert.match(endpoint, /collection: 'products'/)
  assert.match(endpoint, /productGroup: 'trade-in'/)
  assert.match(endpoint, /condition: 'used'/)
  assert.doesNotMatch(config, /TradeInProducts|TradeInCollection/)
})

test('Trade-in list and editor are available to every full admin role', () => {
  assert.match(endpoint, /hasFullAdminAccess/)
  assert.match(endpoint, /method: 'delete'/)
  assert.match(nav, /hasFullAdminAccess/)
  assert.match(products, /update: admins/)
  assert.doesNotMatch(products, /Trade-in товары доступны только admin/)
})

test('Trade-in form sets technical state directly without catalog placement or navigation writes', () => {
  assert.match(view, /fetch\('\/api\/trade-in-products'/)
  assert.match(view, /composeProductSlug\(name, suffix\)/)
  assert.match(view, /if \(current\.id\) return \{ \.\.\.current, name \}/)
  assert.doesNotMatch(view, /catalog-placement|catalog-navigation/)
  assert.match(placement, /Trade-in/)
})

test('create and edit share the focused Trade-in form with a stable slug preview', () => {
  assert.match(view, /import TradeInForm/)
  assert.match(view, /<TradeInForm/)
  assert.match(form, /Добавить Trade-in товар/)
  assert.match(form, /Редактирование Trade-in товара/)
  assert.match(form, /onChange=\{\(event\) => onNameChange\(event\.target\.value\)\}/)
  assert.match(form, /readOnly aria-readonly="true" value=\{form\.slug\}/)
  assert.match(view, /if \(current\.id\) return \{ \.\.\.current, name \}/)
})

test('media selection preserves Product media IDs without the raw checkbox wall', () => {
  assert.match(form, /images: form\.images\.includes\(id\) \? form\.images\.filter/)
  assert.match(form, /selectedMedia\.map/)
  assert.match(form, /Выбрать фото/)
  assert.match(form, /Удалить/)
  assert.doesNotMatch(form, /media\.map\(\(image\) => <label[\s\S]*?type="checkbox"/)
})

test('form keeps Save action visible and returns to the Trade-in list after success', () => {
  assert.match(form, /Сохранить/)
  assert.match(styles, /position: sticky/)
  assert.match(view, /setForm\(null\)\s*await load\(\)/)
})
