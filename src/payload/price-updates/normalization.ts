export type NormalizedModel = {
  key: string
  label: string
}

function clean(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').toLowerCase()
      .replace(/\u0451/g, '\u0435')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ')
    : ''
}

export function normalizeModelKey(value: unknown): string {
  const raw = clean(value).replace(/^(?:apple|samsung)\s+/u, '').replace(/^galaxy\s+/u, '')
  if (!raw) return ''
  if (/^(?:17|iphone 17)$/u.test(raw)) return 'iphone 17'
  if (/^(?:17\s+pro|iphone 17\s+pro)$/u.test(raw)) return 'iphone 17 pro'
  if (/^(?:17\s+(?:pro\s+)?max|iphone 17\s+(?:pro\s+)?max)$/u.test(raw)) return 'iphone 17 pro max'
  if (/^(?:17e|iphone 17e)$/u.test(raw)) return 'iphone 17e'
  if (/^(?:air|17 air|iphone air|iphone 17 air)$/u.test(raw)) return 'iphone air'
  if (/^airpods\s+4\s+(?:anc|\u0441\s+\u0448\u0443\u043c\u043e\u043f\u043e\u0434\u0430\u0432\u043b\u0435\u043d\u0438\u0435\u043c)$/u.test(raw)) return 'airpods 4 anc'
  if (/^airpods\s+4$/u.test(raw)) return 'airpods 4'
  if (/^airpods\s+pro\s+3$/u.test(raw)) return 'airpods pro 3'
  if (/^airpods\s+pro\s+2(?:\s+type c)?$/u.test(raw)) return 'airpods pro 2'
  if (/^airpods\s+max\s*2(?:\s+2026)?$/u.test(raw)) return 'airpods max 2'
  if (/^airpods\s+max(?:\s+usb c)?$/u.test(raw)) return 'airpods max'
  if (/^(?:mini|ipad\s+mini)(?:\s+7)?$/u.test(raw)) return 'ipad mini'
  if (/^(?:ipad\s+)?(?:air\s+)?(?:13|11)\s+m[34]$/u.test(raw)) return `ipad air ${raw.replace(/^ipad\s+/u, '')}`
  if (/^(?:ipad\s+)?(?:air\s+)?(?:13|11)\s+m[34]$/u.test(raw)) return `ipad air ${raw}`
  if (/^(?:air\s+)?(?:13|11)\s+m[34]$/u.test(raw)) return `ipad air ${raw}`
  if (/^(?:ipad\s+)?pro(?:\s+13)?(?:\s+m[45])?$/u.test(raw)) return `ipad ${raw}`
  if (/^ipad(?:\s+11)?$/u.test(raw)) return 'ipad'
  if (/^(?:watch\s+)?se\s*3$/u.test(raw)) return 'apple watch se 3'
  if (/^(?:mac\s+)?neo\s+13$/u.test(raw)) return 'mac neo 13'
  if (/^(?:mac\s+)?air\s+(?:13|15)$/u.test(raw)) return `mac air ${raw.replace(/^mac\s+/u, '')}`
  if (/^(?:mac\s+)?pro\s+(?:14|16)$/u.test(raw)) return `mac pro ${raw.replace(/^mac\s+/u, '')}`
  const samsung = raw.match(/^(?:samsung\s+)?(?:galaxy\s+)?(s\d{2})(?:\s+(plus|ultra))?$/u)
  if (samsung) return `samsung galaxy ${samsung[1]}${samsung[2] ? ` ${samsung[2]}` : ''}`
  if (/^(?:watch\s+)?s\s*\d{2}$/u.test(raw)) return `apple watch series ${raw.replace(/^(?:watch\s+)?s\s*/u, '')}`
  if (/^(?:watch\s+)?ul(?:tra)?\s*\d$/u.test(raw)) return `apple watch ultra ${raw.replace(/^(?:watch\s+)?ul(?:tra)?\s*/u, '')}`
  if (/^z\s*fold\s*8(?:\s*\(\s*2026\s*\))?$/u.test(raw)) return 'z fold 8'
  if (/^playstation\s+5\s+(?:slim\s+)?(?:disk|disc|diskovodom|\u0441\s+\u0434\u0438\u0441\u043a\u043e\u0432\u043e\u0434\u043e\u043c|1\s*\u0442\u0431)(?:\s+.*)?$/iu.test(raw)) return 'playstation 5 slim disk'
  if (/^playstation\s+5\s+(?:slim\s+)?(?:digital|\u0446\u0438\u0444\u0440\u043e\u0432\u0430\u044f)(?:\s+.*)?$/iu.test(raw)) return 'playstation 5 slim digital'
  return raw
}

export function normalizeModel(value: unknown, contextHeading?: unknown): NormalizedModel {
  const raw = clean(value)
  // A group heading may be the only model signal after storage/color/SIM are removed.
  const key = normalizeModelKey(raw) || normalizeModelKey(contextHeading)
  if (key === 'iphone 17 pro max' || key === 'iphone 17 pro' || key === 'iphone 17') return { key, label: key.replace(/^iphone\s+/u, 'iPhone ') }
  if (key === 'samsung galaxy s25 ultra') return { key, label: 'Samsung Galaxy S25 Ultra' }
  if (key === 'samsung galaxy s26') return { key, label: 'Samsung Galaxy S26' }
  if (key === 'samsung galaxy s26 ultra') return { key, label: 'Samsung Galaxy S26 Ultra' }
  return { key, label: value && String(value).trim() ? String(value).trim() : key }
}

