'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { COMMON_TEXT_KEYS, isVariantStatus, planVariants, relationId, type CommonTextKey, type DimensionKey, type RelationId, type VariantStatus } from '../../variant-tools/plan'
import { api, formatPrice, STATUS_LABELS } from './variant-tools-api'
import styles from './VariantTools.module.css'

type Option = { id: RelationId; label: string; hex: string }
type Dimension = { key: DimensionKey; title: string; options: Option[] }
type Existing = { id: string; title: string; combo: Record<string, string> }
type Options = {
  product: { id: RelationId; name: string; deviceType: string; hint: string }
  dimensions: Dimension[]
  common: Array<{ key: CommonTextKey; title: string }>
  existing: Existing[]
}
type Overview = { products: Array<{ id: RelationId; name: string; group: string; brand: string; variants: unknown[] }> }

function PickerView() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api<Overview>('/variant-tools/overview').then(setOverview).catch((reason: Error) => setError(reason.message))
  }, [])

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (overview?.products || []).filter((item) => !needle || item.name.toLowerCase().includes(needle)).slice(0, 80)
  }, [overview, query])

  return (
    <section className={styles.panel}>
      <h2>Выберите товар</h2>
      {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}
      <input className={`${styles.input} ${styles.search}`} placeholder="Начните вводить название" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
      <div className={styles.pickerList}>
        {found.map((item) => (
          <a key={String(item.id)} className={styles.pickerItem} href={`/admin/variant-builder?productId=${item.id}`}>
            <span>{item.name}</span>
            <span className={styles.muted}>{item.variants.length} вар.</span>
          </a>
        ))}
        {overview && found.length === 0 && <div className={styles.pickerItem}>Ничего не найдено</div>}
      </div>
    </section>
  )
}
const EMPTY_SET = new Set<string>()
const SEARCH_THRESHOLD = 12

type PanelProps = {
  dimension: Dimension
  selected: RelationId[]
  used: Set<string>
  onToggle: (id: RelationId) => void
  onChange: (ids: RelationId[]) => void
}

