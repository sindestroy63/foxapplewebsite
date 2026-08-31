import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

export type StructureAction = 'keep' | 'rename' | 'split' | 'manual_review'
export type StructureRow = {
  id: number | string
  sku: string | null
  name: string
  model: string | null
  slug: string | null
  category: { slug: string | null; name: string | null }
  current: { productGroup: string | null; brand: string | null; productType: string | null; productLine: string | null }
  proposed: { productGroup: string; brand: string | null; productType: string | null; productLine: string | null; canonicalName: string | null }
  used: boolean
  dyson: { generationModels: string[]; suggestedSplit: Record<string, string[]> } | null
  action: StructureAction
  risks: string[]
}
export type StructureReport = { generatedAt: string; totalProducts: number; usedProducts: number; samsungRenameCandidates: number; dysonSplitCandidates: number; rows: StructureRow[] }

const categoryGroups: Record<string, string> = {
  iphone: 'smartphones', samsung: 'smartphones', ipad: 'tablets', macbook: 'laptops',
  'apple-watch': 'smart-watches', 'samsung-watch': 'smart-watches', airpods: 'audio', 'Samsung-headphones': 'audio',
  playstation: 'gaming-consoles', dyson: 'home-appliances', drugoe: 'other',
}
const samsungCanonical: Record<string, string> = {
  'Galaxy S26': 'Samsung Galaxy S26', 'Galaxy S26 Plus': 'Samsung Galaxy S26 Plus', 'Galaxy S26 Ultra': 'Samsung Galaxy S26 Ultra',
  'Galaxy Z Fold8': 'Samsung Galaxy Z Fold8', 'Galaxy A57': 'Samsung Galaxy A57',
}
function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null }
function isUsed(name: string, model: string | null, category: string | null): boolean {
  return category === 'used' || /\bб\s*\/\s*у\b|\bб\.?у\.?\b|used/i.test(`${name} ${model || ''}`)
}
function inferBrand(name: string, category: string | null): string | null {
  if (/samsung/i.test(name) || category === 'samsung' || category === 'samsung-watch') return 'Samsung'
  if (/apple|iphone|ipad|macbook|airpods|watch/i.test(name) || ['iphone', 'ipad', 'macbook', 'apple-watch', 'airpods'].includes(category || '')) return 'Apple'
  if (/dyson/i.test(name) || category === 'dyson') return 'Dyson'
  if (/playstation/i.test(name) || category === 'playstation') return 'Sony'
  if (/ray-ban/i.test(name)) return 'Ray-Ban'
  return null
}
function productType(category: string | null, name: string): string | null {
  if (category === 'dyson') return /пылесос/i.test(name) ? 'Пылесос' : /фен/i.test(name) ? 'Фен' : /выпрямитель/i.test(name) ? 'Выпрямитель' : /стайлер/i.test(name) ? 'Стайлер' : 'Бытовая техника'
  if (category === 'drugoe' && /умные очки/i.test(name)) return 'Умные очки'
  return null
}
export function classifyStructureProduct(product: Record<string, any>): StructureRow {
  const category = product.category && typeof product.category === 'object' ? product.category : {}
  const categorySlug = text(category.slug)
  const name = String(product.name || '')
  const model = text(product.model)
  const used = isUsed(name, model, categorySlug)
  const isSmartGlasses = /ray-ban.*wayfarer.*gen\s*2/i.test(name) && /умные очки/i.test(`${name} ${model || ''}`)
  const group = used ? 'other' : isSmartGlasses ? 'smart-devices' : categoryGroups[categorySlug || ''] || 'other'
  const generations = [...new Set((product.variants || []).map((v: any) => text(v.generation)).filter(Boolean))] as string[]
  const dysonModels = categorySlug === 'dyson' ? generations.filter((v) => /^(HS\d+|HD\d+|SV\d+)/i.test(v)) : []
  const suggestedSplit = Object.fromEntries(dysonModels.map((v) => [v, (product.variants || []).filter((x: any) => text(x.generation) === v).map((x: any) => String(x.sku || x.id))]))
  const canonicalName = samsungCanonical[model || ''] || samsungCanonical[name.replace(/^Samsung\s+/i, '')] || null
  const risks: string[] = []
  let action: StructureAction = 'keep'
  if (used) risks.push('Б/У товар исключается из автоматического импорта цен.')
  if (canonicalName && canonicalName !== name) { action = 'rename'; risks.push('Переименование требует отдельного подтверждения: slug и SEO не меняются автоматически.') }
  if (dysonModels.length > 1) { action = 'split'; risks.push('Значения generation выглядят как отдельные модели; разделение затрагивает ссылки, корзину и импорт.') }
  if (!categoryGroups[categorySlug || ''] && !isSmartGlasses && !used) { action = 'manual_review'; risks.push('Категория не сопоставлена с утверждённой верхней группой.') }
  return {
    id: product.id, sku: text(product.sku), name, model, slug: text(product.slug), category: { slug: categorySlug, name: text(category.name) },
    current: { productGroup: text(product.productGroup), brand: text(product.brand), productType: text(product.productType), productLine: text(product.productLine) },
    proposed: { productGroup: group, brand: inferBrand(name, categorySlug), productType: productType(categorySlug, name), productLine: model, canonicalName },
    used, dyson: categorySlug === 'dyson' ? { generationModels: dysonModels, suggestedSplit } : null, action, risks,
  }
}
export async function createCatalogStructureReport(payload: Pick<Payload, 'find'>): Promise<StructureReport> {
  const result = await payload.find({ collection: 'products', depth: 1, limit: 10_000, pagination: false })
  const rows = (result.docs as Record<string, any>[]).map(classifyStructureProduct)
  return { generatedAt: new Date().toISOString(), totalProducts: rows.length, usedProducts: rows.filter((r) => r.used).length, samsungRenameCandidates: rows.filter((r) => r.action === 'rename').length, dysonSplitCandidates: rows.filter((r) => r.action === 'split').length, rows }
}
function filename(date: Date): string { return `catalog-structure-dry-run-${date.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')}.json` }
async function main(): Promise<void> {
  const [{ default: config }, { getPayload }] = await Promise.all([import(new URL('../../payload.config.ts', import.meta.url).href), import('payload')])
  const payload = await getPayload({ config })
  const report = await createCatalogStructureReport(payload)
  const output = path.resolve(process.cwd(), 'backups', filename(new Date()))
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Catalog structure dry-run: ${report.totalProducts} products`)
  console.log(`used: ${report.usedProducts}`)
  console.log(`Samsung rename candidates: ${report.samsungRenameCandidates}`)
  console.log(`Dyson split candidates: ${report.dysonSplitCandidates}`)
  console.log(`Detailed report: ${output}`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
