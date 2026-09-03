import type { CatalogGroupDefinition } from '@/lib/catalog-groups'
import type { Product } from '@/lib/types'
import type { CatalogPlacementDefinition } from '@/lib/product-catalog-placement'
import { CategoryCatalogClient } from './CategoryCatalogClient'

export default function GroupCatalogPage({ group, products, phone, heading, breadcrumbChild, placementTabs, activePlacement }: { group: CatalogGroupDefinition; products: Product[]; phone?: string; brands?: string[]; heading?: string; breadcrumbChild?: string; placementTabs?: CatalogPlacementDefinition[]; activePlacement?: CatalogPlacementDefinition | null }) {
  if (group.slug === 'trade-in' && products.length === 0) return <section className="page-section"><div className="container"><h1 className="catalog-category-title">Trade-in</h1><p className="catalog-category-subtitle">Б/У товары</p><p className="catalog-empty-state">Сейчас в разделе Trade-in нет доступных товаров.</p></div></section>
  return <section className="page-section"><div className="container"><CategoryCatalogClient categoryName={heading || group.label} categorySlug={group.slug} products={products} phone={phone || '+7 (917) 954-64-64'} breadcrumbBrand={heading && breadcrumbChild ? heading.split(' — ')[0] : undefined} breadcrumbChild={breadcrumbChild} placementTabs={placementTabs} activePlacement={activePlacement} /></div></section>
}
