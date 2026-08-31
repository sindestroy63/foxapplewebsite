export function cardPrice(cashPrice?: number | null): number | null {
  if (typeof cashPrice !== 'number') return null
  return Math.round(cashPrice * 1.2)
}
