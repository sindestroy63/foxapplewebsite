import type { Metadata } from 'next'

import { LeadForm } from '@/components/LeadForm'
import { RichText } from '@/components/RichText'
import { getPageBySlug } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Trade-In',
  description: 'Trade-In в FOX APPLE: оценка вашего устройства и доплата за новую технику Apple.',
}

export default async function TradeInPage() {
  const page = await getPageBySlug('trade-in')

  return (
    <section className="page-section">
      <div className="container content-page">
        <p className="eyebrow">Trade-In</p>
        <h1>{page?.title || 'Обменяйте устройство на новую технику'}</h1>
        {page?.content ? (
          <RichText content={page.content} />
        ) : (
          <div className="rich-text">
            <p>
              Принесите устройство в магазин, сотрудник проверит состояние, комплектацию и предложит
              сумму зачета.
            </p>
            <ul>
              <li>Оценка iPhone, iPad, MacBook и другой техники.</li>
              <li>Возможность доплатить и забрать новую модель.</li>
              <li>Условия зависят от состояния устройства.</li>
            </ul>
          </div>
        )}
        <LeadForm
          description="Оставьте заявку, если хотите уточнить оценку устройства или условия обмена."
          source="contact_form"
          title="Заявка на Trade-In"
        />
      </div>
    </section>
  )
}
