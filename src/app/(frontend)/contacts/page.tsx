import type { Metadata } from 'next'

import { LeadForm } from '@/components/LeadForm'
import { RichText } from '@/components/RichText'
import { getPageBySlug, getSiteSettings } from '@/lib/cms'
import { mapEmbedUrl, mapLinkUrl, normalizePhone, telegramLinkProps } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'FOX APPLE: Самара, ул. Московское шоссе 55. Телефон, Telegram и график работы магазина.',
}

export default async function ContactsPage() {
  const [settings, page] = await Promise.all([getSiteSettings(), getPageBySlug('contacts')])
  const phone = settings.phone || '+7 (917) 954-64-64'

  return (
    <section className="page-section">
      <div className="container contacts-grid">
        <div className="contacts-left">
          <p className="eyebrow">Контакты</p>
          <h1>{page?.title || 'Контакты FOX APPLE'}</h1>
          {page?.content ? <RichText content={page.content} /> : null}

          <div className="contact-cards">
            <a href={`tel:${normalizePhone(phone)}`} className="contact-item">
              <span className="contact-icon">📞</span>
              <div>
                <span className="contact-item-label">Телефон</span>
                <span className="contact-item-value">{phone}</span>
              </div>
            </a>

            <a {...telegramLinkProps(settings.telegramUsername)} className="contact-item">
              <span className="contact-icon">✈️</span>
              <div>
                <span className="contact-item-label">Telegram</span>
                <span className="contact-item-value">{settings.telegramUsername}</span>
              </div>
            </a>

            <a href={settings.telegramChannelUrl} rel="noreferrer" target="_blank" className="contact-item">
              <span className="contact-icon">📢</span>
              <div>
                <span className="contact-item-label">Telegram-канал</span>
                <span className="contact-item-value">Новости и поступления</span>
              </div>
            </a>

            <a href="https://max.ru/join/vYzHGGiZB4AZttyMGsyZXVsYWGXrLKmM86quZjZOTXs" rel="noreferrer" target="_blank" className="contact-item">
              <span className="contact-icon">💬</span>
              <div>
                <span className="contact-item-label">MAX</span>
                <span className="contact-item-value">Наш канал в MAX</span>
              </div>
            </a>

            <a
              href={mapLinkUrl(settings.address, settings.mapUrl)}
              rel="noreferrer"
              target="_blank"
              className="contact-item"
            >
              <span className="contact-icon">📍</span>
              <div>
                <span className="contact-item-label">Адрес</span>
                <span className="contact-item-value">{settings.address}</span>
              </div>
            </a>

            <div className="contact-item">
              <span className="contact-icon">🕐</span>
              <div>
                <span className="contact-item-label">График работы</span>
                <span className="contact-item-value">{settings.workTime}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="contacts-side">
          <div className="map-card">
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapEmbedUrl(settings.address, settings.mapUrl)}
              title="Карта магазина FOX APPLE"
            />
          </div>
          <div className="request-card">
            <h2>Связаться с магазином</h2>
            <p>Быстрее всего уточнить наличие, цвет и цену по телефону или в Telegram.</p>
            <div className="detail-actions">
              <a className="button" href={`tel:${normalizePhone(phone)}`}>
                Позвонить
              </a>
              <a className="button secondary" {...telegramLinkProps(settings.telegramUsername)}>
                Написать в Telegram
              </a>
            </div>
            <LeadForm
              description="Если удобнее, оставьте заявку. Мы свяжемся с вами и уточним все детали."
              source="contact_form"
              title="Оставить заявку"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
