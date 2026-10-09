import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getService } from '@/lib/services'
import { getSiteSettings } from '@/lib/cms'
import { getMediaUrl } from '@/lib/media'
import { formatPrice, normalizePhone, telegramLinkProps } from '@/lib/format'
import { ImageWithFallback } from '@/components/ImageWithFallback'

export const dynamic = 'force-dynamic'

interface ServicePageProps {
  params: Promise<{ slug: string }>
}

export default async function ServicePage(props: ServicePageProps) {
  const params = await props.params
  const [service, settings] = await Promise.all([
    getService(params.slug),
    getSiteSettings(),
  ])

  if (!service) {
    notFound()
  }

  const phone = settings.phone || '+7 (917) 954-64-64'
  const mainImage = service.images?.[0]
  const mainImageUrl = mainImage && typeof mainImage === 'object' ? getMediaUrl(mainImage, 'detail') : null

  return (
    <>
      <section className="page-section">
        <div className="container">
          <nav className="breadcrumbs">
            <Link href="/">Главная</Link>
            <span>›</span>
            <Link href="/services">Услуги</Link>
            <span>›</span>
            <span>{service.name}</span>
          </nav>
        </div>
      </section>

      <section className="page-section">
        <div className="container product-detail">
          <div className="detail-media">
            {mainImageUrl ? (
              <ImageWithFallback src={mainImageUrl} alt={service.name} loading="eager" />
            ) : (
              <div className="detail-placeholder">Без изображения</div>
            )}
          </div>

          <div className="detail-info">
            <h1>{service.name}</h1>

            {service.description && (
              <div className="detail-description">
                <p>{service.description}</p>
              </div>
            )}

            <div className="detail-pricing">
              {service.priceLabel ? (
                <div className="detail-price-row">
                  <span className="detail-price-label">{service.priceLabel}</span>
                </div>
              ) : service.price ? (
                <div className="detail-price-row">
                  <strong className="detail-price">{formatPrice(service.price)}</strong>
                </div>
              ) : (
                <div className="detail-price-row">
                  <span className="detail-price-label">Цена по запросу</span>
                </div>
              )}
            </div>

            <div className="detail-actions">
              <a className="button button-primary" href={`tel:${normalizePhone(phone)}`}>
                Позвонить
              </a>
              <a className="button" {...telegramLinkProps(settings.telegramUsername)}>
                Написать в Telegram
              </a>
            </div>

            <small className="offer-note">
              Информация на сайте не является публичной офертой. Уточняйте детали у менеджера.
            </small>
          </div>
        </div>
      </section>
    </>
  )
}
