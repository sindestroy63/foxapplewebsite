import { relationId } from './plan.ts'

export type CapacityKind = 'storage' | 'ram'
export type Capacity = { value: string; gb: number }
export type Storage = Capacity & { ramGb: number }

export const CREATABLE_DIMENSIONS = ['color', 'storage', 'ramOption'] as const
export type CreatableDimension = (typeof CREATABLE_DIMENSIONS)[number]

export type NewColor = { englishLabel: string; russianLabel: string; primaryHex: string; slug: string }

const MAX_LABEL_LENGTH = 60

export function isCreatableDimension(value: unknown): value is CreatableDimension {
  return typeof value === 'string' && (CREATABLE_DIMENSIONS as readonly string[]).includes(value)
}

function capacityText(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[\s\u00A0]+/gu, '')
    .toUpperCase()
    .replace(/ГБ$/u, 'GB')
    .replace(/ТБ$/u, 'TB')
}

export function parseCapacity(raw: unknown, kind: CapacityKind): Capacity | null {
  if (typeof raw !== 'string') return null
  const match = /^([1-9]\d{0,3})(GB|TB)$/.exec(capacityText(raw))
  if (!match) return null
  const amount = Number(match[1])
  if (match[2] === 'GB') return { value: `${amount}GB`, gb: amount }
  if (kind === 'ram') return null
  return { value: `${amount}TB`, gb: amount * 1024 }
}

export function parseStorage(raw: unknown): Storage | null {
  if (typeof raw !== 'string') return null
  const match = /^(?:([1-9]\d?)\/)?([1-9]\d{0,3})(GB|TB)$/.exec(capacityText(raw))
  if (!match) return null
  const ramGb = match[1] ? Number(match[1]) : 0
  const amount = Number(match[2])
  const prefix = ramGb ? `${ramGb}/` : ''
  return { value: `${prefix}${amount}${match[3]}`, gb: match[3] === 'TB' ? amount * 1024 : amount, ramGb }
}

export function compareCapacity(a: string, b: string): number {
  const rank = (label: string) => {
    const parsed = parseStorage(label)
    return parsed ? [parsed.gb, parsed.ramGb] : [Number.POSITIVE_INFINITY, 0]
  }
  const [leftGb, leftRam] = rank(a)
  const [rightGb, rightRam] = rank(b)
  if (leftGb !== rightGb) return leftGb < rightGb ? -1 : 1
  if (leftRam !== rightRam) return leftRam < rightRam ? -1 : 1
  return 0
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

export function colorPhotoCounts(colorImages: unknown): Record<string, number> {
  const counts: Record<string, number> = {}
  if (!Array.isArray(colorImages)) return counts
  for (const group of colorImages) {
    if (group === null || typeof group !== 'object') continue
    const color = relationId('color' in group ? group.color : null)
    const images = 'images' in group && Array.isArray(group.images) ? group.images.length : 0
    if (color && images > 0) counts[color] = (counts[color] ?? 0) + images
  }
  return counts
}
