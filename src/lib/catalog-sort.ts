import type { CatalogSort, Product } from './types'
import { getCatalogPrice } from './pricing.ts'

export function sortCatalogProducts(products: Product[], sort: CatalogSort): Product[] {
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      if (sort === 'price_asc') return getCatalogPrice(a.product) - getCatalogPrice(b.product) || a.index - b.index
      if (sort === 'price_desc') return getCatalogPrice(b.product) - getCatalogPrice(a.product) || a.index - b.index
      if (sort === 'name') return a.product.name.localeCompare(b.product.name, 'ru') || a.index - b.index
      return a.index - b.index
    })
    .map(({ product }) => product)
}