export const MIN_PRICE = 1
export const MAX_PRICE = 10_000_000

export type ParsedPriceLine = {
  lineNumber: number
  sourceLine: string
  sku?: string
  newCashPrice?: number
  error?: string
}

type NormalizeSku = (value: unknown) => string | undefined

export function parsePriceUpdateInput(rawText: string, normalizeSku: NormalizeSku): ParsedPriceLine[] {
  return rawText
    .split(/\r?\n/)
    .map((sourceLine, index) => ({ sourceLine: sourceLine.trim(), lineNumber: index + 1 }))
    .filter(({ sourceLine }) => sourceLine.length > 0)
    .map(({ sourceLine, lineNumber }) => {
      const match = sourceLine.match(/^(.*?)\s*(?:[:—–]|\s+|-(?=\s*\d))\s*(\d[\d\s]*)\s*₽?\s*$/u)
      const fallbackSku = normalizeSku(sourceLine.split(/[\s:—–]+/u)[0])

      if (!match) {
        return {
          lineNumber,
          sourceLine,
          sku: fallbackSku,
          error: 'Укажите SKU и целую цену через пробел, тире или двоеточие.',
        }
      }

      const sku = normalizeSku(match[1])
      const priceText = match[2].replace(/\s/g, '')
      const newCashPrice = Number(priceText)

      if (!sku) {
        return { lineNumber, sourceLine, error: 'SKU не указан.' }
      }

      if (!Number.isSafeInteger(newCashPrice) || newCashPrice < MIN_PRICE || newCashPrice > MAX_PRICE) {
        return {
          lineNumber,
          sourceLine,
          sku,
          error: `Цена должна быть целым числом от ${MIN_PRICE} до ${MAX_PRICE}.`,
        }
      }

      return { lineNumber, sourceLine, sku, newCashPrice }
    })
}

export function duplicateSkus(lines: ParsedPriceLine[]): Set<string> {
  const counts = new Map<string, number>()
  for (const line of lines) {
    if (line.sku) counts.set(line.sku, (counts.get(line.sku) || 0) + 1)
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([sku]) => sku))
}
