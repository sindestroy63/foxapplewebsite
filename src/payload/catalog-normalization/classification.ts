export type NormalizationStatus = 'auto_split' | 'auto_size' | 'auto_touch_id' | 'unchanged' | 'manual_review' | 'no_storage'

export type VariantForNormalization = {
  productId: number | string
  productSku?: string | null
  productName: string
  productSlug?: string | null
  category: { id?: number | string; slug?: string | null; name?: string | null }
  variantId?: string | null
  variantSku?: string | null
  storage?: string | null
  ram?: string | null
  size?: string | null
  hasTouchId?: boolean | null
  color?: string | null
  sim?: string | null
  screenSize?: string | null
  connectivity?: string | null
  generation?: string | null
  chip?: string | null
  price?: number | null
  images?: unknown
}

export type NormalizationRow = VariantForNormalization & {
  proposedStorage: string | null
  proposedRam: string | null
  proposedSize: string | null
  proposedHasTouchId: boolean | null
  status: NormalizationStatus
  reason: string
}

const STORAGE_VALUES = new Set(['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'])
const WATCH_CATEGORIES = new Set(['apple-watch', 'samsung-watch'])

function compact(value: string): string {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\u00A0\s]+/gu, '')
    .replace(/\u0413\u0411/gu, 'GB')
    .replace(/\u0422\u0411/gu, 'TB')
}

function row(input: VariantForNormalization, status: NormalizationStatus, reason: string, proposed: Partial<Pick<NormalizationRow, 'proposedStorage' | 'proposedRam' | 'proposedSize' | 'proposedHasTouchId'>> = {}): NormalizationRow {
  return {
    ...input,
    proposedStorage: Object.hasOwn(proposed, 'proposedStorage') ? proposed.proposedStorage! : (input.storage?.trim() || null),
    proposedRam: Object.hasOwn(proposed, 'proposedRam') ? proposed.proposedRam! : (input.ram?.trim() || null),
    proposedSize: Object.hasOwn(proposed, 'proposedSize') ? proposed.proposedSize! : (input.size?.trim() || null),
    proposedHasTouchId: Object.hasOwn(proposed, 'proposedHasTouchId') ? proposed.proposedHasTouchId! : (input.hasTouchId ?? null),
    status,
    reason,
  }
}

export function classifyVariantForNormalization(input: VariantForNormalization): NormalizationRow {
  const rawStorage = input.storage?.trim()
  if (!rawStorage) return row(input, 'no_storage', 'Storage is not set for this variant.')

  const normalized = compact(rawStorage)
  const touchIdStorage = normalized.match(/^(64GB|128GB|256GB|512GB|1TB|2TB)\|(?:\u0421|C)TOUCHID$/u)?.[1]
  if (touchIdStorage) {
    if (input.hasTouchId === false) return row(input, 'manual_review', 'Current hasTouchId=false conflicts with Touch ID in storage.')
    return row(input, 'auto_touch_id', 'Touch ID can be safely moved to the separate hasTouchId field.', {
      proposedStorage: touchIdStorage,
      proposedHasTouchId: true,
    })
  }
  if (/TOUCHID/iu.test(normalized)) return row(input, 'manual_review', 'Touch ID marker is not in an approved automatic format.')
  if (/^(LTE40MM|40MMLTE)$/u.test(normalized)) return row(input, 'manual_review', 'Storage value combines watch case size and LTE.')
  if (/^(11|13)\*?\u0414\u042e\u0419\u041c\u041e\u0412$/u.test(normalized) || /^(HS08|HS09COANDA2X|\u041f\u0410\u041c\u042f\u0422\u042c)$/u.test(normalized)) {
    return row(input, 'manual_review', 'Storage value is not an unambiguous storage, RAM, or watch case size.')
  }

  const watchSize = normalized.match(/^(40|42|44|46|47|49)MM$/u)?.[0]
  if (watchSize) {
    const size = `${watchSize.slice(0, -2)}mm`
    if (!WATCH_CATEGORIES.has(input.category.slug || '')) return row(input, 'manual_review', 'Watch case size can be moved automatically only for Apple Watch and Samsung Watch.')
    if (input.size?.trim() && input.size.trim() !== size) return row(input, 'manual_review', 'Current size conflicts with the extracted watch case size.')
    return row(input, 'auto_size', 'Watch case size can be safely moved to the separate size field.', { proposedStorage: null, proposedSize: size })
  }

  if (STORAGE_VALUES.has(normalized)) return row(input, 'unchanged', 'Storage already contains an allowed storage capacity.', { proposedStorage: normalized })

  const split = normalized.match(/^(4|6|8|12|16|24)[|/](64|128|256|512|1)(GB|TB)?$/u)
  if (split) {
    const [, rawRam, rawStorage, unit] = split
    const storage = unit ? `${rawStorage}${unit}` : rawStorage === '1' ? '' : `${rawStorage}GB`
    if (!STORAGE_VALUES.has(storage)) return row(input, 'manual_review', 'The split result is not an allowed storage capacity.')
    const ram = `${rawRam}GB`
    if (input.ram?.trim() && compact(input.ram) !== ram) return row(input, 'manual_review', 'Current RAM conflicts with the RAM extracted from storage.')
    return row(input, 'auto_split', 'Storage value can be unambiguously split into RAM and storage.', { proposedStorage: storage, proposedRam: ram })
  }

  return row(input, 'manual_review', 'Storage value is outside the approved automatic conversion rules.')
}
