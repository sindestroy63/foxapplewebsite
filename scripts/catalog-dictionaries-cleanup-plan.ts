import fs from 'node:fs/promises'
import path from 'node:path'

type AnyRecord = Record<string, any>

function classifyProblemColor(value: string): { meaning: string; action: string; targetField: string | null } {
  if (value.includes('|')) return { meaning: 'Смешанное описание цвета и комплектации', action: 'move_to_variant_attribute', targetField: 'ручная проверка комплектации' }
  if (/DualSense|Disc Drive|зарядн|Экшн-камера|MAJOR\s*5/i.test(value)) return { meaning: 'В поле цвета записана модель или аксессуар', action: 'move_to_model', targetField: 'model или bundleNote' }
  return { meaning: 'Нестандартное название цвета', action: 'manual_review', targetField: null }
}

async function latestAudit(): Promise<string> {
  const files = (await fs.readdir(path.resolve(process.cwd(), 'backups')))
    .filter((name) => /^catalog-dictionaries-audit-.*\.json$/u.test(name))
    .sort()
  if (!files.length) throw new Error('Сначала запустите catalog-dictionaries-audit.ts')
  return path.resolve(process.cwd(), 'backups', files[files.length - 1])
}

async function main() {
  const auditPath = await latestAudit()
  const audit = JSON.parse(await fs.readFile(auditPath, 'utf8')) as AnyRecord
  const storages = audit.dictionaries.storageOptions as AnyRecord[]
  const variants = audit.variants as AnyRecord[]
  const colors = audit.dictionaries.colors as AnyRecord[]
  const colorLinks = new Map<string, AnyRecord[]>()
  for (const row of variants) {
    if (!row.color) continue
    const key = String(row.color).trim().toLowerCase()
    colorLinks.set(key, [...(colorLinks.get(key) || []), {
      product: row.product,
      productSku: row.productSku,
      variantSku: row.variantSku,
    }])
  }
  const archiveCandidates = storages.filter((row) => row.usageCount === 0 && row.key === 'ПАМЯТЬ').map((row) => ({
    id: row.id,
    value: row.key,
    action: 'archive_when_migration_is_applied',
    reason: 'Повторная проверка: 0 ссылок на варианты и товары.',
  }))
  const cannotArchive = storages.filter((row) => row.usageCount > 0 || row.key !== 'ПАМЯТЬ').map((row) => ({
    id: row.id,
    value: row.key,
    usageCount: row.usageCount,
    action: row.usageCount > 0 ? 'keep_until_manual_move' : 'manual_review',
    reason: row.usageCount > 0 ? 'Есть действующие ссылки либо значение требует переноса в отдельное поле.' : 'Не удалять автоматически без подтверждения смысла.',
  }))
  const usedWrongStorage = storages.filter((row) => row.usageCount > 0 && row.group !== 'correct_storage').map((row) => ({
    value: row.key,
    usageCount: row.usageCount,
    links: row.links,
    targetField: row.targetField || null,
    action: row.action,
    reason: row.meaning,
    risk: 'Изменение затронет существующие варианты и их серверные связи.',
  }))
  const problematicColors = [...colorLinks.entries()]
    .filter(([value]) => value.includes('|') || /DualSense|Disc Drive|зарядн|экшн-камера|major\s*5/i.test(value))
    .map(([value, links]) => {
      const dictionary = colors.find((row) => String(row.key || '').trim().toLowerCase() === value)
      return { id: dictionary?.id || null, key: dictionary?.key || value, englishLabel: dictionary?.englishLabel || null, russianLabel: dictionary?.russianLabel || null, usageCount: links.length, links, ...classifyProblemColor(value) }
    })
  const duplicates = audit.duplicates.colors
  const duplicatePlan = duplicates.map((group: AnyRecord) => ({
    key: group.key,
    canonical: group.entries[0],
    duplicates: group.entries.slice(1),
    variants: group.entries.flatMap((entry: AnyRecord) => colorLinks.get(String(entry.value).trim().toLowerCase()) || []),
    action: 'manual_review',
    risk: 'Переназначение затронет ссылки вариантов и отображаемые подписи.',
  }))
  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    sourceAudit: auditPath,
    archiveCandidates,
    cannotArchive,
    usedWrongStorage,
    problematicColors,
    colorDuplicates: duplicatePlan,
    manualDecisions: [
      ...usedWrongStorage.filter((row) => row.action === 'manual_review'),
      ...problematicColors.filter((row) => row.action === 'manual_review'),
      ...duplicatePlan,
    ],
    summary: {
      archiveableStorageOptions: archiveCandidates.length,
      storageRequiringMove: usedWrongStorage.length,
      manualReviewCount: usedWrongStorage.filter((row) => row.action === 'manual_review').length + problematicColors.filter((row) => row.action === 'manual_review').length,
      colorDuplicateGroups: duplicatePlan.length,
      usedProblematicColors: problematicColors.length,
      potentiallyAffectedVariants: new Set([...usedWrongStorage.flatMap((row) => row.links.map((link: AnyRecord) => link.variantId)), ...problematicColors.flatMap((row) => row.links.map((link: AnyRecord) => link.variantSku))]).size,
    },
  }
  const stamp = new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
  const output = path.resolve(process.cwd(), 'backups', `catalog-dictionaries-cleanup-plan-${stamp}.json`)
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report.summary, null, 2))
  console.log(`Cleanup plan: ${output}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
