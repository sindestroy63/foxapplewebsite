export type CapacityKind = 'storage' | 'ram'
export type Capacity = { value: string; gb: number }

export const CREATABLE_DIMENSIONS = ['color', 'storage', 'ramOption'] as const
export type CreatableDimension = (typeof CREATABLE_DIMENSIONS)[number]

export type NewColor = { englishLabel: string; russianLabel: string; primaryHex: string; slug: string }

const MAX_LABEL_LENGTH = 60

export function isCreatableDimension(value: unknown): value is CreatableDimension {
  return typeof value === 'string' && (CREATABLE_DIMENSIONS as readonly string[]).includes(value)
}

export function parseCapacity(raw: unknown, kind: CapacityKind): Capacity | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw
    .normalize('NFKC')
    .replace(/[\s\u00A0]+/gu, '')
    .toUpperCase()
    .replace(/ГБ$/u, 'GB')
    .replace(/ТБ$/u, 'TB')
  const match = /^([1-9]\d{0,3})(GB|TB)$/.exec(cleaned)
  if (!match) return null
  const amount = Number(match[1])
  if (match[2] === 'GB') return { value: `${amount}GB`, gb: amount }
  if (kind === 'ram') return null
  return { value: `${amount}TB`, gb: amount * 1024 }
}

export function compareCapacity(a: string, b: string): number {
  const left = parseCapacity(a, 'storage')?.gb ?? Number.POSITIVE_INFINITY
  const right = parseCapacity(b, 'storage')?.gb ?? Number.POSITIVE_INFINITY
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function normalizeHex(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw.trim())
  if (!match) return null
  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1]
  return `#${digits.toLowerCase()}`
}

export function colorSlug(english: string): string {
  return english
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  let index = 2
  while (taken.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

export function validateNewColor(input: { englishLabel?: unknown; russianLabel?: unknown; primaryHex?: unknown }): { ok: true; data: NewColor } | { ok: false; error: string } {
  const englishLabel = typeof input.englishLabel === 'string' ? input.englishLabel.trim().replace(/\s+/g, ' ') : ''
  const russianLabel = typeof input.russianLabel === 'string' ? input.russianLabel.trim().replace(/\s+/g, ' ') : ''
  if (!englishLabel) return { ok: false, error: 'Введите английское название цвета.' }
  if (!russianLabel) return { ok: false, error: 'Введите русское название цвета.' }
  if (englishLabel.length > MAX_LABEL_LENGTH || russianLabel.length > MAX_LABEL_LENGTH) {
    return { ok: false, error: `Название цвета не длиннее ${MAX_LABEL_LENGTH} символов.` }
  }
  const slug = colorSlug(englishLabel)
  if (!slug) return { ok: false, error: 'Английское название должно содержать латинские буквы или цифры.' }
  const primaryHex = normalizeHex(input.primaryHex)
  if (!primaryHex) return { ok: false, error: 'Укажите цвет в формате #RRGGBB.' }
  return { ok: true, data: { englishLabel, russianLabel, primaryHex, slug } }
}
