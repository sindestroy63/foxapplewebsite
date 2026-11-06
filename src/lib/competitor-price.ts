export type CompetitorPrice = { title: string; price: number }

const WITHOUT_WARRANTY = 'без расширенной гарантии'

function textOf(fragment: string): string {
  return fragment
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isAllowedCompetitorUrl(value: string): URL | null {
  const trimmed = value.trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol === 'http:') url.protocol = 'https:'
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  if (host !== 'repremium.ru' && !host.endsWith('.repremium.ru')) return null
  return url
}

export function parseRepremiumPrice(html: string): CompetitorPrice | null {
  const start = html.indexOf('product-price2__prnt')
  if (start === -1) return null
  const block = html.slice(start, start + 8000)
  const segments = block.split(/<div class="product-price2-base(?=["\s])/).slice(1)
  for (const segment of segments) {
    if (!textOf(segment).includes(WITHOUT_WARRANTY)) continue
    const value = segment.match(/product-price2__value">([\s\S]*?)<\/div>/)
    if (!value) continue
    const digits = textOf(value[1]).replace(/[^\d]/g, '')
    const price = Number(digits)
    if (!Number.isFinite(price) || price <= 0) continue
    const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || html.match(/<title>([\s\S]*?)<\/title>/)
    const title = heading ? textOf(heading[1]) : ''
    if (!title) return null
    return { title, price }
  }
  return null
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderCompetitorPricePage(item: CompetitorPrice, sourceUrl: string): string {
  const title = escapeHtml(item.title)
  const formatted = item.price.toLocaleString('ru-RU').replace(/\u00a0|\u202f/g, ' ')
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.title,
    url: sourceUrl,
    offers: { '@type': 'Offer', price: item.price, priceCurrency: 'RUB', availability: 'https://schema.org/InStock' },
  }).replace(/</g, '\\u003c')
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<title>${title}</title>
<meta property="product:price:amount" content="${item.price}">
<meta property="product:price:currency" content="RUB">
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<div itemscope itemtype="https://schema.org/Product">
<h1 itemprop="name">${title}</h1>
<div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
<meta itemprop="priceCurrency" content="RUB">
<link itemprop="availability" href="https://schema.org/InStock">
<div class="price"><span itemprop="price" content="${item.price}">${formatted}</span> ₽</div>
</div>
</div>
</body>
</html>
`
}
