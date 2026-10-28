import type { Product } from './types'

export function isPlayStation5Console(product: Product): boolean {
  return product.productGroup === 'gaming-consoles' && /^(?:sony\s+)?playstation\s*5\b/i.test(product.name.trim())
}

export function playStationAccessories(product: Product, candidates: Product[]): Product[] {
  if (!isPlayStation5Console(product)) return []
  return candidates.filter((candidate) =>
    String(candidate.id) !== String(product.id) &&
    candidate.isAvailable !== false &&
    candidate.productGroup === 'gaming-consoles' &&
    !isPlayStation5Console(candidate) &&
    /^(?:Аксессуары для PS5|Геймпады PS5)$/i.test(candidate.productLine?.trim() || ''),
  )
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
