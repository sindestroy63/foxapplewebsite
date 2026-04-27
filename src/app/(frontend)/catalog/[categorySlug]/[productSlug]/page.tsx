import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LeadForm } from '@/components/LeadForm'
import { RichText } from '@/components/RichText'
import { getProductBySlugs, getSiteSettings } from '@/lib/cms'
import {
  cardPrice,
  formatPrice,
  normalizePhone,
  productDisplayTitle,
  statusLabel,
  statusTone,
  telegramLinkProps,
} from '@/lib/format'
import { getProductImage } from '@/lib/media'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ categorySlug: string; productSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug, productSlug } = await params
  const product = await getProductBySlugs(categorySlug, productSlug)

  if (!product) {
    return {
      title: 'Товар не найден',
    }
  }

  return {
    title: product.seoTitle || product.name,
    description:
      product.seoDescription ||
      product.shortDescription ||
      `${product.name} в FOX APPLE. Актуальная цена и наличие в Самаре.`,
    openGraph: {
      title: product.name,
      description: product.shortDescription || 'Уточните наличие и забронируйте товар в FOX APPLE.',
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const [{ categorySlug, productSlug }, settings] = await Promise.all([params, getSiteSettings()])
  const product = await getProductBySlugs(categorySlug, productSlug)

  if (!product) {
    notFound()
  }

  const image = getProductImage(product, 'detail')
  const phone = settings.phone || '+7 (917) 954-64-64'
  const tone = statusTone(product.status)

  return (
    <section className="page-section">
      <div className="container product-detail">
        <div className="detail-media">
          {image.url ? (
            <img src={image.url} alt={image.alt} />
          ) : (
            <div className="detail-placeholder">{product.model || product.name}</div>
          )}
        </div>
        <div className="detail-info">
          <p className="eyebrow">Карточка товара</p>
          <h1>{productDisplayTitle(product)}</h1>
          <div className="detail-pricing">
            <div className="detail-price-row">
              <span className="detail-price">{formatPrice(product.price)}</span>
              <span className="detail-price-label">наличными</span>
            </div>
            {cardPrice(product.price) !== null && (
              <div className="detail-price-row detail-price-row--card">
                <span className="detail-price-card">{formatPrice(cardPrice(product.price))}</span>
                <span className="detail-price-label">по карте</span>
              </div>
            )}
            <p className="detail-price-note">При оплате картой стоимость увеличивается на 16%.</p>
          </div>
          {product.oldPrice ? <div className="old-price">{formatPrice(product.oldPrice)}</div> : null}
          <div className={`status ${tone}`}>{statusLabel(product.status)}</div>

          <dl className="spec-list">
            {product.memory ? (
              <>
                <dt>Память</dt>
                <dd>{product.memory}</dd>
              </>
            ) : null}
            {product.color ? (
              <>
                <dt>Цвет</dt>
                <dd>{product.color}</dd>
              </>
            ) : null}
            {product.simType ? (
              <>
                <dt>SIM/eSIM</dt>
                <dd>{product.simType}</dd>
              </>
            ) : null}
          </dl>

          <RichText content={product.description} />

          <div className="detail-actions">
            <a className="button" href={`tel:${normalizePhone(phone)}`}>
              Позвонить
            </a>
            <a className="button secondary" {...telegramLinkProps(settings.telegramUsername)}>
              Написать в Telegram
            </a>
            <a className="ghost-link" {...telegramLinkProps(settings.telegramUsername)}>
              Уточнить наличие в Telegram
            </a>
          </div>
          <p className="offer-note detail-offer-note">Информация на сайте не является публичной офертой.</p>

          <LeadForm
            description="Оставьте номер телефона или Telegram. Мы уточним наличие, цену и свяжемся с вами."
            productId={product.id}
            source="product_form"
            title="Оставить заявку по товару"
          />
        </div>
      </div>
    </section>
  )
}
