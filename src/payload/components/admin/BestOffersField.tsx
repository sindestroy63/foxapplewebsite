'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useField } from '@payloadcms/ui'

type Product = {
  id: string | number
  name?: string
  model?: string
  price?: number
  isAvailable?: boolean
  status?: string
  variants?: Array<{ price?: number; isAvailable?: boolean }>
}

function productPrice(product: Product) {
  const prices = (product.variants || [])
    .filter((variant) => variant.isAvailable !== false && typeof variant.price === 'number')
    .map((variant) => variant.price as number)
  return prices.length ? Math.min(...prices) : product.price
}

function labelPrice(price?: number) {
  return typeof price === 'number' ? `от ${price.toLocaleString('ru-RU')} ₽` : 'Цена не указана'
}

function isInStock(product: Product) {
  return product.isAvailable !== false && product.status !== 'out_of_stock'
}

export default function BestOffersField() {
  const field = useField<Array<Product | string | number>>({ path: 'bestOffers' })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loadedProducts, setLoadedProducts] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(false)
  const selected = useMemo(() => Array.isArray(field.value) ? field.value : [], [field.value])

  useEffect(() => {
    const ids = selected.filter((item): item is string | number => typeof item !== 'object').map(String)
    if (!ids.length) return
    const controller = new AbortController()
    fetch(`/api/products?limit=100&depth=1&where[id][in]=${encodeURIComponent(ids.join(','))}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ docs?: Product[] }>)
      .then((data) => setLoadedProducts((current) => ({
        ...current,
        ...Object.fromEntries((data.docs || []).map((product) => [String(product.id), product])),
      })))
      .catch(() => undefined)
    return () => controller.abort()
  }, [selected])

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setResults([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/products?limit=20&depth=1&where[or][0][name][like]=${encodeURIComponent(term)}&where[or][1][model][like]=${encodeURIComponent(term)}`, { signal: controller.signal })
        const data = await response.json() as { docs?: Product[] }
        setResults(data.docs || [])
      } catch {
        if (!controller.signal.aborted) setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const selectedIds = new Set(selected.map((item) => String(typeof item === 'object' ? item.id : item)))
  const update = (next: Array<Product | string | number>) => field.setValue(next)
  const add = (product: Product) => {
    if (!selectedIds.has(String(product.id)) && selected.length < 6) update([...selected, product.id])
    setQuery('')
    setResults([])
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <style>{`@media (max-width: 760px) { .best-offers-table-head, .best-offers-table-row { grid-template-columns: 32px minmax(140px, 1fr) 118px !important; } .best-offers-table-head > :nth-child(3), .best-offers-table-head > :nth-child(4), .best-offers-table-row > :nth-child(3), .best-offers-table-row > :nth-child(4) { display: none; } }`}</style>
      <p style={{ margin: '0 0 18px', color: 'var(--theme-elevation-500)', fontSize: 13 }}>
        Товары, которые отображаются в блоке «Лучшие предложения» на главной. Порядок здесь соответствует порядку на сайте.
      </p>
      <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600 }}>Выбрано: {selected.length}</div>
      <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 4, overflow: 'hidden' }}>
        <div className="best-offers-table-head" style={{ display: 'grid', gridTemplateColumns: '48px minmax(180px, 1fr) minmax(120px, 160px) minmax(100px, 130px) 150px', gap: 12, padding: '10px 14px', color: 'var(--theme-elevation-500)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--theme-elevation-150)' }}>
          <span>№</span><span>Товар</span><span>Цена</span><span>Наличие</span><span style={{ textAlign: 'right' }}>Управление</span>
        </div>
        {selected.length === 0 ? (
          <div style={{ padding: '28px 16px', color: 'var(--theme-elevation-500)', textAlign: 'center', fontSize: 13 }}>
            Лучшие предложения пока не выбраны.
          </div>
        ) : null}
        {selected.map((item, index) => {
          const product = typeof item === 'object' && item !== null ? item : loadedProducts[String(item)]
          return (
            <div className="best-offers-table-row" key={String(product?.id || item)} style={{ display: 'grid', gridTemplateColumns: '48px minmax(180px, 1fr) minmax(120px, 160px) minmax(100px, 130px) 150px', gap: 12, alignItems: 'center', padding: '11px 14px', borderBottom: index === selected.length - 1 ? undefined : '1px solid var(--theme-elevation-100)', fontSize: 13 }}>
              <span style={{ color: 'var(--theme-elevation-500)', fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>
              <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product?.name || `Товар #${String(item)}`}</strong>
              <span>{product ? labelPrice(productPrice(product)) : 'Цена не указана'}</span>
              <span>
                {product ? <span style={{ display: 'inline-block', padding: '3px 7px', borderRadius: 3, background: 'var(--theme-elevation-100)', color: 'var(--theme-text)', fontSize: 12 }}>{isInStock(product) ? 'В наличии' : 'Нет в наличии'}</span> : 'Товар недоступен'}
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                <button type="button" disabled={index === 0} title="Переместить вверх" aria-label="Переместить вверх" onClick={() => { const next = [...selected]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(next) }} style={iconButtonStyle}>↑</button>
                <button type="button" disabled={index === selected.length - 1} title="Переместить вниз" aria-label="Переместить вниз" onClick={() => { const next = [...selected]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; update(next) }} style={iconButtonStyle}>↓</button>
                <button type="button" title="Удалить" aria-label="Удалить" onClick={() => update(selected.filter((_, rowIndex) => rowIndex !== index))} style={{ ...iconButtonStyle, color: 'var(--theme-error-500)' }}>×</button>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 16, position: 'relative' }}>
        <label htmlFor="best-offers-search" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>+ Добавить товар</label>
        <input id="best-offers-search" value={query} placeholder="Поиск по названию или модели" onChange={(event) => setQuery(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '9px 11px', border: '1px solid var(--theme-elevation-250)', borderRadius: 3, background: 'var(--theme-input-bg)', color: 'var(--theme-text)' }} />
        {loading ? <small style={{ display: 'block', marginTop: 6, color: 'var(--theme-elevation-500)' }}>Поиск...</small> : null}
        {results.filter((product) => !selectedIds.has(String(product.id))).length ? <div style={{ position: 'absolute', zIndex: 2, top: '100%', right: 0, left: 0, marginTop: 4, border: '1px solid var(--theme-elevation-200)', borderRadius: 4, background: 'var(--theme-bg)', boxShadow: '0 4px 14px rgb(0 0 0 / 12%)', overflow: 'hidden' }}>{results.filter((product) => !selectedIds.has(String(product.id))).map((product) => <button key={String(product.id)} type="button" onClick={() => add(product)} style={{ display: 'flex', width: '100%', flexDirection: 'column', alignItems: 'flex-start', gap: 3, padding: '10px 12px', border: 0, borderBottom: '1px solid var(--theme-elevation-100)', background: 'transparent', color: 'var(--theme-text)', textAlign: 'left', cursor: 'pointer' }}><strong>{product.name || product.model || `Товар #${product.id}`}</strong><small style={{ color: 'var(--theme-elevation-500)' }}>{labelPrice(productPrice(product))} · {isInStock(product) ? 'В наличии' : 'Нет в наличии'}</small></button>)}</div> : null}
      </div>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  padding: 0,
  border: '1px solid var(--theme-elevation-200)',
  borderRadius: 3,
  background: 'var(--theme-bg)',
  color: 'var(--theme-text)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
}