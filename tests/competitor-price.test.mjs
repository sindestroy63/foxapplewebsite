import test from 'node:test'
import assert from 'node:assert/strict'

const { parseRepremiumPrice, isAllowedCompetitorUrl, renderCompetitorPricePage } = await import('../src/lib/competitor-price.ts')

const page = (blocks) => `<html><head><title>Смартфон Apple iPhone 18 Pro 256 ГБ голубой купить в Новосибирске</title></head><body>
<h1 class="product-title">Смартфон Apple iPhone 18 Pro 256 ГБ голубой</h1>
<div class="product-price2__prnt"><div class="product-price2">${blocks}</div></div></body></html>`

const block = (value, text, grey = false) => `<div class="product-price2-base${grey ? ' product-price2-base_grey' : ''}">
<div class="product-price2-base__info"><div class="product-price2__value">
   ${value} ₽
</div><div class="homepage2-products-slide-price-old">1 ₽</div></div>
<div class="product-price2-base__text">${text}</div></div>`

test('takes the price labelled without extended warranty, not the first one', () => {
  const html = page(block('97 390', 'При оформлении расширенной гарантии') + block('107&nbsp;890', 'При покупке без расширенной гарантии', true))
  assert.deepEqual(parseRepremiumPrice(html), { title: 'Смартфон Apple iPhone 18 Pro 256 ГБ голубой', price: 107890 })
})

test('does not guess when the labelled price is missing', () => {
  assert.equal(parseRepremiumPrice(page(block('97 390', 'При оформлении расширенной гарантии'))), null)
  assert.equal(parseRepremiumPrice('<html><h1>x</h1></html>'), null)
})

test('only https repremium.ru hosts are fetched', () => {
  assert.ok(isAllowedCompetitorUrl('https://repremium.ru/catalog/a/'))
  assert.ok(isAllowedCompetitorUrl('https://klg.repremium.ru/catalog/a/'))
  assert.equal(isAllowedCompetitorUrl('http://repremium.ru/catalog/a/'), null)
  assert.equal(isAllowedCompetitorUrl('https://repremium.ru.evil.com/a'), null)
  assert.equal(isAllowedCompetitorUrl('https://evil.com/repremium.ru'), null)
  assert.equal(isAllowedCompetitorUrl('not a url'), null)
})

test('rendered page exposes a single machine-readable price', () => {
  const out = renderCompetitorPricePage({ title: 'A <b> & "B"', price: 107890 }, 'https://repremium.ru/x/')
  assert.match(out, /itemprop="price" content="107890"/)
  assert.match(out, /"price":107890/)
  assert.doesNotMatch(out, /<b>/)
})
