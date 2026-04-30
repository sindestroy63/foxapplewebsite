'use client'

import { useState, useMemo } from 'react'
import type { Media, Product, ProductVariant } from '@/lib/types'
import { ProductGallery } from './ProductGallery'
import { cardPrice, formatPrice, statusLabel, statusTone } from '@/lib/format'

const SIM_LABELS: Record<string, string> = {
  SIM_ESIM: 'SIM + eSIM',
  ESIM: 'eSIM',
  SIM_SIM: 'SIM + SIM',
}

function label(key: string, value: string): string {
  if (key === 'simType' && SIM_LABELS[value]) return SIM_LABELS[value]
  return value
}

type Props = {
  product: Product
  phone?: string
  telegramUsername?: string
}

function resolveMedia(items?: Array<Media | string | number>): Media[] {
  return (items || []).filter((m): m is Media => Boolean(m) && typeof m === 'object' && 'id' in m)
}

function uniqueValues(variants: ProductVariant[], key: keyof ProductVariant): string[] {
  const set = new Set<string>()
  for (const v of variants) {
    const val = v[key]
    if (typeof val === 'string' && val.trim()) set.add(val.trim())
  }
  return [...set]
}

function findHex(variants: ProductVariant[], colorVal: string): { hex?: string; hex2?: string } {
  const v = variants.find((v) => v.color === colorVal)
  return { hex: v?.colorHex, hex2: v?.colorSecondaryHex }
}

function findVariant(variants: ProductVariant[], sel: Record<string, string | null>): ProductVariant | null {
  return variants.find((v) => {
    for (const [key, val] of Object.entries(sel)) {
      if (!val) continue
      const vVal = v[key as keyof ProductVariant]
      if (typeof vVal === 'string' && vVal.trim() !== val) return false
    }
    return true
  }) || null
}

const OPTION_ORDER: { key: keyof ProductVariant; title: string }[] = [
  { key: 'simType', title: 'Подключение' },
  { key: 'screenSize', title: 'Диагональ' },
  { key: 'chip', title: 'Чип' },
  { key: 'ram', title: 'Оперативная память' },
  { key: 'memory', title: 'Накопитель' },
  { key: 'connectivity', title: 'Подключение' },
  { key: 'size', title: 'Размер' },
  { key: 'color', title: 'Цвет' },
]

function ColorDot({ hex, hex2 }: { hex?: string; hex2?: string }) {
  if (!hex) return null
  const style: React.CSSProperties = hex2
    ? { background: `linear-gradient(135deg, ${hex} 50%, ${hex2} 50%)` }
    : { background: hex }
  return <span className="color-dot" style={style} />
}

export function ProductDetailClient({ product, phone, telegramUsername }: Props) {
  const variants = product.variants || []
  const hasVariants = variants.length > 0

  const optionKeys = useMemo(() => {
    if (!hasVariants) return []
    return OPTION_ORDER.filter(({ key }) => {
      const vals = uniqueValues(variants, key)
      if (vals.length === 0) return false
      if (key === 'connectivity' && vals.length <= 1) return false
      return true
    })
  }, [hasVariants, variants])

  const [selection, setSelection] = useState<Record<string, string | null>>(() => {
    if (!hasVariants) return {}
    const init: Record<string, string | null> = {}
    for (const { key } of OPTION_ORDER) {
      const vals = uniqueValues(variants, key)
      if (vals.length > 0) init[key] = vals[0]
    }
    return init
  })

  const activeVariant = hasVariants ? findVariant(variants, selection) : null
  const displayPrice = activeVariant?.price ?? product.price
  const displayOldPrice = activeVariant?.oldPrice ?? product.oldPrice
  const displayStatus = activeVariant?.status ?? product.status
  const tone = statusTone(displayStatus)

  const variantImages = resolveMedia(activeVariant?.images)
  const productImages = resolveMedia(product.images)
  const displayImages = variantImages.length > 0 ? variantImages : productImages

  const handleSelect = (key: string, value: string) => {
    setSelection((prev) => ({ ...prev, [key]: value }))
  }

  const normalizedPhone = phone?.replace(/[^\d+]/g, '') || ''
  const tgLink = telegramUsername ? `https://t.me/${telegramUsername.replace('@', '')}` : '#'

  return (
    <>
      <div className="detail-media">
        <ProductGallery images={displayImages} alt={product.name} />
      </div>

      <div className="detail-info">
        <p className="detail-eyebrow">Карточка товара</p>
        <h1 className="detail-title">{product.model || product.name}</h1>

        {hasVariants && optionKeys.length > 0 && (
          <div className="variant-selector">
            {optionKeys.map(({ key, title }) => {
              const values = uniqueValues(variants, key)
              if (values.length === 0) return null
              const isColor = key === 'color'
              return (
                <div className="variant-group" key={key}>
                  <span className="variant-label">{title}</span>
                  <div className={`variant-options${isColor ? ' variant-options--color' : ''}`}>
                    {values.map((val) => {
                      const isActive = selection[key] === val
                      const testSel = { ...selection, [key]: val }
                      const match = findVariant(variants, testSel)
                      const isDisabled = !match || match.isAvailable === false
                      const { hex, hex2 } = isColor ? findHex(variants, val) : {}
                      return (
                        <button
                          key={val}
                          type="button"
                          className={`variant-btn${isActive ? ' variant-btn--active' : ''}${isDisabled ? ' variant-btn--disabled' : ''}${isColor ? ' variant-btn--color' : ''}`}
                          onClick={() => handleSelect(key, val)}
                        >
                          {isColor && <ColorDot hex={hex} hex2={hex2} />}
                          {label(key, val)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!hasVariants && product.color && (
          <dl className="spec-list-inline">
            {product.memory && <><dt>Память</dt><dd>{product.memory}</dd></>}
            {product.color && <><dt>Цвет</dt><dd>{product.color}</dd></>}
            {product.simType && <><dt>Подключение</dt><dd>{SIM_LABELS[product.simType] || product.simType}</dd></>}
            {product.size && <><dt>Размер</dt><dd>{product.size}</dd></>}
          </dl>
        )}

        <hr className="detail-divider" />

        <div className="detail-pricing">
          <div className="detail-price-row">
            <span className="detail-price">{formatPrice(displayPrice)}</span>
            <span className="detail-price-label">наличными</span>
          </div>
          {cardPrice(displayPrice) !== null && (
            <div className="detail-price-row detail-price-row--card">
              <span className="detail-price-card">{formatPrice(cardPrice(displayPrice))}</span>
              <span className="detail-price-label">по карте</span>
            </div>
          )}
          <p className="detail-price-note">При оплате картой стоимость увеличивается на 16%.</p>
        </div>

        {displayOldPrice ? <div className="detail-old-price">{formatPrice(displayOldPrice)}</div> : null}
        <span className={`detail-status status ${tone}`}>{statusLabel(displayStatus)}</span>

        <hr className="detail-divider" />

        <div className="detail-actions">
          {normalizedPhone && (
            <a className="button" href={`tel:${normalizedPhone}`}>Позвонить</a>
          )}
          {telegramUsername && (
            <a className="button secondary" href={tgLink} target="_blank" rel="noopener noreferrer">Написать в Telegram</a>
          )}
        </div>

        {product.shortDescription && (
          <>
            <hr className="detail-divider" />
            <details className="detail-accordion">
              <summary>Подробнее о товаре</summary>
              <p>{product.shortDescription}</p>
            </details>
          </>
        )}
      </div>
    </>
  )
}
