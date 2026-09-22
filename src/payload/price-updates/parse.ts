export const MIN_PRICE = 1
export const MAX_PRICE = 10_000_000

export type ParsedPriceLine = {
  lineNumber: number
  sourceLine: string
  sku?: string
  newCashPrice?: number
  error?: string
}

import type { AICatalogItem } from './ai-response.ts'
import { normalizeModelKey, normalizeRegion } from './normalization.ts'

export type FreeformPriceLine = {
  lineNumber: number
  sourceLine: string
  contextHeading: string
  item?: AICatalogItem
  error?: string
}

const REGION_TOKENS: Array<[RegExp, string]> = [
  [/\u{1f1ee}\u{1f1f3}|\u0438\u043d\u0434\u0438\u044f|\bindia\b/iu, 'India'],
  [/\u{1f1ed}\u{1f1f0}|\u0433\u043e\u043d\u043a\u043e\u043d\u0433|\bhong\s+kong\b/iu, 'Hong Kong'],
  [/\u{1f1ef}\u{1f1f5}|\u044f\u043f\u043e\u043d\u0438\u044f|\bjapan\b/iu, 'Japan'],
  [/\u{1f1f2}\u{1f1fe}|\u043c\u0430\u043b\u0430\u0439\u0437\u0438\u044f|\bmalaysia\b/iu, 'Malaysia'],
  [/\u{1f1f0}\u{1f1fc}|\u043a\u0443\u0432\u0435\u0439\u0442|\bkuwait\b/iu, 'Kuwait'],
  [/\u{1f1ea}\u{1f1fa}|\beu\b|\beurope\b|\u0435\u0432\u0440\u043e\u043f\u0430/iu, 'Europe'],
  [/\u{1f1fa}\u{1f1f8}|\busa?\b|\bunited\s+states\b|\u0441\u0448\u0430/iu, 'United States'],
  [/\u{1f1f0}\u{1f1f7}|\b(?:south\s+)?korea\b|\u044e\u0436\u043d\u0430\u044f\s+\u043a\u043e\u0440\u0435\u044f/iu, 'South Korea'],
  [/\u{1f1e8}\u{1f1f3}|\bchina\b|\u043a\u0438\u0442\u0430\u0439/iu, 'China'],
  [/\u{1f1e6}\u{1f1ea}|\buae\b|\bunited\s+arab\s+emirates\b|\u043e\u0430\u044d/iu, 'United Arab Emirates'],
]

const COLOR_TOKENS = ['black / black titanium milanese loop', 'natural / light blue', 'white silver', 'cosmic orange', 'space black', 'cloud white', 'light gold', 'space gray', 'jet black', 'sky blue', 'mist blue', 'deep blue', 'cobalt violet', 'rose gold', 'light blue', 'burgundy', 'glacier', 'lavender', 'starlight', 'midnight', 'indigo', 'citrus', 'natural', 'silver', 'orange', 'purple', 'yellow', 'black', 'blue', 'violet', 'sage', 'pink', 'white', 'gold']

const SIM_TOKEN = /(?<![\p{L}\p{N}])(?:\(\s*)?(?:(?:1\s*)?sim\s*\+?\s*e\s*sim|1\s*sim|e\s*sim)(?:\s*\))?(?![\p{L}\p{N}])/giu
const ACTIVE_TOKEN = /(?<![\p{L}\p{N}])актив(?![\p{L}\p{N}])/giu
const MONEY_TOKEN = /(?:^|[\s:\u2013\u2014-])((?:\d{1,3}(?:[.\s]\d{3})+|\d{4,9}))\s*(?:\u20bd|\u0440\u0443\u0431(?:\.?|\u043b\u0435\u0439)?|\u0440\u0443\u0431\u043b\u0435\u0439)?\s*$/iu
const STANDALONE_MONEY_TOKEN = /^((?:\d{1,3}(?:[.\s]\d{3})+|\d{4,9}))\s*(?:\u20bd|\u0440\u0443\u0431(?:\.?|\u043b\u0435\u0439)?|\u0440\u0443\u0431\u043b\u0435\u0439)?$/iu

