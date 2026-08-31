import type { CatalogGroupDefinition } from '@/lib/catalog-groups'
import type { Product } from '@/lib/types'
import Link from 'next/link'
import { CategoryCatalogClient } from './CategoryCatalogClient'

export default function GroupCatalogPage({ group, products, phone, brands: suppliedBrands }: { group: CatalogGroupDefinition; products: Product[]; phone?: string; brands?: string[] }) {
  const brands = suppliedBrands || [...new Set(products.map((product) => product.brand?.trim()).filter((brand): brand is string => Boolean(brand)))].sort((a, b) => a.localeCompare(b, 'ru'))
  if (group.slug === 'trade-in' && products.length === 0) {
    return <section className="page-section"><div className="container"><h1 className="catalog-category-title">Trade-in</h1><p className="catalog-category-subtitle">Б/У товары</p><p className="catalog-empty-state">Сейчас в разделе Trade-in нет доступных товаров.</p></div></section>
  }
  return (
    <section className="page-section"><div className="container">
      {group.slug !== 'other' && brands.length > 0 && <nav className="model-tabs" aria-label="Бренды"><Link className="model-tab" href={`/catalog?group=${group.slug}`}>Все</Link>{brands.map((brand) => <Link key={brand} className="model-tab" href={`/catalog?group=${group.slug}&brand=${encodeURIComponent(brand)}`}>{brand}</Link>)}</nav>}
      <CategoryCatalogClient categoryName={group.label} categorySlug={group.slug} products={products} phone={phone || '+7 (917) 954-64-64'} />
    </div></section>
  )
}
