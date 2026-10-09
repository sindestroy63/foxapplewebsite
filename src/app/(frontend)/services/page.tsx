import Link from 'next/link'
import { getServices } from '@/lib/services'
import { getSiteSettings } from '@/lib/cms'
import { getMediaUrl } from '@/lib/media'
import { formatPrice, normalizePhone, telegramLinkProps } from '@/lib/format'
import { ImageWithFallback } from '@/components/ImageWithFallback'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([
    getServices(),
    getSiteSettings(),
  ])

  const phone = settings.phone || '+7 (917) 954-64-64'

  return (
    <>
      <section className="page-section">
        <div className="container">
          <div className="page-head">
            <p className="eyebrow">Сервис</p>
            <h1>Наши услуги</h1>
            <p>
              Помимо продажи техники, мы предлагаем профессиональные услуги по настройке,
              обслуживанию и консультации. Свяжитесь с нами для уточнения деталей.
            </p>
          </div>

          {services.length === 0 ? (
            <div className="empty-state">
              <p>Услуги временно недоступны. Напишите в Telegram для уточнения.</p>
            </div>
          ) : (
            <div className="services-grid">
              {services.map((service) => {
                const image = service.images?.[0]
                const imageUrl = image && typeof image === 'object' ? getMediaUrl(image, 'card') : null

                return (
                  <article key={service.id} className="service-card">
                    <div className="service-card-media">
                      <Link href={`/services/${service.slug}`} aria-label={service.name}>
                        {imageUrl ? (
                          <ImageWithFallback src={imageUrl} alt={service.name} loading="lazy" />
                        ) : (
                          <span className="product-placeholder" aria-hidden="true" />
                        )}
                      </Link>
                    </div>

                    <div className="service-card-body">
                      <Link href={`/services/${service.slug}`} className="service-title">
                        {service.name}
                      </Link>
                      {service.description && (
                        <p className="service-description">{service.description}</p>
                      )}
                      <div className="service-price">
                        {service.priceLabel ? (
                          <span>{service.priceLabel}</span>
                        ) : service.price ? (
                          <strong>{formatPrice(service.price)}</strong>
                        ) : (
                          <span>Цена по запросу</span>
                        )}
                      </div>
                      <div className="card-actions">
                        <a href={`tel:${normalizePhone(phone)}`}>Позвонить</a>
                        <a {...telegramLinkProps(settings.telegramUsername)}>Написать</a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
