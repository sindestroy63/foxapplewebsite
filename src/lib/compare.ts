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
  long: boolean
}

const LONG_VALUE_LENGTH = 120

const COMPARE_ROWS: Array<{ key: string; label: string; hideWhenSame?: boolean }> = [
  { key: 'brand', label: 'Бренд', hideWhenSame: true },
  { key: 'line', label: 'Линейка', hideWhenSame: true },
  { key: 'screen', label: 'Экран' },
  { key: 'chip', label: 'Процессор' },
  { key: 'ram', label: 'Оперативная память' },
  { key: 'storage', label: 'Накопитель' },
  { key: 'camera', label: 'Камеры' },
  { key: 'battery', label: 'Аккумулятор' },
  { key: 'charging', label: 'Зарядка' },
  { key: 'protection', label: 'Защита' },
  { key: 'weight', label: 'Вес и размеры' },
  { key: 'connectivity', label: 'Связь' },
  { key: 'sim', label: 'SIM' },
  { key: 'os', label: 'Система' },
  { key: 'colors', label: 'Цвета' },
  { key: 'size', label: 'Размер' },
  { key: 'material', label: 'Материал' },
  { key: 'strap', label: 'Размер ремешка' },
  { key: 'generation', label: 'Поколение' },
  { key: 'revision', label: 'Версия' },
  { key: 'package', label: 'Комплектация' },
  { key: 'extras', label: 'Дополнительно' },
  { key: 'summary', label: 'О товаре' },
]

const DESCRIPTION_KEYS: Array<{ pattern: RegExp; key: string; prefix?: string }> = [
  { pattern: /^(экран|экраны|дисплей)$/i, key: 'screen' },
  { pattern: /^(процессор|чип)$/i, key: 'chip' },
  { pattern: /^память$/i, key: 'memory' },
  { pattern: /^(камеры|камера)$/i, key: 'camera' },
  { pattern: /^основная камера$/i, key: 'camera', prefix: 'Основная' },
  { pattern: /^фронтальная камера$/i, key: 'camera', prefix: 'Фронтальная' },
  { pattern: /^(аккумулятор|батарея|автономность)$/i, key: 'battery' },
  { pattern: /^зарядка$/i, key: 'charging' },
  { pattern: /^защита$/i, key: 'protection' },
  { pattern: /^(вес|габариты и вес|вес и габариты)$/i, key: 'weight' },
  { pattern: /^(связь и интерфейсы|связь|порты?)$/i, key: 'connectivity' },
  { pattern: /^(ос|ос и по)$/i, key: 'os' },
  { pattern: /^комплектация$/i, key: 'package' },
  { pattern: /^(дополнительно|дополнительные особенности)$/i, key: 'extras' },
]

export type ParsedDescription = {
  intro: string
  specs: Record<string, string>
}

function trimSentence(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= limit) return flat
  const cut = flat.slice(0, limit)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '))
  if (stop > limit * 0.5) return cut.slice(0, stop + 1).trim()
  const space = cut.lastIndexOf(' ')
  return `${cut.slice(0, space > 0 ? space : limit).trim()}…`
}

export function parseDescription(raw: unknown): ParsedDescription {
  const text = clean(raw)
  if (!text) return { intro: '', specs: {} }

  const collected: Record<string, string[]> = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^[·•\s-]*([^:·\n]{2,40}):\s*(.+)$/)
    if (!match) continue
    const definition = DESCRIPTION_KEYS.find((entry) => entry.pattern.test(match[1].trim()))
    if (!definition) continue
    const value = match[2].replace(/\s+/g, ' ').trim().replace(/\.$/, '')
    if (!value) continue
    const list = collected[definition.key] || (collected[definition.key] = [])
    list.push(definition.prefix ? `${definition.prefix}: ${value}` : value)
  }

  const specs: Record<string, string> = {}
  for (const [key, list] of Object.entries(collected)) specs[key] = list.join('; ')

  const firstBlock = text.split(/\r?\n\s*\r?\n/)[0] || ''
  const intro = /^[·•\s-]*[^:·\n]{2,40}:\s/.test(firstBlock) ? '' : trimSentence(firstBlock, 220)
  return { intro, specs }
}

