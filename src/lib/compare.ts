import type { Product, ProductVariant } from './types'

export const COMPARE_LIMIT = 4
export const COMPARE_STORAGE_KEY = 'foxstore-compare'

export type CompareSpecs = Record<string, string[]>

export type CompareItem = {
  id: string
  name: string
  href: string
  image: string | null
  imageAlt: string
  price: number
  priceFrom: boolean
  available: boolean
  statusLabel: string
  specs: CompareSpecs
}

export type CompareRowView = {
  key: string
  label: string
  values: string[][]
  different: boolean
}

const COMPARE_ROWS: Array<{ key: string; label: string }> = [
  { key: 'brand', label: 'Бренд' },
  { key: 'line', label: 'Линейка' },
  { key: 'chip', label: 'Процессор' },
  { key: 'ram', label: 'Оперативная память' },
  { key: 'storage', label: 'Встроенная память' },
  { key: 'screen', label: 'Дисплей' },
  { key: 'connectivity', label: 'Подключение' },
  { key: 'sim', label: 'SIM' },
  { key: 'colors', label: 'Цвета' },
  { key: 'size', label: 'Размер' },
  { key: 'material', label: 'Материал' },
  { key: 'strap', label: 'Размер ремешка' },
  { key: 'generation', label: 'Поколение' },
  { key: 'revision', label: 'Версия' },
  { key: 'package', label: 'Комплектация' },
  { key: 'summary', label: 'Коротко о товаре' },
]

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function unique(values: unknown[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const text = clean(value)
    const key = text.toLowerCase()
    if (text && !seen.has(key)) {
      seen.add(key)
      result.push(text)
    }
  }
  return result
}

function colorLabel(color: unknown): string {
  if (!color) return ''
  if (typeof color === 'string') return clean(color)
  if (typeof color === 'object') {
    const value = color as { russianLabel?: unknown; englishLabel?: unknown; value?: unknown }
    return clean(value.russianLabel) || clean(value.englishLabel) || clean(value.value)
  }
  return ''
}

function simLabel(value: unknown): string {
  const text = clean(value)
  if (!text) return ''
  const key = text.toUpperCase().replace(/[\s_+-]+/g, '')
  if (key === 'SIMESIM' || key === 'SIMANDESIM') return 'SIM + eSIM'
  if (key === 'ESIM') return 'eSIM'
  if (key === 'SIM' || key === 'NANOSIM') return 'SIM'
  return text
}

function storageBytes(label: string): number {
  const match = label.match(/(\d+(?:[.,]\d+)?)\s*(TB|ТБ|GB|ГБ)/i)
  if (!match) return Number.POSITIVE_INFINITY
  const amount = Number(match[1].replace(',', '.'))
  return /^(TB|ТБ)$/i.test(match[2]) ? amount * 1024 : amount
}

function sortStorage(values: string[]): string[] {
  return [...values].sort((a, b) => storageBytes(a) - storageBytes(b))
}

export function productSpecs(product: Product): CompareSpecs {
  const variants: ProductVariant[] = product.variants?.length ? product.variants : []
  const fromVariants = (pick: (variant: ProductVariant) => unknown) => variants.map(pick)

  return {
    brand: unique([product.brand]),
    line: unique([product.productLine]),
    chip: unique([...fromVariants((variant) => variant.chip), product.chip]),
    ram: unique([...fromVariants((variant) => variant.ram), product.ram]),
    storage: sortStorage(unique([...fromVariants((variant) => variant.storage || variant.memory), product.memory])),
    screen: unique([...fromVariants((variant) => variant.screenSize), product.screenSize]),
    connectivity: unique([...fromVariants((variant) => variant.connectivity), product.connectivity]),
    sim: unique([...fromVariants((variant) => simLabel(variant.sim || variant.simType)), simLabel(product.simType)]),
    colors: unique([...fromVariants((variant) => colorLabel(variant.color)), colorLabel(product.color)]),
    size: unique([...fromVariants((variant) => variant.size), product.size]),
    material: unique(fromVariants((variant) => variant.material)),
    strap: unique(fromVariants((variant) => variant.strapSize)),
    generation: unique([...fromVariants((variant) => variant.generation), product.generation]),
    revision: unique([...fromVariants((variant) => variant.revision), product.revision]),
    package: unique([...fromVariants((variant) => variant.packageLabel), product.packageLabel]),
    summary: unique([product.shortDescription]),
  }
}

export function buildCompareRows(items: CompareItem[]): CompareRowView[] {
  const rows: CompareRowView[] = []
  for (const definition of COMPARE_ROWS) {
    const values = items.map((item) => item.specs[definition.key] || [])
    if (!values.some((list) => list.length > 0)) continue
    const filled = values.filter((list) => list.length > 0)
    const signatures = new Set(filled.map((list) => list.map((value) => value.toLowerCase()).join('|')))
    rows.push({
      key: definition.key,
      label: definition.label,
      values,
      different: filled.length > 1 && signatures.size > 1,
    })
  }
  return rows
}

export function parseCompareIds(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
  const ids: string[] = []
  for (const entry of list) {
    const id = String(entry).trim()
    if (/^\d{1,12}$/.test(id) && !ids.includes(id)) ids.push(id)
    if (ids.length >= COMPARE_LIMIT) break
  }
  return ids
}
