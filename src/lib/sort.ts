function modelSortScore(name: string): number {
  const n = name.toLowerCase()
  let score = 0
  const genMatch = n.match(/\b(\d{2})\b/)
  if (genMatch) score += parseInt(genMatch[1], 10) * 1000
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
  return [...items].sort((a, b) => {
    const sa = modelSortScore(a.model || a.name)
    const sb = modelSortScore(b.model || b.name)
    return sb - sa
  })
}
