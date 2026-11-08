'use client'

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react'

import { compareCapacity, isCreatableDimension, normalizeHex, type CreatableDimension } from '../../variant-tools/options'
import { COMMON_TEXT_KEYS, isVariantStatus, pendingPriceGroups, planVariants, relationId, type CommonTextKey, type DimensionKey, type RelationId, type VariantStatus } from '../../variant-tools/plan'
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

type Created = { ok: true; label: string; existed: boolean } | { ok: false; error: string }
type CreateAction = { kind: CreatableDimension; submit: (fields: Record<string, string>) => Promise<Created> }

const ADD_LABELS: Record<CreatableDimension, string> = {
  color: 'Добавить цвет',
  storage: 'Добавить память',
  ramOption: 'Добавить оперативку',
}

function withOption(options: Option[], created: Option, key: DimensionKey): Option[] {
  if (options.some((option) => relationId(option.id) === relationId(created.id))) return options
  if (key === 'storage' || key === 'ramOption') return [...options, created].sort((a, b) => compareCapacity(a.label, b.label))
  return [created, ...options]
}

function OptionForm({ kind, onSubmit, onCancel }: { kind: CreatableDimension; onSubmit: (fields: Record<string, string>) => Promise<Created>; onCancel: () => void }) {
  const hexId = useId()
  const [fields, setFields] = useState<Record<string, string>>(kind === 'color' ? { englishLabel: '', russianLabel: '', primaryHex: '#808080' } : { value: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (name: string, value: string) => setFields((current) => ({ ...current, [name]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const result = await onSubmit(fields)
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <form className={styles.optionForm} onSubmit={submit}>
      {kind === 'color' ? (
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            Английское название
            <input className={styles.input} value={fields.englishLabel} placeholder="Ultra Violet" autoComplete="off" autoFocus onChange={(event) => set('englishLabel', event.target.value)} />
          </label>
          <label className={styles.field}>
            Русское название
            <input className={styles.input} value={fields.russianLabel} placeholder="Фиолетовый" autoComplete="off" onChange={(event) => set('russianLabel', event.target.value)} />
          </label>
          <div className={styles.field}>
            <label htmlFor={hexId}>Цвет, HEX</label>
            <div className={styles.colorField}>
              <input type="color" className={styles.colorPicker} aria-label="Выбрать цвет" value={normalizeHex(fields.primaryHex) ?? '#808080'} onChange={(event) => set('primaryHex', event.target.value)} />
              <input id={hexId} className={styles.input} value={fields.primaryHex} placeholder="#7a3cff" autoComplete="off" onChange={(event) => set('primaryHex', event.target.value)} />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {kind === 'storage' ? 'Объём памяти' : 'Объём оперативной памяти'}
            <input className={styles.input} value={fields.value} placeholder={kind === 'storage' ? '256GB или 1TB' : '8GB'} autoComplete="off" autoFocus onChange={(event) => set('value', event.target.value)} />
          </label>
        </div>
      )}
      {error && <div className={`${styles.notice} ${styles.noticeError}`} role="alert">{error}</div>}
      <div className={styles.toolbar}>
        <button type="submit" className={styles.button} disabled={busy}>{busy ? 'Добавляем…' : 'Добавить и выбрать'}</button>
        <button type="button" className={styles.buttonGhost} disabled={busy} onClick={onCancel}>Отмена</button>
      </div>
    </form>
  )
}

type PanelProps = {
  dimension: Dimension
  selected: RelationId[]
  used: Set<string>
  create?: CreateAction
  onToggle: (id: RelationId) => void
  onChange: (ids: RelationId[]) => void
}

function DimensionPanel({ dimension, selected, used, create, onToggle, onChange }: PanelProps) {
  const bodyId = useId()
  const [needle, setNeedle] = useState('')
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [flash, setFlash] = useState('')
  const chosen = useMemo(() => new Set(selected.map((item) => relationId(item))), [selected])

  const options = useMemo(() => {
    const text = needle.trim().toLowerCase()
    return dimension.options
      .filter((option) => !text || option.label.toLowerCase().includes(text))
      .map((option, index) => ({ option, index, rank: used.has(relationId(option.id)) ? 0 : 1 }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((item) => item.option)
  }, [dimension.options, needle, used])

  const summary = useMemo(
    () => dimension.options.filter((option) => chosen.has(relationId(option.id))).map((option) => option.label).join(', '),
    [dimension.options, chosen],
  )

  const selectVisible = () => {
    const merged = new Map([...selected, ...options.map((option) => option.id)].map((id) => [relationId(id), id]))
    onChange([...merged.values()])
  }

  const submitCreate = async (fields: Record<string, string>): Promise<Created> => {
    if (!create) return { ok: false, error: 'Добавление недоступно.' }
    const result = await create.submit(fields)
    if (result.ok) {
      setAdding(false)
      setNeedle('')
      setFlash(result.existed ? `«${result.label}» уже есть в списке, выбрано.` : `«${result.label}» добавлено и выбрано.`)
    }
    return result
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>
          <button type="button" className={styles.disclosure} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((value) => !value)}>
            <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
            {dimension.title}
            <span className={styles.muted}>выбрано: {chosen.size}</span>
          </button>
        </h2>
        <div className={styles.toolbar}>
          {open && dimension.options.length > SEARCH_THRESHOLD && (
            <input className={styles.input} placeholder="Поиск" value={needle} onChange={(event) => setNeedle(event.target.value)} />
          )}
          {open && (
            <>
              <button type="button" className={styles.buttonGhost} onClick={selectVisible}>
                {needle.trim() ? 'Выбрать найденные' : 'Выбрать все'}
              </button>
              <button type="button" className={styles.buttonGhost} onClick={() => onChange([])}>
                Сбросить
              </button>
            </>
          )}
          {create && (
            <button
              type="button"
              className={styles.buttonGhost}
              aria-expanded={adding}
              onClick={() => {
                setFlash('')
                setOpen(true)
                setAdding((value) => !value)
              }}
            >
              {ADD_LABELS[create.kind]}
            </button>
          )}
        </div>
      </div>
      {flash && <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">{flash}</div>}
      {create && adding && <OptionForm kind={create.kind} onSubmit={submitCreate} onCancel={() => setAdding(false)} />}
      {open ? (
        <div id={bodyId} className={styles.optionGrid}>
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
      ) : (
        <div id={bodyId} className={styles.summary} title={summary}>
          {summary || 'Ничего не выбрано'}
        </div>
      )}
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

  async function createOption(key: CreatableDimension, fields: Record<string, string>): Promise<Created> {
    try {
      const result = await api<{ option: Option; existed: boolean }>('/variant-tools/create-option', { dimension: key, ...fields })
      setData((current) =>
        current && {
          ...current,
          dimensions: current.dimensions.map((dimension) => (dimension.key === key ? { ...dimension, options: withOption(dimension.options, result.option, key) } : dimension)),
        },
      )
      setPicked((current) => {
        const list = current[key] || []
        if (list.some((item) => relationId(item) === relationId(result.option.id))) return current
        return { ...current, [key]: [...list, result.option.id] }
      })
      return { ok: true, label: result.option.label, existed: result.existed }
    } catch (reason) {
      return { ok: false, error: reason instanceof Error ? reason.message : 'Не удалось добавить значение.' }
    }
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

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [key, value] of Object.entries(prices)) {
      const number = Number(value)
      if (value.trim() && Number.isFinite(number)) map[key] = number
    }
    return map
  }, [prices])
  const base = basePrice.trim() ? Number(basePrice) : undefined

  const priceGroups = useMemo(() => {
    if (!data) return []
    const storageLabel = (id: string) => labels.get(`storage:${id}`) ?? ''
    return pendingPriceGroups(picked, data.existing.map((item) => item.combo))
      .map((group) => ({
        key: group.key,
        title: [labels.get(`storage:${group.storage}`), labels.get(`sim:${group.sim}`)].filter(Boolean).join(' · '),
        storage: group.storage,
      }))
      .sort((a, b) => compareCapacity(storageLabel(a.storage), storageLabel(b.storage)))
  }, [data, picked, labels])

  const plan = useMemo(() => {
    if (!data) return null
    const hasSelection = Object.values(picked).some((list) => list && list.length > 0)
    if (!hasSelection) return null
    return planVariants({ dims: picked, common, basePrice: base, prices: priceMap, status }, data.existing.map((item) => item.combo))
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
        prices: priceMap,
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

      {data.dimensions.map((dimension) => {
        const kind = isCreatableDimension(dimension.key) ? dimension.key : null
        return (
          <DimensionPanel
            key={dimension.key}
            dimension={dimension}
            selected={picked[dimension.key] || []}
            used={usedByDimension.get(dimension.key) || EMPTY_SET}
            create={kind ? { kind, submit: (fields) => createOption(kind, fields) } : undefined}
            onToggle={(id) => toggle(dimension.key, id)}
            onChange={(ids) => setPicked((current) => ({ ...current, [dimension.key]: ids }))}
          />
        )
      })}

      <section className={styles.panel}>
        <h2>Цена и статус</h2>
        {priceGroups.length > 0 ? (
          <>
            {priceGroups.some((group) => group.title.includes(' · ')) && <div className={styles.muted}>У каждого сочетания памяти и SIM своя цена.</div>}
            <div className={styles.priceGrid}>
              {priceGroups.map((group) => (
                <label key={group.key}>
                  {group.title}
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    placeholder="Цена, ₽"
                    value={prices[group.key] || ''}
                    onChange={(event) => setPrices((current) => ({ ...current, [group.key]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
          </>
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
