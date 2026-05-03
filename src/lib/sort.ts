function modelSortScore(name: string, defaultGen: number): number {
  const n = name.toLowerCase()
  let score = 0
  const genMatch = n.match(/\b(\d{2})\b/)
  if (genMatch) score += parseInt(genMatch[1], 10) * 1000
  else score += defaultGen * 1000
  if (n.includes('pro max')) score += 400
  else if (n.includes('pro')) score += 300
  else if (n.includes('ultra')) score += 350
  else if (n.includes('air')) score += 200
  else if (n.includes('plus')) score += 150
  else if (/\be\b/.test(n) || n.includes('se')) score -= 100
  else if (n.includes('mini')) score -= 50
  else score += 100
  return score
}

export function sortProductsByPriority<T extends { model?: string; name: string }>(items: T[]): T[] {
  let maxGen = 0
  for (const item of items) {
    const m = (item.model || item.name).match(/\b(\d{2})\b/)
    if (m) maxGen = Math.max(maxGen, parseInt(m[1], 10))
  }
  return [...items].sort((a, b) => {
    const sa = modelSortScore(a.model || a.name, maxGen)
    const sb = modelSortScore(b.model || b.name, maxGen)
    return sb - sa
  })
}
