'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Media, Product, ProductVariant } from '@/lib/types'
import { ProductGallery } from './ProductGallery'
import { ProductPill } from './ProductPill'
import { AddToCartButton } from './AddToCartButton'
import { cardPrice, formatPrice, statusLabel, statusTone } from '@/lib/format'
import { PRODUCT_PRICING_NOTICE } from '@/lib/product-pricing-notice'

const SIM_LABELS: Record<string, string> = {
  SIM_ESIM: 'SIM + eSIM',
  ESIM: 'eSIM',
}

type Props = {
  product: Product
  categorySlug?: string
}

function resolveMedia(items?: Array<Media | string | number>): Media[] {
  return (items || []).filter((m): m is Media => Boolean(m) && typeof m === 'object' && 'id' in m)
}

type StringKey = 'simType' | 'screenSize' | 'chip' | 'ram' | 'storage' | 'connectivity' | 'size' | 'generation' | 'revision' | 'packageLabel'

function toSortableNumber(s: string): number | null {
  const m = s.match(/^([\d.]+)\s*(TB|ТБ|GB|ГБ|MB|МБ)?$/i)
  if (!m) return null
  const num = parseFloat(m[1])
  if (isNaN(num)) return null
  const unit = (m[2] || '').toUpperCase()
  if (unit === 'TB' || unit === 'ТБ') return num * 1024
  if (unit === 'MB' || unit === 'МБ') return num / 1024
  return num
}

function uniqueStrings(variants: ProductVariant[], key: StringKey): string[] {
  const set = new Set<string>()
  for (const v of variants) {
    const val = v[key]
    if (typeof val === 'string' && val.trim()) set.add(val.trim())
  }
  const arr = [...set]
  arr.sort((a, b) => {
    const na = toSortableNumber(a) ?? parseFloat(a)
    const nb = toSortableNumber(b) ?? parseFloat(b)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })
  return arr
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
  { key: 'storage', title: 'Накопитель' },
  { key: 'connectivity', title: 'Подключение' },
  { key: 'size', title: 'Размер корпуса' },
  { key: 'generation', title: 'Поколение' },
  { key: 'revision', title: 'Ревизия' },
  { key: 'packageLabel', title: 'Комплектация' },
]

function displayLabel(key: StringKey, value: string): string {
  if (key === 'simType' && SIM_LABELS[value]) return SIM_LABELS[value]
  return value
}

