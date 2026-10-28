import type { Product } from './types'

type RecommendationCategory = 'ps5' | 'ipad' | 'iphone' | 'macbook'

export function recommendationCategory(product: Product): RecommendationCategory | null {
  const name = product.name.trim()
  if (product.productGroup === 'gaming-consoles' && /^(?:sony\s+)?playstation\s*5\b/i.test(name)) return 'ps5'
  if (product.productGroup === 'tablets' && /^(?:apple\s+)?ipad\b/i.test(name)) return 'ipad'
  if (product.productGroup === 'smartphones' && /^(?:apple\s+)?iphone\b/i.test(name)) return 'iphone'
  if (product.productGroup === 'laptops' && /^(?:apple\s+)?macbook\b/i.test(name)) return 'macbook'
  return null
}

export function recommendedAccessories(product: Product, candidates: Product[]): Product[] {
  const category = recommendationCategory(product)
  if (!category) return []
  return candidates.filter((candidate) => {
    if (String(candidate.id) === String(product.id) || candidate.isAvailable === false) return false
    const name = candidate.name.trim()
    if (category === 'ps5') {
      return candidate.productGroup === 'gaming-consoles' &&
        recommendationCategory(candidate) !== 'ps5' &&
        /^(?:Аксессуары для PS5|Геймпады PS5)$/i.test(candidate.productLine?.trim() || '')
    }
    if (!['other', 'accessories', 'home-appliances'].includes(candidate.productGroup || '')) return false
    if (category === 'ipad') return /^apple\s+pencil\b/i.test(name)
    if (category === 'macbook') return /^(?:apple\s+)?magic\s+mouse\b/i.test(name)
    const appleCharger = candidate.brand?.trim().toLowerCase() === 'apple' &&
      /(?:зарядное\s+устройство|адаптер\s+питания|power\s+adapter)/i.test(name)
    const powerBank = /(?:повербанк|пауэрбанк|power\s*bank|внешний\s+аккумулятор)/i.test(name)
    const screenProtector = /^защитное\s+стекло(?:\s|$)/i.test(name) &&
      !/(?:ipad|galaxy|samsung|xiaomi|pixel)/i.test(name)
    return appleCharger || powerBank || screenProtector
  })
}

export type RecommendedProduct = {
  id: string
  name: string
  href: string
  image: string | null
  imageAlt: string
  price: number
  status: Product['status']
}