function ramFromMemory(memory: string | undefined): string {
  if (!memory) return ''
  const match = memory.match(/(\d+(?:\s*(?:или|\/|-|–)\s*\d+)*)\s*ГБ\s*(?:ОЗУ|оперативн)/i)
  return match ? `${match[1].replace(/\s+/g, ' ')} ГБ` : ''
}

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
  const description = parseDescription(product.shortDescription)
  const described = (key: string) => (description.specs[key] ? [description.specs[key]] : [])
  const preferred = (own: string[], key: string) => (own.length ? own : described(key))

  return {
    brand: unique([product.brand]),
    line: unique([product.productLine]),
    screen: preferred(unique([...fromVariants((variant) => variant.screenSize), product.screenSize]), 'screen'),
    chip: preferred(unique([...fromVariants((variant) => variant.chip), product.chip]), 'chip'),
    ram: unique([...fromVariants((variant) => variant.ram), product.ram, ramFromMemory(description.specs.memory)]).slice(0, 1),
    storage: sortStorage(unique([...fromVariants((variant) => variant.storage || variant.memory), product.memory])),
    camera: described('camera'),
    battery: described('battery'),
    charging: described('charging'),
    protection: described('protection'),
    weight: described('weight'),
    connectivity: preferred(unique([...fromVariants((variant) => variant.connectivity), product.connectivity]), 'connectivity'),
    sim: unique([...fromVariants((variant) => simLabel(variant.sim || variant.simType)), simLabel(product.simType)]),
    os: described('os'),
    colors: unique([...fromVariants((variant) => colorLabel(variant.color)), colorLabel(product.color)]),
    size: unique([...fromVariants((variant) => variant.size), product.size]),
    material: unique(fromVariants((variant) => variant.material)),
    strap: unique(fromVariants((variant) => variant.strapSize)),
    generation: unique([...fromVariants((variant) => variant.generation), product.generation]),
    revision: unique([...fromVariants((variant) => variant.revision), product.revision]),
    package: preferred(unique([...fromVariants((variant) => variant.packageLabel), product.packageLabel]), 'package'),
    extras: described('extras'),
    summary: unique([description.intro]),
  }
}

export function buildCompareRows(items: CompareItem[]): CompareRowView[] {
  const rows: CompareRowView[] = []
  for (const definition of COMPARE_ROWS) {
    const values = items.map((item) => item.specs[definition.key] || [])
    if (!values.some((list) => list.length > 0)) continue
    const filled = values.filter((list) => list.length > 0)
    const signatures = new Set(filled.map((list) => list.map((value) => value.toLowerCase()).join('|')))
    const different = filled.length > 1 && signatures.size > 1
    if (definition.hideWhenSame && !different) continue
    rows.push({
      key: definition.key,
      label: definition.label,
      values,
      different,
      long: values.some((list) => list.join(', ').length > LONG_VALUE_LENGTH),
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

export type CompareEntry = { id: string; group: string }

export type CompareToggleResult = 'added' | 'removed' | 'full' | 'group'

export function parseCompareEntries(raw: unknown): CompareEntry[] {
  const list = Array.isArray(raw) ? raw : []
  const entries: CompareEntry[] = []
  for (const candidate of list) {
    if (!candidate || typeof candidate !== 'object') continue
    const id = String((candidate as CompareEntry).id).trim()
    const group = String((candidate as CompareEntry).group || '').trim()
    if (!/^\d{1,12}$/.test(id) || !/^[a-z0-9-]{1,40}$/.test(group)) continue
    if (entries.some((entry) => entry.id === id)) continue
    if (entries.length > 0 && entries[0].group !== group) continue
    entries.push({ id, group })
    if (entries.length >= COMPARE_LIMIT) break
  }
  return entries
}

export function toggleCompareEntry(entries: CompareEntry[], entry: CompareEntry): { entries: CompareEntry[]; result: CompareToggleResult } {
  if (entries.some((current) => current.id === entry.id)) {
    return { entries: entries.filter((current) => current.id !== entry.id), result: 'removed' }
  }
  if (entries.length > 0 && entries[0].group !== entry.group) return { entries, result: 'group' }
  if (entries.length >= COMPARE_LIMIT) return { entries, result: 'full' }
  return { entries: [...entries, entry], result: 'added' }
}
