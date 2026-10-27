export type OfferNameParts = {
  chip: string
  ram: string
  storage: string
  color: string
  sim: string
}

function stripMemoryUnit(label: string): string {
  return label.replace(/\s*(gb|гб)$/i, '')
}

export function buildOfferName(baseName: string, parts: OfferNameParts): string {
  const name = baseName.trim()
  const lowerBase = name.toLowerCase()
  const has = (value: string) => lowerBase.includes(value.toLowerCase())
  const result: string[] = [name]

  if (parts.chip && !has(parts.chip)) {
    result.push(parts.chip)
  }

  if (parts.sim && !has(parts.sim)) {
    result.push(parts.sim)
  }

  const storageInBase = parts.storage ? has(parts.storage) : false
  let memory = ''
  if (parts.ram && parts.storage && !storageInBase) memory = `${stripMemoryUnit(parts.ram)}/${parts.storage}`
  else if (parts.ram) memory = parts.ram
  else if (parts.storage && !storageInBase) memory = parts.storage
  if (memory && !has(memory)) {
    result.push(memory)
  }

  if (parts.color && !has(parts.color)) {
    result.push(parts.color)
  }

  return result.join(' ')
}
