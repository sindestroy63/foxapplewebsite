import type { Metadata } from 'next'

import { LeadForm } from '@/components/LeadForm'
import { RichText } from '@/components/RichText'
import { getPageBySlug } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ремонт',
  description: 'Ремонт техники Apple в Самаре. Оставьте заявку в FOX APPLE.',
}

export default async function RepairPage() {
  const page = await getPageBySlug('repair')

  return (
    <section className="page-section">
      <div className="container content-page">
        <p className="eyebrow">Ремонт</p>
        <h1>{page?.title || 'Ремонт техники Apple'}</h1>
        {page?.content ? (
          <RichText content={page.content} />
        ) : (
          <div className="rich-text">
            <p>FOX APPLE выполняет ремонт техники Apple в Самаре. Диагностика, замена экранов, аккумуляторов, разъёмов и других компонентов.</p>
            <h3>Что мы ремонтируем</h3>
            <ul>
              <li>Замена экрана iPhone и iPad</li>
              <li>Замена аккумулятора iPhone, iPad, MacBook</li>
              <li>Ремонт разъёма зарядки и кнопок</li>
              <li>Восстановление после попадания воды</li>
              <li>Замена задней крышки iPhone</li>
              <li>Ремонт материнской платы MacBook</li>
            </ul>
            <h3>Как это работает</h3>
            <ol>
              <li>Оставьте заявку или позвоните — опишите проблему.</li>
              <li>Привезите устройство на диагностику.</li>
              <li>Согласуем стоимость и сроки ремонта.</li>
              <li>Заберите готовое устройство.</li>
            </ol>
          </div>
        )}
        <LeadForm
          description="Опишите проблему с устройством — мы свяжемся и подскажем стоимость и сроки ремонта."
          source="repair_form"
          title="Заявка на ремонт"
        />
      </div>
    </section>
  )
}
