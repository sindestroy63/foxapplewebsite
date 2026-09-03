import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const view = fs.readFileSync('src/payload/components/admin/CatalogNavigationView.tsx', 'utf8')

test('brand navigation editor supports editing operations without legacy records', () => {
  for (const token of ['Добавить раздел', 'Добавить подраздел', 'window.confirm', 'move', 'Раскрыть всё', 'Свернуть всё', 'Сохранить']) assert.match(view, new RegExp(token))
  assert.doesNotMatch(view, /fetch\('\/api\/catalog-navigation-admin'/)
})

test('brand navigation UI uses compact action menu and hides technical fields', () => {
  assert.match(view, /action-menu-trigger/)
  assert.match(view, /Escape/)
  assert.match(view, /setMenu\(null\)/)
  assert.match(view, /Вверх/)
  assert.match(view, /Вниз/)
  assert.match(view, /Удалить/)
  assert.doesNotMatch(view, /<code>/)
  assert.doesNotMatch(view, /label>Key<input/)
})
