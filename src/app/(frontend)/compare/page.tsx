import type { Metadata } from 'next'

import { CompareView } from '@/components/CompareView'

export const metadata: Metadata = {
  title: 'Сравнение товаров | ФОХСТОР',
  description: 'Сравните характеристики, цены и наличие выбранных товаров в магазине ФОХСТОР.',
  robots: { index: false, follow: true },
}

export default function ComparePage() {
  return (
    <section className="page-section">
      <div className="container">
        <CompareView />
      </div>
    </section>
  )
}
