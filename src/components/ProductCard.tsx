import Link from 'next/link'

import {
  cardPrice,
  formatPrice,
  normalizePhone,
  statusLabel,
  statusTone,
  telegramLinkProps,
} from '@/lib/format'
import { getProductImage } from '@/lib/media'
import type { Product, SiteSettings } from '@/lib/types'
import { ProductPill } from './ProductPill'
import { ImageWithFallback } from './ImageWithFallback'
import { getCatalogPrice } from '@/lib/pricing'
import { buildProductUrl } from '@/lib/product-url-builder'

function productHref(product: Product): string {
  return buildProductUrl(product)
}

function getDisplayPrice(product: Product): number {
  return getCatalogPrice(product)
}

export function ProductCard({ product, settings }: { product: Product; settings: SiteSettings }) {
  const image = getProductImage(product)
  const phone = settings.phone || '+7 (917) 954-64-64'
  const tone = statusTone(product.status)
  const price = getDisplayPrice(product)
  const isUsed = product.productGroup === 'trade-in'

  return (
    <article className="product-card">
      <div className="product-card-media-wrap">
        <Link className="product-card-media" href={productHref(product)} aria-label={product.name}>
          {image.url ? (
            <ImageWithFallback src={image.url} alt={image.alt} loading="lazy" />
          ) : (
            <span className="product-placeholder" aria-hidden="true" />
          )}
          {product.isNew ? <span className="badge badge-new">Новинка</span> : null}
        </Link>
        <div className="product-card-badges" aria-label="Плашки товара">
          <ProductPill label="Trade-in" tooltip="Скидка при обмене старого устройства" tone="accent" />
          <ProductPill label="Рассрочка" tooltip="Рассрочка до 36 месяцев" />
          <ProductPill label="Гарантия" tooltip="1 год гарантии на новые устройства" tone="warranty" />
        </div>
      </div>

      <div className="product-card-body">
        <Link href={productHref(product)} className="product-title">
          {product.name}
        </Link>
        <div className="product-row">
          <div className="price-block">
            <div className="price-line">
              <strong className="price-cash">{formatPrice(price)}</strong>
              <span className="price-label">со скидкой при оплате наличными</span>
            </div>
            {cardPrice(price) !== null && (
              <div className="price-line price-line--card">
                <span className="price-card">{formatPrice(cardPrice(price))}</span>
                <span className="price-label">базовая розничная цена</span>
              </div>
            )}
          </div>
          <span className={`status ${tone}`}>{statusLabel(product.status)}</span>
        </div>
        <div className="card-actions">
          <a href={`tel:${normalizePhone(phone)}`}>Позвонить</a>
          <a {...telegramLinkProps(settings.telegramUsername)}>Написать</a>
        </div>
        <small className="offer-note">Информация на сайте не является публичной офертой.</small>
        {!isUsed && <small className="offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</small>}
      </div>
    </article>
  )
}
