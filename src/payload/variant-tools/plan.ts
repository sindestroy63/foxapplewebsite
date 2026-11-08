export const DIMENSION_KEYS = ['color', 'storage', 'sim', 'sizeOption', 'ramOption', 'connectivityOption', 'screenSizeOption'] as const
export type DimensionKey = (typeof DIMENSION_KEYS)[number]

export const COMMON_TEXT_KEYS = ['chip', 'generation', 'packageLabel', 'material', 'strapSize'] as const
export type CommonTextKey = (typeof COMMON_TEXT_KEYS)[number]

export const VARIANT_STATUSES = ['in_stock', 'preorder', 'out_of_stock'] as const
export type VariantStatus = (typeof VARIANT_STATUSES)[number]

export const MAX_NEW_VARIANTS = 200

export type RelationId = string | number
export type VariantRow = Record<string, unknown> & { id?: string }

export type BuildInput = {
  dims: Partial<Record<DimensionKey, RelationId[]>>
  common?: Partial<Record<CommonTextKey, string>>
  basePrice?: number
  prices?: Record<string, number>
  status?: VariantStatus
}

export type PriceGroup = { key: string; storage: string; sim: string }

export type BuildPlan =
  | { ok: true; add: VariantRow[]; skipped: number }
  | { ok: false; error: string }

export type VariantChange = {
  variantId: string
  price?: number
  status?: VariantStatus
  isAvailable?: boolean
}

export type ProductChange = {
  price?: number
  status?: VariantStatus
  isAvailable?: boolean
}

export function validateProductChange(change: ProductChange): { ok: true; data: ProductChange } | { ok: false; error: string } {
  const data: ProductChange = {}
  if (change.price !== undefined) {
    if (!isValidPrice(change.price)) return { ok: false, error: 'Цена должна быть целым числом больше нуля.' }
    data.price = change.price
  }
  if (change.status !== undefined) {
    if (!isVariantStatus(change.status)) return { ok: false, error: 'Неизвестный статус.' }
    data.status = change.status
  }
  if (change.isAvailable !== undefined) data.isAvailable = change.isAvailable
  if (Object.keys(data).length === 0) return { ok: false, error: 'Нет изменений для сохранения.' }
  return { ok: true, data }
}

export function relationId(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'object') return 'id' in value ? relationId(value.id) : ''
  return String(value)
}

export function comboKey(row: Record<string, unknown>): string {
  return DIMENSION_KEYS.map((key) => relationId(row[key])).join('|')
}

export function isVariantStatus(value: unknown): value is VariantStatus {
  return typeof value === 'string' && (VARIANT_STATUSES as readonly string[]).includes(value)
}

export function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function availabilityFor(status: VariantStatus): boolean {
  return status !== 'out_of_stock'
}

function product(lists: RelationId[][]): RelationId[][] {
  return lists.reduce<RelationId[][]>((rows, list) => rows.flatMap((row) => list.map((item) => [...row, item])), [[]])
}

type Expansion = { ok: true; fresh: Array<Record<string, unknown>>; skipped: number; splitSim: boolean } | { ok: false; error: string }

function expand(dims: BuildInput['dims'], existing: Array<Record<string, unknown>>): Expansion {
  const lists = DIMENSION_KEYS.map((key) => {
    const raw = dims[key] || []
    return [...new Map(raw.map((item) => [relationId(item), item])).values()]
  })
  const hasDimension = lists.some((list) => list.length > 0)
  if (!hasDimension) return { ok: false, error: 'Выберите хотя бы один цвет, память или другой параметр.' }

  const combos = product(lists.map((list) => (list.length > 0 ? list : [''])))
  if (combos.length > MAX_NEW_VARIANTS) {
    return { ok: false, error: `Слишком много комбинаций (${combos.length}). За один раз можно добавить не более ${MAX_NEW_VARIANTS}.` }
  }

  const taken = new Set(existing.map((row) => comboKey(row)))
  const fresh: Array<Record<string, unknown>> = []
  let skipped = 0

  for (const combo of combos) {
    const row: Record<string, unknown> = {}
    DIMENSION_KEYS.forEach((key, index) => {
      if (combo[index] !== '') row[key] = combo[index]
    })
    if (taken.has(comboKey(row))) {
      skipped += 1
      continue
    }
    taken.add(comboKey(row))
    fresh.push(row)
  }

  return { ok: true, fresh, skipped, splitSim: lists[DIMENSION_KEYS.indexOf('sim')].length > 1 }
}

