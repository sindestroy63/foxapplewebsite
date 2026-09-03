import config from '../src/payload.config'
import { getPayload } from 'payload'

type SeedItem = {
  title: string
  key: string
  href: string
  filter: Record<string, string> | null
  sortOrder: number
  isVisible: boolean
  coverImage: null
  children?: SeedItem[]
}

const child = (title: string, key: string, filter: Record<string, string> | null, sortOrder: number): SeedItem => ({
  title, key, href: filter ? `/catalog?${new URLSearchParams(filter).toString()}` : '/catalog', filter, sortOrder, isVisible: true, coverImage: null,
})
const group = (title: string, key: string, filter: Record<string, string> | null, sortOrder: number, children: SeedItem[] = []): SeedItem => ({
  title, key, href: key === 'trade-in' ? '/trade-in/catalog' : filter ? `/catalog?${new URLSearchParams(filter).toString()}` : '/catalog', filter, sortOrder, isVisible: true, coverImage: null, children,
})

const defaults: SeedItem[] = [
  group('APPLE', 'apple', { brand: 'Apple' }, 0, [
    child('iPhone', 'iphone', { group: 'smartphones', brand: 'Apple' }, 0), child('iPad', 'ipad', { group: 'tablets', brand: 'Apple' }, 1), child('Apple Watch', 'apple-watch', { group: 'smart-watches', brand: 'Apple' }, 2), child('Apple AirPods', 'apple-airpods', { group: 'audio', brand: 'Apple' }, 3), child('MacBook', 'macbook', { group: 'laptops', brand: 'Apple' }, 4), child('Apple Mac', 'apple-mac', { group: 'laptops', brand: 'Apple', line: 'Apple Mac' }, 5), child('Аксессуары Apple', 'apple-accessories', { group: 'other', appleAccessories: '1' }, 6),
  ]),
  group('SAMSUNG', 'samsung', { brand: 'Samsung' }, 1, [
    child('Смартфоны', 'samsung-smartphones', { group: 'smartphones', brand: 'Samsung' }, 0), child('Планшеты', 'samsung-tablets', { group: 'tablets', brand: 'Samsung' }, 1), child('Часы', 'samsung-watches', { group: 'smart-watches', brand: 'Samsung' }, 2), child('Наушники', 'samsung-audio', { group: 'audio', brand: 'Samsung' }, 3),
  ]),
  group('DYSON', 'dyson', { brand: 'Dyson' }, 2, [
    child('Фены Dyson', 'dyson-hair-dryers', { group: 'home-appliances', brand: 'Dyson', line: 'Фен Dyson' }, 0), child('Стайлеры Dyson', 'dyson-stylers', { group: 'home-appliances', brand: 'Dyson', line: 'Стайлеры Dyson' }, 1), child('Выпрямители Dyson', 'dyson-straighteners', { group: 'home-appliances', brand: 'Dyson', line: 'Выпрямитель Dyson' }, 2), child('Очистители Dyson', 'dyson-purifiers', { group: 'home-appliances', brand: 'Dyson', line: 'Очистители Dyson' }, 3), child('Пылесосы Dyson', 'dyson-vacuums', { group: 'home-appliances', brand: 'Dyson', line: 'Пылесосы Dyson' }, 4),
  ]),
  group('PLAYSTATION', 'playstation', { group: 'gaming-consoles', brand: 'Sony' }, 3, [
    child('PlayStation 5', 'playstation-5', { group: 'gaming-consoles', brand: 'Sony' }, 0), child('Геймпады PS5', 'gamepads-ps5', { group: 'gaming-consoles', brand: 'Sony', line: 'Геймпады PS5' }, 1),
  ]),
  group('ДРУГОЕ', 'other', { group: 'other' }, 4, [
    child('Marshall', 'other-marshall', { group: 'audio', brand: 'Marshall' }, 0), child('GoPro', 'other-gopro', { group: 'other', q: 'GoPro' }, 1), child('Защитные стёкла', 'other-screen-protectors', { group: 'other', q: 'Защитное стекло' }, 2),
  ]),
  group('TRADE-IN', 'trade-in', null, 5),
]

const mergeItem = (existing: any, fallback: SeedItem, sortOrder: number): any => {
  const merged: any = { ...fallback, ...existing, title: existing?.title ?? fallback.title, key: existing?.key ?? fallback.key, href: existing?.href ?? fallback.href, filter: existing?.filter ?? fallback.filter, sortOrder: existing?.sortOrder ?? sortOrder, isVisible: existing?.isVisible ?? true, coverImage: existing?.coverImage ?? null }
  const currentChildren = Array.isArray(existing?.children) ? existing.children : []
  const fallbackChildren = fallback.children
  if (fallbackChildren) {
    const byKey = new Map(currentChildren.map((item: any) => [String(item.key), item]))
    merged.children = fallbackChildren.map((item) => mergeItem(byKey.get(item.key), item, item.sortOrder))
    currentChildren.forEach((item: any) => { if (!fallbackChildren.some((known) => known.key === item.key)) merged.children.push(item) })
  } else merged.children = []
  return merged
}

const payload = await getPayload({ config })
const current = await payload.findGlobal({ slug: 'brand-catalog-navigation', depth: 0 }) as any
const existingGroups = Array.isArray(current?.groups) ? current.groups : []
const existingByKey = new Map(existingGroups.map((item: any) => [String(item.key), item]))
const groups = defaults.map((item) => mergeItem(existingByKey.get(item.key), item, item.sortOrder))
existingGroups.forEach((item: any) => { if (!defaults.some((known) => known.key === item.key)) groups.push(item) })
await payload.updateGlobal({ slug: 'brand-catalog-navigation', data: { groups } })
console.log('Seeded brand-catalog-navigation (idempotent merge)')