export function normalizeStorage(value?: unknown): string {
  const raw = clean(value).replace(/[\u0433\u0431]/gu, 'gb').replace(/[\u0442\u0431]/gu, 'tb').replace(/\u0420\u0456\u0420\u00b1/g, 'gb').replace(/\u0421\u201a\u0420\u00b1/g, 'tb')
  const matches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(gb|tb)/g)]
  return matches.length ? `${matches[matches.length - 1][1]}${matches[matches.length - 1][2].toUpperCase()}` : ''
}

export function normalizeRam(value?: unknown): string {
  const raw = clean(value).replace(/[\u0433\u0431]/gu, 'gb').replace(/\u0420\u0456\u0420\u00b1/g, 'gb')
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(?:gb)?/u)
  return match ? `${match[1]}GB` : ''
}

export function normalizeSim(value?: unknown): string {
  const raw = clean(value).replace(/[+\-_/]/g, ' ')
  if (!raw) return ''
  const hasNumberedSim = /\b1\s*sim\b/u.test(raw)
  const hasSim = /(?:\bsim\b|\d+sim\b)/u.test(raw)
  const hasEsim = /\besim\b/u.test(raw)
  if (hasNumberedSim || (hasEsim && hasSim)) return 'sim+esim'
  if (hasEsim) return 'esim'
  if (hasSim) return 'sim'
  return raw.replace(/\s/g, '')
}

export function normalizeRegion(value?: unknown): string {
  if (typeof value === 'string') {
    const flags: Record<string, string> = {
      '\u{1f1ee}\u{1f1f3}': 'India',
      '\u{1f1ed}\u{1f1f0}': 'Hong Kong',
      '\u{1f1ef}\u{1f1f5}': 'Japan',
      '\u{1f1f2}\u{1f1fe}': 'Malaysia',
      '\u{1f1f0}\u{1f1fc}': 'Kuwait',
      '\u{1f1ea}\u{1f1fa}': 'Europe',
      '\u{1f1fa}\u{1f1f8}': 'United States',
      '\u{1f1f0}\u{1f1f7}': 'South Korea',
      '\u{1f1e8}\u{1f1f3}': 'China',
      '\u{1f1e6}\u{1f1ea}': 'United Arab Emirates',
    }
    if (flags[value]) return flags[value]
  }
  const raw = clean(value)
  const regions: Record<string, string> = {
    india: 'India',
    '\u0438\u043d\u0434\u0438\u044f': 'India',
    'hong kong': 'Hong Kong',
    '\u0433\u043e\u043d\u043a\u043e\u043d\u0433': 'Hong Kong',
    japan: 'Japan',
    '\u044f\u043f\u043e\u043d\u0438\u044f': 'Japan',
    malaysia: 'Malaysia',
    kuwait: 'Kuwait',
    '\u043a\u0443\u0432\u0435\u0439\u0442': 'Kuwait',
    eu: 'Europe',
    europe: 'Europe',
    '\u0435\u0432\u0440\u043e\u043f\u0430': 'Europe',
    us: 'United States',
    usa: 'United States',
    'united states': 'United States',
    '\u0441\u0448\u0430': 'United States',
    korea: 'South Korea',
    'south korea': 'South Korea',
    '\u044e\u0436\u043d\u0430\u044f \u043a\u043e\u0440\u0435\u044f': 'South Korea',
    china: 'China',
    '\u043a\u0438\u0442\u0430\u0439': 'China',
    uae: 'United Arab Emirates',
    'united arab emirates': 'United Arab Emirates',
    '\u043e\u0430\u044d': 'United Arab Emirates',
    '\u043c\u0430\u043b\u0430\u0439\u0437\u0438\u044f': 'Malaysia',
  }
  return regions[raw] || (value ? String(value).trim() : '')
}

export function normalizeColor(value?: unknown, model?: unknown): string {
  const raw = clean(value)
  if (!raw) return ''
  const modelKey = normalizeModelKey(model)
  const aliases: Record<string, string> = {}
  if (modelKey === 'iphone 17 pro' || modelKey === 'iphone 17 pro max') {
    aliases.blue = 'deep blue'
    aliases.orange = 'cosmic orange'
  }
  if (modelKey === 'iphone air') {
    aliases.blue = 'sky blue'
    aliases.gold = 'light gold'
    aliases.black = 'space black'
    aliases.white = 'cloud white'
  }
  if (modelKey === 'iphone 17e') aliases.pink = 'soft pink'
  if (modelKey === 'samsung galaxy s26' || modelKey === 'samsung galaxy s26 ultra') {
    aliases.blue = 'sky blue'
    aliases.violet = 'cobalt violet'
  }
  return aliases[raw] || raw
}

export function canonicalText(value?: unknown): string {
  return clean(value).replace(/\s/g, '')
}
