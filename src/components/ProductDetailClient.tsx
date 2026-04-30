'use client'

import { useState, useMemo } from 'react'
import type { Media, Product, ProductVariant } from '@/lib/types'
import { ProductGallery } from './ProductGallery'
import { cardPrice, formatPrice, statusLabel, statusTone } from '@/lib/format'

const SIM_LABELS: Record<string, string> = {
  SIM_ESIM: 'SIM + eSIM',
  ESIM: 'eSIM',
}

type Props = {
  product: Product
  phone?: string
  telegramUsername?: string
}

function resolveMedia(items?: Array<Media | string | number>): Media[] {
  return (items || []).filter((m): m is Media => Boolean(m) && typeof m === 'object' && 'id' in m)
}

type StringKey = 'simType' | 'screenSize' | 'chip' | 'ram' | 'memory' | 'connectivity' | 'size'

function uniqueStrings(variants: ProductVariant[], key: StringKey): string[] {
  const set = new Set<string>()
  for (const v of variants) {
    const val = v[key]
    if (typeof val === 'string' && val.trim()) set.add(val.trim())
  }
  return [...set]
}

type UniqueColor = { value: string; en: string; ru: string; hex: string; hex2?: string }

function uniqueColors(variants: ProductVariant[]): UniqueColor[] {
  const seen = new Map<string, UniqueColor>()
  for (const v of variants) {
    const c = v.color
    if (!c?.value) continue
    if (!seen.has(c.value)) {
      seen.set(c.value, {
        value: c.value,
        en: c.englishLabel || c.value,
        ru: c.russianLabel || '',
        hex: c.primaryHex || '',
        hex2: c.secondaryHex,
      })
    }
  }
  return [...seen.values()]
}

function findVariant(
  variants: ProductVariant[],
  sel: Record<string, string | null>,
  colorVal: string | null,
): ProductVariant | null {
  return variants.find((v) => {
    if (colorVal && v.color?.value !== colorVal) return false
    for (const [key, val] of Object.entries(sel)) {
      if (!val) continue
      const vVal = v[key as keyof ProductVariant]
      if (typeof vVal === 'string' && vVal.trim() !== val) return false
    }
    return true
  }) || null
}

const STRING_AXES: { key: StringKey; title: string }[] = [
  { key: 'simType', title: 'Подключение' },
  { key: 'screenSize', title: 'Диагональ' },
  { key: 'chip', title: 'Чип' },
  { key: 'ram', title: 'Оперативная память' },
  { key: 'memory', title: 'Накопитель' },
  { key: 'connectivity', title: 'Подключение' },
  { key: 'size', title: 'Размер' },
]

function displayLabel(key: StringKey, value: string): string {
  if (key === 'simType' && SIM_LABELS[value]) return SIM_LABELS[value]
  return value
}

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

  const colors = useMemo(() => uniqueColors(variants), [variants])
  const hasColors = colors.length > 0

  const stringAxes = useMemo(() => {
    if (!hasVariants) return []
    return STRING_AXES.filter(({ key }) => {
      const vals = uniqueStrings(variants, key)
      if (vals.length === 0) return false
      if (key === 'connectivity' && vals.length <= 1) return false
      return true
    })
  }, [hasVariants, variants])

  const [selectedColor, setSelectedColor] = useState<string | null>(() => {
    return hasColors ? colors[0].value : null
  })

  const [selection, setSelection] = useState<Record<string, string | null>>(() => {
    if (!hasVariants) return {}
    const init: Record<string, string | null> = {}
    for (const { key } of STRING_AXES) {
      const vals = uniqueStrings(variants, key)
      if (vals.length > 0) init[key] = vals[0]
    }
    return init
  })

  const activeVariant = hasVariants ? findVariant(variants, selection, selectedColor) : null
  const displayPrice = activeVariant?.price ?? product.price
  const displayOldPrice = activeVariant?.oldPrice ?? product.oldPrice
  const displayStatus = activeVariant?.status ?? product.status
  const tone = statusTone(displayStatus)

  const variantImages = resolveMedia(activeVariant?.images)
  const productImages = resolveMedia(product.images)
  const displayImages = variantImages.length > 0 ? variantImages : productImages

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

        {hasVariants && (stringAxes.length > 0 || hasColors) && (
          <div className="variant-selector">
            {stringAxes.map(({ key, title }) => {
              const values = uniqueStrings(variants, key)
              if (values.length === 0) return null
              return (
                <div className="variant-group" key={key}>
                  <span className="variant-label">{title}</span>
                  <div className="variant-options">
                    {values.map((val) => {
                      const isActive = selection[key] === val
                      const testSel = { ...selection, [key]: val }
                      const match = findVariant(variants, testSel, selectedColor)
                      const isDisabled = !match || match.isAvailable === false
                      return (
                        <button
                          key={val}
                          type="button"
                          className={`variant-btn${isActive ? ' variant-btn--active' : ''}${isDisabled ? ' variant-btn--disabled' : ''}`}
                          onClick={() => setSelection((prev) => ({ ...prev, [key]: val }))}
                        >
                          {displayLabel(key, val)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {hasColors && (
              <div className="variant-group">
                <span className="variant-label">Цвет</span>
                <div className="variant-options variant-options--color">
                  {colors.map((clr) => {
                    const isActive = selectedColor === clr.value
                    const testSel = { ...selection }
                    const match = findVariant(variants, testSel, clr.value)
                    const isDisabled = !match || match.isAvailable === false
                    return (
                      <button
                        key={clr.value}
                        type="button"
                        className={`variant-btn variant-btn--color${isActive ? ' variant-btn--active' : ''}${isDisabled ? ' variant-btn--disabled' : ''}`}
                        onClick={() => setSelectedColor(clr.value)}
                      >
                        <ColorDot hex={clr.hex} hex2={clr.hex2} />
                        <span className="color-label">
                          <span className="color-en">{clr.en}</span>
                          {clr.ru && <span className="color-ru">{clr.ru}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!hasVariants && (product.color || product.memory) && (
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
