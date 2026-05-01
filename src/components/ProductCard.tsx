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
import type { Category, Product, SiteSettings } from '@/lib/types'

function productHref(product: Product): string {
  const category = product.category
  const categorySlug =
    category && typeof category === 'object' && 'slug' in category
      ? (category as Category).slug
      : null

  return categorySlug ? `/catalog/${categorySlug}/${product.slug}` : '/catalog'
}

function getDisplayPrice(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    return Math.min(...product.variants.filter((v) => v.isAvailable !== false).map((v) => v.price).filter(Boolean), product.price)
  }
  return product.price
}


function getCategorySlug(product: Product): string | null {
  const cat = product.category
  if (cat && typeof cat === 'object' && 'slug' in cat) return (cat as Category).slug
  return null
}

export function ProductCard({ product, settings }: { product: Product; settings: SiteSettings }) {
  const image = getProductImage(product)
  const phone = settings.phone || '+7 (917) 954-64-64'
  const tone = statusTone(product.status)
  const price = getDisplayPrice(product)
  const isUsed = getCategorySlug(product) === 'used'

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
          {product.model || product.name}
        </Link>
        <div className="product-row">
          <div className="price-block">
            <div className="price-line">
              <strong className="price-cash">{formatPrice(price)}</strong>
              <span className="price-label">со скидкой</span>
            </div>
            {cardPrice(price) !== null && (
              <div className="price-line price-line--card">
                <span className="price-card">{formatPrice(cardPrice(price))}</span>
                <span className="price-label">старая цена</span>
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
        {!isUsed && (
          <small className="offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</small>
        )}
      </div>
    </article>
  )
}
