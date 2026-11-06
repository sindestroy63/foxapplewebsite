'use client'

import { useEffect, useMemo, useState } from 'react'

import { isVariantStatus, isValidPrice, type VariantStatus } from '../../variant-tools/plan'
import { api, STATUS_LABELS } from './variant-tools-api'
import styles from './VariantTools.module.css'

type Row = { id: string; sku: string; title: string; colorHex: string; price: number | null; status: string; isAvailable: boolean }
type Product = { id: string | number; name: string; group: string; brand: string; status: string; isAvailable: boolean; price: number | null; variants: Row[] }
type Edit = { price?: string; status?: VariantStatus; isAvailable?: boolean }
type Edits = Record<string, Record<string, Edit>>
type Change = { price?: number; status?: VariantStatus; isAvailable?: boolean }

const PAGE_SIZE = 25
const PRODUCT_ROW = '__product'

const GROUPS: Record<string, string> = {
  smartphones: 'Смартфоны',
  tablets: 'Планшеты',
  laptops: 'Ноутбуки',
  'smart-watches': 'Смарт-часы',
  audio: 'Наушники и аудио',
  'gaming-consoles': 'Игровые консоли',
  'home-appliances': 'Бытовая техника',
  'smart-devices': 'Умные устройства',
  accessories: 'Аксессуары',
  other: 'Другое',
  'trade-in': 'Trade-in / Б/У',
}

function rowsOf(product: Product): Row[] {
  if (product.variants.length > 0) return product.variants
  return [{ id: PRODUCT_ROW, sku: '', title: 'Товар без вариантов (галочка: показывать на сайте)', colorHex: '', price: product.price, status: product.status, isAvailable: product.isAvailable }]
}

function diff(row: Row, edit: Edit | undefined): Change {
  const change: Change = {}
  if (!edit) return change
  if (edit.price !== undefined && Number(edit.price) !== row.price) change.price = Number(edit.price)
  if (edit.status !== undefined && edit.status !== row.status) change.status = edit.status
  if (edit.isAvailable !== undefined && edit.isAvailable !== row.isAvailable) change.isAvailable = edit.isAvailable
  return change
}

function isChanged(row: Row, edit: Edit | undefined): boolean {
  return Object.keys(diff(row, edit)).length > 0
}

