import Link from 'next/link'

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
import type { Category, Product, SiteSettings } from '@/lib/types'

function productHref(product: Product): string {
  const category = product.category
  const categorySlug =
    category && typeof category === 'object' && 'slug' in category
      ? (category as Category).slug
      : null

  return categorySlug ? `/catalog/${categorySlug}/${product.slug}` : '/catalog'
}

export function ProductCard({ product, settings }: { product: Product; settings: SiteSettings }) {
  const image = getProductImage(product)
  const phone = settings.phone || '+7 (917) 954-64-64'
  const tone = statusTone(product.status)

  return (
    <article className="product-card">
      <Link className="product-card-media" href={productHref(product)} aria-label={product.name}>
        {image.url ? (
          <img src={image.url} alt={image.alt} loading="lazy" />
        ) : (
          <span className="product-placeholder">{product.model || product.name}</span>
        )}
        {product.isNew ? <span className="badge badge-new">Новинка</span> : null}
      </Link>

      <div className="product-card-body">
        <Link href={productHref(product)} className="product-title">
          {productDisplayTitle(product)}
        </Link>
        <div className="product-meta">
          {product.memory ? <span>{product.memory}</span> : null}
          {product.color ? <span title={product.color}>{product.color}</span> : null}
          {product.simType ? <span>{product.simType}</span> : null}
        </div>
        <div className="product-row">
          <div className="price-block">
            <div className="price-line">
              <strong className="price-cash">{formatPrice(product.price)}</strong>
              <span className="price-label">наличными</span>
            </div>
            {cardPrice(product.price) !== null && (
              <div className="price-line price-line--card">
                <span className="price-card">{formatPrice(cardPrice(product.price))}</span>
                <span className="price-label">по карте</span>
              </div>
            )}
          </div>
          <span className={`status ${tone}`}>{statusLabel(product.status)}</span>
        </div>
        <div className="card-actions">
          <a href={`tel:${normalizePhone(phone)}`}>Позвонить</a>
          <a {...telegramLinkProps(settings.telegramUsername)}>Telegram</a>
        </div>
        <small className="offer-note">Информация на сайте не является публичной офертой.</small>
      </div>
    </article>
  )
}
