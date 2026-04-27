import type { Metadata } from 'next'

import { LeadForm } from '@/components/LeadForm'
import { RichText } from '@/components/RichText'
import { getPageBySlug } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Рассрочка',
  description: 'Рассрочка на технику Apple в FOX APPLE. Уточните условия у сотрудника магазина в Самаре.',
}

export default async function InstallmentPage() {
  const page = await getPageBySlug('installment')

  return (
    <section className="page-section">
      <div className="container content-page">
        <p className="eyebrow">Рассрочка</p>
        <h1>{page?.title || 'Рассрочка на технику Apple'}</h1>
        {page?.content ? (
          <RichText content={page.content} />
        ) : (
          <div className="rich-text">
            <p>
              Можно выбрать iPhone, iPad, MacBook или аксессуары и уточнить доступные варианты
              оплаты частями у сотрудника магазина.
            </p>
            <ul>
              <li>Предварительная консультация по условиям.</li>
              <li>Подбор модели под бюджет.</li>
              <li>Бронь товара после подтверждения наличия.</li>
            </ul>
          </div>
        )}
        <LeadForm
          description="Оставьте контакт, и мы подскажем доступные варианты рассрочки под нужную модель."
          source="contact_form"
          title="Заявка на рассрочку"
        />
      </div>
    </section>
  )
}