function stripServiceTokens(line: string): { text: string; sim: string | null; region: string } {
  let simSeen = false
  let esimSeen = false
  let comboSeen = false
  let text = line.replace(ACTIVE_TOKEN, ' ').replace(SIM_TOKEN, (token) => {
    const normalized = token.toLowerCase().replace(/[()+\s]/g, '')
    if (normalized === 'esim') {
      esimSeen = true
    } else {
      if (normalized.includes('1sim')) comboSeen = true
      if (normalized.includes('sim')) simSeen = true
      if (normalized.includes('esim')) esimSeen = true
    }
    return ' '
  })
  let region = ''
  for (const [expression, label] of REGION_TOKENS) {
    if (expression.test(text)) {
      region = normalizeRegion(label)
      text = text.replace(expression, ' ')
      break
    }
  }
  const sim = comboSeen || (simSeen && esimSeen) ? 'SIM + eSIM' : esimSeen ? 'eSIM' : simSeen ? 'SIM' : null
  return { text: text.replace(/\s+/gu, ' ').trim(), sim, region }
}

function knownHeading(value: string): boolean {
  const cleaned = value.replace(/[·•]\s*\d+\s*\/\s*\d+$/u, '').trim()
  const key = normalizeModelKey(cleaned)
  return new Set(['iphone 17e', 'iphone air', 'airpods', 'airpods 4', 'airpods 4 anc', 'airpods pro 2', 'airpods pro 3', 'airpods max', 'airpods max 2', 'ipad', 'watch', 'mac']).has(key) || /^(?:iphone\s+\d+(?:e|\s+pro(?:\s+max)?|\s+max)?|iphone\s+air|ipad|watch|airpods|mac)$/iu.test(cleaned)
}

function stripListMarker(value: string): string {
  return value.replace(/^\s*(?:[\u2022\u00b7\u25cf\u25aa\u25e6*-])\s+/u, '').trim()
}

function extractPrice(line: string): { body: string; price: number } | null {
  const match = line.match(MONEY_TOKEN)
  if (!match || match.index === undefined) return null
  const numberStart = match.index + match[0].indexOf(match[1])
  const value = Number(match[1].replace(/[.\s\u00a0]/gu, ''))
  if (!Number.isSafeInteger(value) || value < MIN_PRICE || value > MAX_PRICE) return null
  const body = line.slice(0, numberStart).replace(/[\s:\u2013\u2014-]+$/u, '').trim()
  return body ? { body, price: value } : null
}