function priceGroupOf(row: Record<string, unknown>, splitSim: boolean): PriceGroup {
  const storage = relationId(row.storage)
  const sim = splitSim ? relationId(row.sim) : ''
  return { key: `${storage}|${sim}`, storage, sim }
}

export function pendingPriceGroups(dims: BuildInput['dims'], existing: Array<Record<string, unknown>>): PriceGroup[] {
  const expanded = expand(dims, existing)
  if (!expanded.ok) return []
  const groups = new Map<string, PriceGroup>()
  for (const row of expanded.fresh) {
    const group = priceGroupOf(row, expanded.splitSim)
    if (group.storage || group.sim) groups.set(group.key, group)
  }
  return [...groups.values()]
}

export function planVariants(input: BuildInput, existing: Array<Record<string, unknown>>): BuildPlan {
  const expanded = expand(input.dims, existing)
  if (!expanded.ok) return expanded

  const status = input.status ?? 'in_stock'
  if (!isVariantStatus(status)) return { ok: false, error: 'Неизвестный статус.' }

  const common = Object.fromEntries(
    COMMON_TEXT_KEYS.flatMap((key) => {
      const value = input.common?.[key]?.trim()
      return value ? [[key, value]] : []
    }),
  )

  const add: VariantRow[] = []
  for (const row of expanded.fresh) {
    const group = priceGroupOf(row, expanded.splitSim)
    const price = input.prices?.[group.key] || input.basePrice
    if (!isValidPrice(price)) {
      if (group.storage && group.sim) return { ok: false, error: 'Укажите цену для каждого сочетания памяти и SIM.' }
      if (group.sim) return { ok: false, error: 'Укажите цену для каждого типа SIM.' }
      return { ok: false, error: group.storage ? 'Укажите цену для каждой выбранной памяти.' : 'Укажите цену.' }
    }
    add.push({ ...row, ...common, price, status, isAvailable: availabilityFor(status) })
  }

  return { ok: true, add, skipped: expanded.skipped }
}

export function applyVariantChanges(
  rows: VariantRow[],
  changes: VariantChange[],
): { ok: true; rows: VariantRow[]; changed: number } | { ok: false; error: string } {
  const byId = new Map(rows.map((row) => [String(row.id), row]))
  const patches = new Map<string, VariantChange>()

  for (const change of changes) {
    if (!byId.has(change.variantId)) return { ok: false, error: `Вариант ${change.variantId} не найден.` }
    if (change.price !== undefined && !isValidPrice(change.price)) return { ok: false, error: 'Цена должна быть целым числом больше нуля.' }
    if (change.status !== undefined && !isVariantStatus(change.status)) return { ok: false, error: 'Неизвестный статус.' }
    patches.set(change.variantId, { ...patches.get(change.variantId), ...change })
  }

  let changed = 0
  const next = rows.map((row) => {
    const patch = patches.get(String(row.id))
    if (!patch) return row
    const updated: VariantRow = { ...row }
    if (patch.price !== undefined) updated.price = patch.price
    if (patch.status !== undefined) updated.status = patch.status
    if (patch.isAvailable !== undefined) updated.isAvailable = patch.isAvailable
    else if (patch.status !== undefined) updated.isAvailable = availabilityFor(patch.status)
    if (updated.price !== row.price || updated.status !== row.status || updated.isAvailable !== row.isAvailable) changed += 1
    return updated
  })

  return { ok: true, rows: next, changed }
}
