import config from '../src/payload.config'
import { getPayload } from 'payload'

const groups = [
  { title: 'APPLE', key: 'apple', href: '/catalog?brand=Apple', filter: 'brand=Apple' },
  { title: 'SAMSUNG', key: 'samsung', href: '/catalog?brand=Samsung', filter: 'brand=Samsung' },
  { title: 'DYSON', key: 'dyson', href: '/catalog?brand=Dyson', filter: 'brand=Dyson' },
  { title: 'PLAYSTATION', key: 'playstation', href: '/catalog?group=gaming-consoles&brand=Sony', filter: 'group=gaming-consoles&brand=Sony' },
  { title: 'ДРУГОЕ', key: 'other', href: '/catalog?group=other', filter: 'group=other' },
  { title: 'TRADE-IN', key: 'trade-in', href: '/trade-in/catalog', filter: '' },
].map((group, sortOrder) => ({ ...group, sortOrder, isVisible: true, coverImage: null, children: [] }))

const payload = await getPayload({ config })
await payload.updateGlobal({ slug: 'brand-catalog-navigation', data: { groups } })
console.log('Seeded brand-catalog-navigation')
