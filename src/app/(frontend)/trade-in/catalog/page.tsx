import type { Metadata } from 'next'
import Link from 'next/link'

import { ProductGrid } from '@/components/ProductGrid'
import { getSiteSettings, getTradeInProducts } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'TRADE-IN',
  description: 'Доступные устройства Trade-in в ФОКССТОР.',
  alternates: {
    canonical: '/trade-in/catalog',
  },
}

export default async function TradeInCatalogPage() {
  const [settings, products] = await Promise.all([
    getSiteSettings(),
    getTradeInProducts(),
  ])

  return (
    <section className="page-section">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Навигация">
          <Link href="/">Главная</Link>
          <span className="breadcrumbs-sep">›</span>
          <Link href="/trade-in">Trade-in</Link>
          <span className="breadcrumbs-sep">›</span>
          <span>TRADE-IN</span>
        </nav>

        <h1 className="catalog-category-title">TRADE-IN</h1>

        {products.length > 0 ? (
          <ProductGrid products={products} settings={settings} />
        ) : (
          <div className="empty-state">
            <p>Сейчас в Trade-in нет доступных устройств</p>
            <Link className="button" href="/trade-in">Перейти к заявке на Trade-in</Link>
          </div>
        )}
      </div>
    </section>
  )
}