function DimensionPanel({ dimension, selected, used, onToggle, onChange }: PanelProps) {
  const [needle, setNeedle] = useState('')
  const chosen = useMemo(() => new Set(selected.map((item) => relationId(item))), [selected])

  const options = useMemo(() => {
    const text = needle.trim().toLowerCase()
    return dimension.options
      .filter((option) => !text || option.label.toLowerCase().includes(text))
      .map((option, index) => ({ option, index, rank: used.has(relationId(option.id)) ? 0 : 1 }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((item) => item.option)
  }, [dimension.options, needle, used])

  const selectVisible = () => {
    const merged = new Map([...selected, ...options.map((option) => option.id)].map((id) => [relationId(id), id]))
    onChange([...merged.values()])
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>{dimension.title} <span className={styles.muted}>выбрано: {chosen.size}</span></h2>
        <div className={styles.toolbar}>
          {dimension.options.length > SEARCH_THRESHOLD && (
            <input className={styles.input} placeholder="Поиск" value={needle} onChange={(event) => setNeedle(event.target.value)} />
          )}
          <button type="button" className={styles.buttonGhost} onClick={selectVisible}>
            {needle.trim() ? 'Выбрать найденные' : 'Выбрать все'}
          </button>
          <button type="button" className={styles.buttonGhost} onClick={() => onChange([])}>
            Сбросить
          </button>
        </div>
      </div>
      <div className={styles.optionGrid}>
        {options.map((option) => {
          const on = chosen.has(relationId(option.id))
          return (
            <label key={String(option.id)} className={`${styles.chip} ${on ? styles.chipOn : ''}`}>
              <input type="checkbox" checked={on} onChange={() => onToggle(option.id)} />
              {option.hex && <span className={styles.swatch} style={{ background: option.hex }} />}
              {option.label}
              {used.has(relationId(option.id)) && <span className={styles.muted}>есть</span>}
            </label>
          )
        })}
        {options.length === 0 && <span className={styles.muted}>Ничего не найдено</span>}
      </div>
    </section>
  )
}

function Builder({ productId }: { productId: string }) {
  const [data, setData] = useState<Options | null>(null)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<Partial<Record<DimensionKey, RelationId[]>>>({})
  const [common, setCommon] = useState<Partial<Record<CommonTextKey, string>>>({})
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [basePrice, setBasePrice] = useState('')
  const [status, setStatus] = useState<VariantStatus>('in_stock')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  const load = useCallback(() => {
    setError('')
    api<Options>(`/variant-tools/options?productId=${encodeURIComponent(productId)}`).then(setData).catch((reason: Error) => setError(reason.message))
  }, [productId])

  useEffect(load, [load])

  const labels = useMemo(() => {
    const map = new Map<string, string>()
    data?.dimensions.forEach((dimension) => dimension.options.forEach((option) => map.set(`${dimension.key}:${relationId(option.id)}`, option.label)))
    return map
  }, [data])

  const toggle = (key: DimensionKey, id: RelationId) => {
    setPicked((current) => {
      const list = current[key] || []
      const has = list.some((item) => relationId(item) === relationId(id))
      return { ...current, [key]: has ? list.filter((item) => relationId(item) !== relationId(id)) : [...list, id] }
    })
  }

  const usedByDimension = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const item of data?.existing || []) {
      for (const [key, value] of Object.entries(item.combo)) {
        if (!value) continue
        const set = map.get(key) || new Set<string>()
        set.add(value)
        map.set(key, set)
      }
    }
    return map
  }, [data])

  const storageSelected = picked.storage || []
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [key, value] of Object.entries(prices)) {
      const number = Number(value)
      if (value.trim() && Number.isFinite(number)) map[key] = number
    }
    return map
  }, [prices])
  const base = basePrice.trim() ? Number(basePrice) : undefined

  const plan = useMemo(() => {
    if (!data) return null
    const hasSelection = Object.values(picked).some((list) => list && list.length > 0)
    if (!hasSelection) return null
    return planVariants({ dims: picked, common, basePrice: base, priceByStorage: priceMap, status }, data.existing.map((item) => item.combo))
  }, [data, picked, common, base, priceMap, status])

  const preview = useMemo(() => {
    if (!plan || !plan.ok) return []
    return plan.add.map((row) => {
      const parts = (data?.dimensions || []).map((dimension) => labels.get(`${dimension.key}:${relationId(row[dimension.key])}`) || '')
      const extras = COMMON_TEXT_KEYS.map((key) => (typeof row[key] === 'string' ? String(row[key]) : ''))
      return { title: [...parts, ...extras].filter(Boolean).join(' · '), price: typeof row.price === 'number' ? row.price : null }
    })
  }, [plan, data, labels])

  async function submit() {
    if (!data || !plan || !plan.ok || busy) return
    setBusy(true)
    setError('')
    setDone('')
    try {
      const result = await api<{ added: number; skipped: number; total: number }>('/variant-tools/build', {
        productId,
        dims: picked,
        common,
        basePrice: base,
        priceByStorage: priceMap,
        status,
      })
      setDone(`Добавлено вариантов: ${result.added}. Всего у товара: ${result.total}.`)
      setPicked({})
      setPrices({})
      setBasePrice('')
      load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось добавить варианты.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) return <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>
  if (!data) return <div className={styles.muted}>Загрузка…</div>

  const needsStoragePrices = storageSelected.length > 0
  const planError = plan && !plan.ok ? plan.error : ''

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>{data.product.name}</h2>
            <div className={styles.muted}>{data.product.hint}. Уже есть вариантов: {data.existing.length}. Существующие варианты не меняются.</div>
          </div>
          <a className={styles.link} href={`/admin/collections/products/${data.product.id}`}>Открыть карточку товара</a>
        </div>
        {done && <div className={`${styles.notice} ${styles.noticeSuccess}`}>{done}</div>}
        {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}
      </section>

      {data.dimensions.map((dimension) => (
        <DimensionPanel
          key={dimension.key}
          dimension={dimension}
          selected={picked[dimension.key] || []}
          used={usedByDimension.get(dimension.key) || EMPTY_SET}
          onToggle={(id) => toggle(dimension.key, id)}
          onChange={(ids) => setPicked((current) => ({ ...current, [dimension.key]: ids }))}
        />
      ))}

      <section className={styles.panel}>
        <h2>Цена и статус</h2>
        {needsStoragePrices ? (
          <div className={styles.priceGrid}>
            {storageSelected.map((id) => (
              <label key={String(id)}>
                {labels.get(`storage:${relationId(id)}`)}
                <input
                  className={styles.input}
                  inputMode="numeric"
                  placeholder="Цена, ₽"
                  value={prices[relationId(id)] || ''}
                  onChange={(event) => setPrices((current) => ({ ...current, [relationId(id)]: event.target.value }))}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              Цена, ₽
              <input className={styles.input} inputMode="numeric" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} />
            </label>
          </div>
        )}
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            Статус новых вариантов
            <select
              className={styles.select}
              value={status}
              onChange={(event) => {
                const next = event.target.value
                if (isVariantStatus(next)) setStatus(next)
              }}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {data.common.map((field) => (
            <label key={field.key} className={styles.field}>
              {field.title}
              <input className={styles.input} value={common[field.key] || ''} onChange={(event) => setCommon((current) => ({ ...current, [field.key]: event.target.value }))} />
            </label>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Будет добавлено: {preview.length}</h2>
          {plan && plan.ok && plan.skipped > 0 && <span className={styles.muted}>Уже есть и пропущено: {plan.skipped}</span>}
        </div>
        {planError && <div className={styles.notice}>{planError}</div>}
        {preview.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Вариант</th>
                <th className={styles.right}>Цена</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((item, index) => (
                <tr key={`${index}-${item.title}`}>
                  <td>{item.title}</td>
                  <td className={styles.right}>{formatPrice(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={styles.toolbar}>
          <button type="button" className={styles.button} disabled={busy || !plan || !plan.ok || preview.length === 0} onClick={submit}>
            {busy ? 'Добавляем…' : `Добавить варианты (${preview.length})`}
          </button>
        </div>
      </section>
    </>
  )
}

export function VariantBuilderClient({ productId }: { productId: string }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Конструктор вариантов</h1>
        <p>Отметьте цвета, память и другие параметры: все недостающие комбинации добавятся в карточку товара за один раз.</p>
      </header>
      {productId ? <Builder productId={productId} /> : <PickerView />}
    </div>
  )
}