export function StockPricesClient() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [edits, setEdits] = useState<Edits>({})
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [filter, setFilter] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    api<{ products: Product[] }>('/variant-tools/overview')
      .then((result) => setProducts(result.products))
      .catch((reason: Error) => setMessage({ kind: 'error', text: reason.message }))
  }, [])

  const groups = useMemo(() => [...new Set((products || []).map((item) => item.group).filter(Boolean))], [products])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (products || []).filter((product) => {
      if (needle && !product.name.toLowerCase().includes(needle)) return false
      if (group && product.group !== group) return false
      const rows = rowsOf(product)
      if (filter === 'changed') return rows.some((row) => isChanged(row, edits[String(product.id)]?.[row.id]))
      if (filter === 'out_of_stock') return rows.some((row) => row.status === 'out_of_stock')
      if (filter === 'in_stock') return rows.some((row) => row.status === 'in_stock')
      if (filter === 'hidden') return rows.some((row) => !row.isAvailable)
      return true
    })
  }, [products, query, group, filter, edits])

  const changedCount = useMemo(() => {
    let total = 0
    for (const product of products || []) {
      for (const row of rowsOf(product)) {
        if (isChanged(row, edits[String(product.id)]?.[row.id])) total += 1
      }
    }
    return total
  }, [products, edits])

  const patch = (productId: string | number, rowId: string, change: Edit) => {
    setEdits((current) => {
      const product = { ...current[String(productId)] }
      product[rowId] = { ...product[rowId], ...change }
      return { ...current, [String(productId)]: product }
    })
  }

  async function saveProduct(product: Product): Promise<number> {
    const productEdits = edits[String(product.id)] || {}
    const variantChanges: Array<Change & { variantId: string }> = []
    let productChange: Change | null = null

    for (const row of rowsOf(product)) {
      const change = diff(row, productEdits[row.id])
      if (Object.keys(change).length === 0) continue
      if (change.price !== undefined && !isValidPrice(change.price)) {
        throw new Error(`${product.name}: цена должна быть целым числом больше нуля.`)
      }
      if (row.id === PRODUCT_ROW) productChange = change
      else variantChanges.push({ variantId: row.id, ...change })
    }

    if (variantChanges.length === 0 && !productChange) return 0
    await api('/variant-tools/update', {
      productId: product.id,
      ...(variantChanges.length > 0 ? { changes: variantChanges } : {}),
      ...(productChange ? { product: productChange } : {}),
    })
    return variantChanges.length + (productChange ? 1 : 0)
  }

  async function saveMany(targets: Product[]) {
    if (busy) return
    setBusy(true)
    setMessage(null)
    let saved = 0
    try {
      for (const product of targets) saved += await saveProduct(product)
      const fresh = await api<{ products: Product[] }>('/variant-tools/overview')
      setProducts(fresh.products)
      setEdits({})
      setMessage({ kind: 'ok', text: saved ? `Сохранено изменений: ${saved}.` : 'Изменений нет.' })
    } catch (reason) {
      setMessage({ kind: 'error', text: reason instanceof Error ? reason.message : 'Не удалось сохранить.' })
    } finally {
      setBusy(false)
    }
  }

  const shown = visible.slice(0, limit)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Цены и наличие</h1>
        <p>Правьте цены и статусы прямо в таблице. Изменённые строки подсвечиваются, сохранить можно один товар или все сразу.</p>
      </header>

      <div className={styles.notice}>
        Наличие товаров, которые ведутся по остаткам МойСклад, обновляется автоматически каждые несколько секунд, поэтому ручной статус у них будет перезаписан. Цены синхронизация не меняет.
      </div>

      {message && <div className={`${styles.notice} ${message.kind === 'ok' ? styles.noticeSuccess : styles.noticeError}`}>{message.text}</div>}

      <div className={styles.toolbar}>
        <input className={`${styles.input} ${styles.search}`} placeholder="Поиск по названию" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE) }} />
        <select className={styles.select} value={group} onChange={(event) => { setGroup(event.target.value); setLimit(PAGE_SIZE) }}>
          <option value="">Все разделы</option>
          {groups.map((item) => (
            <option key={item} value={item}>{GROUPS[item] || item}</option>
          ))}
        </select>
        <select className={styles.select} value={filter} onChange={(event) => { setFilter(event.target.value); setLimit(PAGE_SIZE) }}>
          <option value="">Все товары</option>
          <option value="in_stock">Есть в наличии</option>
          <option value="out_of_stock">Нет в наличии</option>
          <option value="hidden">Скрытые на сайте</option>
          <option value="changed">Только с правками</option>
        </select>
      </div>

      {!products && !message && <div className={styles.muted}>Загрузка…</div>}

      {products && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Позиция</th>
              <th className={styles.right}>Цена, ₽</th>
              <th>Статус</th>
              <th title="У варианта: можно заказать. У товара без вариантов: показывать на сайте.">Доступен</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((product) => {
              const productEdits = edits[String(product.id)] || {}
              const rows = rowsOf(product)
              const productChanged = rows.filter((row) => isChanged(row, productEdits[row.id])).length
              return (
                <ProductRows
                  key={String(product.id)}
                  product={product}
                  rows={rows}
                  productEdits={productEdits}
                  productChanged={productChanged}
                  busy={busy}
                  onPatch={patch}
                  onSave={() => saveMany([product])}
                />
              )
            })}
          </tbody>
        </table>
      )}

      {products && visible.length === 0 && <div className={styles.muted}>Ничего не найдено.</div>}

      {products && visible.length > shown.length && (
        <div className={styles.toolbar}>
          <button type="button" className={styles.buttonGhost} onClick={() => setLimit((current) => current + PAGE_SIZE)}>
            Показать ещё ({visible.length - shown.length})
          </button>
        </div>
      )}

      {changedCount > 0 && (
        <div className={styles.stickyBar}>
          <span>Изменено позиций: {changedCount}</span>
          <div className={styles.toolbar}>
            <button type="button" className={styles.buttonGhost} disabled={busy} onClick={() => setEdits({})}>Отменить</button>
            <button type="button" className={styles.button} disabled={busy} onClick={() => saveMany(products || [])}>
              {busy ? 'Сохраняем…' : 'Сохранить все'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type ProductRowsProps = {
  product: Product
  rows: Row[]
  productEdits: Record<string, Edit>
  productChanged: number
  busy: boolean
  onPatch: (productId: string | number, rowId: string, change: Edit) => void
  onSave: () => void
}

function ProductRows({ product, rows, productEdits, productChanged, busy, onPatch, onSave }: ProductRowsProps) {
  return (
    <>
      <tr className={styles.productRow}>
        <td colSpan={3}>
          <a className={styles.link} href={`/admin/collections/products/${product.id}`}>{product.name}</a>{' '}
          <span className={styles.badge}>{GROUPS[product.group] || product.group || 'Без раздела'}</span>
        </td>
        <td className={styles.right}>
          {productChanged > 0 && (
            <button type="button" className={styles.button} disabled={busy} onClick={onSave}>
              Сохранить ({productChanged})
            </button>
          )}
        </td>
      </tr>
      {rows.map((row) => {
        const edit = productEdits[row.id]
        const changed = isChanged(row, edit)
        const price = edit?.price ?? (row.price === null ? '' : String(row.price))
        const status = edit?.status ?? (isVariantStatus(row.status) ? row.status : 'in_stock')
        const available = edit?.isAvailable ?? row.isAvailable
        return (
          <tr key={row.id} className={changed ? styles.rowChanged : undefined}>
            <td>
              <div className={styles.variantName}>
                {row.colorHex && <span className={styles.swatch} style={{ background: row.colorHex }} />}
                <div>
                  {row.title}
                  {row.sku && <div className={styles.sku}>{row.sku}</div>}
                </div>
              </div>
            </td>
            <td className={styles.right}>
              <input
                className={`${styles.input} ${styles.priceInput}`}
                inputMode="numeric"
                value={price}
                onChange={(event) => onPatch(product.id, row.id, { price: event.target.value.replace(/[^\d]/g, '') })}
              />
            </td>
            <td>
              <select
                className={styles.select}
                value={status}
                onChange={(event) => {
                  const next = event.target.value
                  if (isVariantStatus(next)) onPatch(product.id, row.id, { status: next })
                }}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </td>
            <td>
              <input type="checkbox" checked={available} onChange={(event) => onPatch(product.id, row.id, { isAvailable: event.target.checked })} />
            </td>
          </tr>
        )
      })}
    </>
  )
}
