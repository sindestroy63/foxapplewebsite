import { ProductCard } from './ProductCard'
import type { Product, SiteSettings } from '@/lib/types'

export function ProductGrid({
  emptyText = 'Товары не найдены. Напишите в Telegram, и сотрудник проверит наличие.',
  products,
  settings,
}: {
  emptyText?: string
  products: Product[]
  settings: SiteSettings
}) {
  if (!products.length) {
    return <div className="empty-state">{emptyText}</div>
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} settings={settings} />
      ))}
    </div>
  )
}