function firstText(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

function ColorDot({ hex, hex2 }: { hex?: string; hex2?: string }) {
  if (!hex) return null
  const style: React.CSSProperties = hex2
    ? { background: `linear-gradient(135deg, ${hex} 50%, ${hex2} 50%)` }
    : { background: hex }
  return <span className="color-dot" style={style} />
}

export function ProductDetailClient({ product, categorySlug }: Props) {
  const variants = product.variants || []
  const hasVariants = variants.length > 0

  const firstVariant = variants.find((v) => v.isAvailable !== false && Number(v.price) > 0) || variants[0]

  const [selection, setSelection] = useState<Record<string, string | null>>(() => {
    if (!firstVariant) return {}
    const initSel: Record<string, string | null> = {}
    for (const axis of STRING_AXES) {
      const aVal = firstVariant[axis.key as keyof ProductVariant]
      if (typeof aVal === 'string') initSel[axis.key] = aVal.trim()
    }
    return initSel
  })

  const colors = useMemo(() => uniqueColors(variants), [variants])
  const hasColors = colors.length > 0

  const stringAxes = useMemo(() => {
    if (!hasVariants) return []
    return STRING_AXES.filter(({ key }) => {
      const vals = uniqueStrings(variants, key)
      if (vals.length === 0) return false
      if (vals.length <= 1) return false
      return true
    })
  }, [hasVariants, variants])

  const [selectedColor, setSelectedColor] = useState<string | null>(() => {
    return firstVariant?.color?.value || (hasColors ? colors[0].value : null)
  })

  useEffect(() => {
    if (!product.hideUnavailableColors || !selectedColor) return
    if (!colors.some((c) => c.value === selectedColor)) {
      setSelectedColor(colors.length > 0 ? colors[0].value : null)
    }
  }, [colors])

  const activeVariant = hasVariants ? findVariant(variants, selection, selectedColor) : null
  const bandMaterial = firstText(activeVariant?.material)
  const bandSize = firstText(activeVariant?.strapSize)
  const hasBandDetails = Boolean(bandMaterial || bandSize)
  const displayPrice = activeVariant?.price ?? product.price
  const displayOldPrice = cardPrice(displayPrice)
  const displayStatus = activeVariant?.status ?? product.status
  const tone = statusTone(displayStatus)

  const colorGroupImages = useMemo(() => {
    if (!selectedColor || !product.colorImages?.length) return []
    const group = product.colorImages.find((ci) => {
      const c = ci.color
      if (!c) return false
      if (typeof c === 'object' && 'value' in c) return c.value === selectedColor
      return false
    })
    return group ? resolveMedia(group.images) : []
  }, [selectedColor, product.colorImages])

  const variantImages = resolveMedia(activeVariant?.images)
  const productImages = resolveMedia(product.images)
  const displayImages = colorGroupImages.length > 0 ? colorGroupImages : variantImages.length > 0 ? variantImages : productImages

  return (
    <>
      <div className="detail-media">
        <ProductGallery
          images={displayImages}
          alt={product.name}
          overlay={
            <div className="product-card-badges" aria-label="Плашки товара">
              <ProductPill label="Trade-in" tooltip="Скидка при обмене старого устройства" tone="accent" />
              <ProductPill label="Рассрочка" tooltip="Рассрочка до 36 месяцев" />
              <ProductPill label="Гарантия" tooltip="1 год гарантии на новые устройства" tone="warranty" />
            </div>
          }
        />
      </div>

      <div className="detail-info">
        {product.isNew && <span className="detail-new-badge">НОВИНКА</span>}
        <p className="detail-eyebrow">Карточка товара</p>
        <h1 className="detail-title">{product.name}</h1>

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
                      const isExistent = variants.some((v) => {
                        const vVal = v[key as keyof ProductVariant]
                        return typeof vVal === 'string' && vVal.trim() === val
                      })
                      const isDisabled = !isExistent
                      return (
                        <button
                          key={val}
                          type="button"
                          className={`variant-btn${isActive ? ' variant-btn--active' : ''}${isDisabled ? ' variant-btn--disabled' : ''}`}
                          onClick={() => {
                            if (match) {
                              setSelection((prev) => ({ ...prev, [key]: val }))
                            } else {
                              const alt = variants.find((v) => {
                                const vVal = v[key as keyof ProductVariant]
                                return typeof vVal === 'string' && vVal.trim() === val && (v.isAvailable !== false || (v.stockQty ?? 0) > 0)
                              }) || variants.find((v) => {
                                const vVal = v[key as keyof ProductVariant]
                                return typeof vVal === 'string' && vVal.trim() === val
                              })
                              if (alt) {
                                const nextSel: Record<string, string | null> = { ...selection, [key]: val }
                                for (const axis of stringAxes) {
                                  const aVal = alt[axis.key as keyof ProductVariant]
                                  if (typeof aVal === 'string') nextSel[axis.key] = aVal.trim()
                                }
                                setSelection(nextSel)
                                if (alt.color?.value) setSelectedColor(alt.color.value)
                              }
                            }
                          }}
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
                    const isExistent = variants.some((v) => v.color?.value === clr.value)
                    const isDisabled = !isExistent
                    return (
                      <button
                        key={clr.value}
                        type="button"
                        className={`variant-btn variant-btn--color${isActive ? ' variant-btn--active' : ''}${isDisabled ? ' variant-btn--disabled' : ''}`}
                        onClick={() => {
                          setSelectedColor(clr.value)
                          if (!match) {
                            const alt = variants.find((v) => v.color?.value === clr.value && (v.isAvailable !== false || (v.stockQty ?? 0) > 0))
                              || variants.find((v) => v.color?.value === clr.value)
                            if (alt) {
                              const nextSel: Record<string, string | null> = { ...selection }
                              for (const axis of stringAxes) {
                                const aVal = alt[axis.key as keyof ProductVariant]
                                if (typeof aVal === 'string') nextSel[axis.key] = aVal.trim()
                              }
                              setSelection(nextSel)
                            }
                          }
                        }}
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

            {hasBandDetails && (
              <div className="variant-details" aria-label="Характеристики ремешка выбранного варианта">
                {bandMaterial && (
                  <div className="variant-detail-row">
                    <span className="variant-detail-label">Материал ремешка</span>
                    <span className="variant-detail-value">{bandMaterial}</span>
                  </div>
                )}
                {bandSize && (
                  <div className="variant-detail-row">
                    <span className="variant-detail-label">Размер ремешка</span>
                    <span className="variant-detail-value">{bandSize}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <hr className="detail-divider" />

        <div className="detail-pricing">
          <div className="detail-price-row">
            <span className="detail-price">{formatPrice(displayPrice)}</span>
            <span className="detail-price-label">со скидкой при оплате наличными</span>
          </div>
          {displayOldPrice !== null && (
            <div className="detail-price-row detail-price-row--card">
              <span className="detail-price-card">{formatPrice(displayOldPrice)}</span>
              <span className="detail-price-label">базовая розничная цена</span>
            </div>
          )}
        </div>

        <p className="detail-pricing-notice" role="note">{PRODUCT_PRICING_NOTICE}</p>

        <span className={`detail-status status ${tone}`}>{statusLabel(displayStatus)}</span>

        <div className="detail-add-to-cart">
          <AddToCartButton
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            categorySlug={categorySlug || (typeof product.category === 'object' && product.category ? (product.category as any).slug : '')}
            price={displayPrice}
            variant={activeVariant ? {
              color: activeVariant.color ? {
                value: activeVariant.color.value || '',
                englishLabel: activeVariant.color.englishLabel || '',
                russianLabel: activeVariant.color.russianLabel,
                primaryHex: activeVariant.color.primaryHex,
              } : undefined,
              memory: activeVariant.memory,
              simType: activeVariant.simType,
              size: activeVariant.size,
              chip: activeVariant.chip,
              screenSize: activeVariant.screenSize,
              revision: activeVariant.revision,
              material: activeVariant.material,
              strapSize: activeVariant.strapSize,
            } : (product.memory || product.color || product.simType || product.size ? {
              memory: product.memory,
              color: product.color ? { value: product.color, englishLabel: product.color } : undefined,
              simType: product.simType,
              size: product.size,
            } : undefined)}
            disabled={displayStatus === 'out_of_stock' && (!displayPrice || displayPrice <= 0)}
          />
        </div>

      </div>

    </>
  )
}
