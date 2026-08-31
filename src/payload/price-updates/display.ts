type DisplayProduct = {
  name?: unknown
  model?: unknown
  productGroup?: unknown
  brand?: unknown
  productType?: unknown
  productLine?: unknown
}

type DisplayVariant = {
  storage?: unknown
  ram?: unknown
  color?: unknown
  sim?: unknown
  size?: unknown
  screenSize?: unknown
  connectivity?: unknown
  generation?: unknown
  hasTouchId?: unknown
}

const GROUP_LABELS: Record<string, string> = {
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
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function relationText(value: unknown): string | undefined {
  const direct = text(value)
  if (direct) return direct
  if (!value || typeof value !== 'object') return undefined
  const relation = value as Record<string, unknown>
  for (const key of ['englishLabel', 'russianLabel', 'label', 'value', 'name']) {
    const resolved = text(relation[key])
    if (resolved) return resolved
  }
  return undefined
}

function formatCapacity(value: unknown, suffix = ''): string | undefined {
  const raw = relationText(value)
  if (!raw) return undefined
  const normalized = raw.replace(/\b(\d+)\s*GB\b/iu, '$1 ГБ').replace(/\b(\d+)\s*TB\b/iu, '$1 ТБ')
  return suffix ? `${normalized}${suffix}` : normalized
}

function formatSim(value: unknown): string | undefined {
  const raw = relationText(value)
  if (!raw) return undefined
  const key = raw.toUpperCase().replace(/[\s_-]+/g, '')
  if (key === 'SIMESIM') return 'SIM + eSIM'
  if (key === 'ESIM') return 'eSIM'
  return raw
}

function formatSize(value: unknown): string | undefined {
  const raw = relationText(value)
  return raw?.replace(/\b(\d+)\s*mm\b/iu, '$1 мм')
}

export function formatPriceUpdateTarget(product: DisplayProduct, variant?: DisplayVariant): string {
  const group = text(product.productGroup)
  const parts: Array<string | undefined> = [
    group ? GROUP_LABELS[group] || group : undefined,
    text(product.brand),
    text(product.productType),
    text(product.productLine),
    text(product.name) || text(product.model),
  ]

  if (variant) {
    parts.push(
      formatCapacity(variant.ram, ' ОЗУ'),
      formatCapacity(variant.storage),
      relationText(variant.color),
      formatSim(variant.sim),
      formatSize(variant.size),
      relationText(variant.screenSize),
      relationText(variant.connectivity),
      relationText(variant.generation),
      variant.hasTouchId === true ? 'Touch ID' : undefined,
    )
  }

  return [...new Set(parts.filter((part): part is string => Boolean(part)))].join(' / ')
}