function parseFreeformItem(line: string, lineNumber: number, contextHeading: string): FreeformPriceLine {
  const contentLine = stripListMarker(line)
  const services = stripServiceTokens(contentLine)
  const headingCandidate = contentLine.replace(/:\s*$/u, '').trim()
  if (knownHeading(headingCandidate)) return { lineNumber, sourceLine: line, contextHeading: headingCandidate, error: 'Заголовок группы пропущен.' }
  const priced = extractPrice(services.text)
  if (!priced) return { lineNumber, sourceLine: line, contextHeading, error: 'Не удалось извлечь целую цену в конце строки.' }
  let body = priced.body
  const sim = services.sim
  const region = services.region

  let ram: string | null = null
  let storage: string | null = null
  const combo = body.match(/(\d+)\s*\/\s*(\d+)\s*(gb|\u0433\u0431|tb|\u0442\u0431)?/iu)
  if (combo) {
    ram = `${combo[1]}GB`
    storage = `${combo[2]}${/tb|\u0442\u0431/iu.test(combo[3] || '') ? 'TB' : 'GB'}`
    body = body.replace(combo[0], ' ').replace(/\s+/g, ' ').trim()
  } else {
    const storageMatch = body.match(/(\d+(?:\.\d+)?)\s*(?:gb|\u0433\u0431|tb|\u0442\u0431)/iu)
    if (storageMatch) {
      storage = `${storageMatch[1]}${/tb|\u0442\u0431/iu.test(storageMatch[0]) ? 'TB' : 'GB'}`
      body = body.replace(storageMatch[0], ' ').replace(/\s+/g, ' ').trim()
    }
  }
  if (!storage) {
    const bareStorage = body.match(/(?<![\p{L}\p{N}])(128|256|512)(?![\p{L}\p{N}])/u)
    if (bareStorage) {
      storage = `${bareStorage[1]}GB`
      body = body.replace(bareStorage[0], ' ').replace(/\s+/g, ' ').trim()
    }
  }

  let color: string | null = null
  for (const token of COLOR_TOKENS) {
    const expression = new RegExp(`(?:^|\\s)${token.replace(/ /g, '\\s+')}(?=\\s|$)`, 'iu')
    const match = body.match(expression)
    if (match) {
      color = match[0].trim()
      body = body.replace(expression, ' ').replace(/\s+/g, ' ').trim()
      break
    }
  }

  let chip: string | null = null
  let screenSize: string | null = null
  let connectivity: string | null = null
  let size: string | null = null
  let generation: string | null = null
  let material: string | null = null
  let strapSize: string | null = null
  let manufacturerModelNumber: string | null = null
  const spec = body.match(/\(([^)]*)\)/u)
  const specText = spec?.[1] || ''
  if (spec) body = body.replace(spec[0], ' ').replace(/\s+/g, ' ').trim()
  const article = body.match(/\b(?=[A-Z0-9]{5,10}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]+\b/iu)
  if (article) { manufacturerModelNumber = article[0].toUpperCase(); body = body.replace(article[0], ' ').replace(/\s+/g, ' ').trim() }
  const chipMatch = (specText || body).match(/\b(?:M\d(?:\s+Pro)?|A\d{2}\s+Pro)\b/iu)
  if (chipMatch) { chip = chipMatch[0]; body = body.replace(chipMatch[0], ' ').replace(/\s+/g, ' ').trim() }
  const ramMatch = (specText || body).match(/\b(\d+)\s*\/\s*(?:\d+(?:\.\d+)?)\s*(?:gb|tb)\b/iu)
  if (ramMatch && !ram) ram = `${ramMatch[1]}GB`
  const sizeMatch = body.match(/\b(\d{2})\s*(?:mm)?\b/iu)
  if (sizeMatch && /(?:watch|se|s\d{2}|ul)/iu.test(body)) { size = `${sizeMatch[1]}mm`; body = body.replace(sizeMatch[0], ' ').replace(/\s+/g, ' ').trim() }
  const familyHint = `${contextHeading} ${body}`
  const screenMatch = body.match(/\b(\d{2})(?:\.\d)?(?:\s*["″])?\b/iu)
  if (screenMatch && /(?:ipad|mini|\bmac\b|\bneo\b|\b(?:air|pro)\s+(?:13|14|15|16)\b)/iu.test(familyHint)) { screenSize = `${screenMatch[1]}"`; body = body.replace(screenMatch[0], ' ').replace(/\s+/g, ' ').trim() }
  const conn = body.match(/\b(?:wi[- ]?fi|lte)\b/iu)
  if (conn) { connectivity = conn[0].replace(/wi[- ]?fi/iu, 'Wi-Fi').toUpperCase() === 'LTE' ? 'LTE' : 'Wi-Fi'; body = body.replace(conn[0], ' ').replace(/\s+/g, ' ').trim() }
  const strap = line.match(/\((S\/M|M\/L|[SML])\)/iu)
  if (strap) { strapSize = strap[1].toUpperCase(); body = body.replace(strap[0], ' ').replace(/\s+/g, ' ').trim() }
  const materialMatch = body.match(/\b(?:Titanium|AL)\b/iu)
  if (materialMatch) { material = materialMatch[0]; body = body.replace(materialMatch[0], ' ').replace(/\s+/g, ' ').trim() }
  const genMatch = body.match(/\b(?:20\d{2}|SE\d|S\d{2}|UL\s*\d|MAX\s*\d)\b/iu)
  if (genMatch) generation = genMatch[0]
  const familyText = `${contextHeading} ${line}`
  const productType = /airpods/i.test(familyText) ? 'airpods' : /^(?:watch\s+)?(?:se\d|s\d{2}|ul\s*\d)\b/i.test(body) ? 'watch' : /ipad|\bmini\b/i.test(familyText) ? 'ipad' : /\bmac\b|\bneo\s+\d{2}\b|\b(?:air|pro)\s+(?:13|14|15|16)\b/i.test(familyText) ? 'mac' : 'iphone'
  body = body.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (productType === 'ipad') {
    if (/\bmini\b/iu.test(body)) body = 'iPad mini'
    else if (/\bair\b/iu.test(body)) body = 'iPad Air'
    else if (/\bpro\b/iu.test(body)) body = 'iPad Pro'
    else body = 'iPad'
  } else if (productType === 'mac') {
    if (/\bneo\b/iu.test(body)) body = 'Mac Neo'
    else if (/\bair\b/iu.test(body)) body = 'MacBook Air'
    else if (/\bpro\b/iu.test(body)) body = 'MacBook Pro'
  } else if (productType === 'watch') {
    const watchModel = generation || body.match(/\b(?:SE\s*\d|S\s*\d{2}|UL\s*\d)\b/iu)?.[0] || body
    body = /^SE/iu.test(watchModel) ? `Apple Watch SE ${watchModel.replace(/\D/g, '')}` : /^S/iu.test(watchModel) ? `Apple Watch Series ${watchModel.replace(/\D/g, '')}` : /^UL/iu.test(watchModel) ? `Apple Watch Ultra ${watchModel.replace(/\D/g, '')}` : watchModel
  }

  const item: AICatalogItem = {
    sourceLine: line,
    contextHeading,
    modelText: body,
    price: priced.price,
    storage,
    ram,
    color,
    sim,
    region,
    chip,
    screenSize,
    connectivity,
    size,
    generation,
    material,
    strapSize,
    productType,
    active: /(?<![\p{L}\p{N}])актив(?![\p{L}\p{N}])/iu.test(line),
    revision: null,
    manufacturerModelNumber: null,
    ...(manufacturerModelNumber ? { manufacturerModelNumber } : {}),
    notes: [],
  }
  return { lineNumber, sourceLine: line, contextHeading, item }
}

export function parseFreeformPriceList(rawText: string): { lines: FreeformPriceLine[]; items: AICatalogItem[]; errors: string[] } {
  let contextHeading = ''
  const lines: FreeformPriceLine[] = []
  const sourceLines = rawText.split(/\r?\n/u).map((raw, index) => ({
    lineNumber: index + 1,
    text: raw.replace(/[\u00a0]/g, ' ').trim(),
  }))
  for (let index = 0; index < sourceLines.length; index += 1) {
    const current = sourceLines[index]
    let sourceLine = current.text
    if (!sourceLine) continue
    const contentLine = stripListMarker(sourceLine)
    const serviceText = stripServiceTokens(contentLine).text
    if (/^.+:\s*$/u.test(sourceLine) || (knownHeading(sourceLine) && !extractPrice(serviceText))) {
      contextHeading = sourceLine.replace(/:\s*$/u, '').replace(/[·•]\s*\d+\s*\/\s*\d+$/u, '').trim()
      continue
    }
    if (!extractPrice(serviceText)) {
      let nextIndex = index + 1
      while (nextIndex < sourceLines.length && !sourceLines[nextIndex].text) nextIndex += 1
      const next = sourceLines[nextIndex]
      const hasConfiguration = /(?:\b(?:128|256|512)\b|\b\d+\s*(?:gb|tb|гб|тб)\b|\bwi[- ]?fi\b|\blte\b|\be\s*sim\b|\b1\s*sim\b)/iu.test(sourceLine)
      if (hasConfiguration && next && STANDALONE_MONEY_TOKEN.test(next.text)) {
        sourceLine = `${sourceLine}  ${next.text}`
        index = nextIndex
      }
    }
    const parsed = parseFreeformItem(sourceLine, current.lineNumber, contextHeading)
    lines.push(parsed)
  }
  return { lines, items: lines.flatMap((line) => line.item ? [line.item] : []), errors: lines.flatMap((line) => line.error ? [`Строка ${line.lineNumber}: ${line.error}`] : []) }
}

export const parsePriceListText = parseFreeformPriceList

type NormalizeSku = (value: unknown) => string | undefined

export function parsePriceUpdateInput(rawText: string, normalizeSku: NormalizeSku): ParsedPriceLine[] {
  return rawText
    .split(/\r?\n/)
    .map((sourceLine, index) => ({ sourceLine: sourceLine.trim(), lineNumber: index + 1 }))
    .filter(({ sourceLine }) => sourceLine.length > 0)
    .map(({ sourceLine, lineNumber }) => {
      const match = sourceLine.match(/^(.*?)\s*(?:[:\u2014\u2013]|\s+|-(?=\s*\d))\s*((?:\d{1,3}(?:[.\s]\d{3})+|\d{1,9}))\s*(?:\u20bd|\u0440\u0443\u0431|\u0432\u201a\u0405)?\s*$/u)
      const fallbackSku = normalizeSku(sourceLine.split(/[\s:\u2014\u2013]+/u)[0])
      if (!match) return { lineNumber, sourceLine, sku: fallbackSku, error: 'Укажите SKU и целую цену через пробел, тире или двоеточие.' }
      const sku = normalizeSku(match[1])
      const newCashPrice = Number(match[2].replace(/[.\s\u00a0]/gu, ''))
      if (!sku) return { lineNumber, sourceLine, error: 'SKU не указан.' }
      if (!Number.isSafeInteger(newCashPrice) || newCashPrice < MIN_PRICE || newCashPrice > MAX_PRICE) return { lineNumber, sourceLine, sku, error: `Цена должна быть целым числом от ${MIN_PRICE} до ${MAX_PRICE}.` }
      return { lineNumber, sourceLine, sku, newCashPrice }
    })
}

export function duplicateSkus(lines: ParsedPriceLine[]): Set<string> {
  const counts = new Map<string, number>()
  for (const line of lines) if (line.sku) counts.set(line.sku, (counts.get(line.sku) || 0) + 1)
  return new Set([...counts].filter(([, count]) => count > 1).map(([sku]) => sku))
}
