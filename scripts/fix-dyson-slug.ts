import payload from 'payload'
import config from '@payload-config'
import fs from 'node:fs/promises'
import path from 'node:path'

const apply = process.env.CATALOG_SLUG_REPAIR_APPLY === '1'
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

function transliterate(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  }
  return text.split('').map(c => map[c.toLowerCase()] || c).join('')
}

function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[А-Яа-яЁё]/g, (c) => transliterate(c))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function productGroupSlug(productGroup: string | null): string | null {
  const map: Record<string, string> = {
    'smartphones': 'smartphones',
    'tablets': 'tablets',
    'laptops': 'laptops',
    'smart-watches': 'smart-watches',
    'headphones': 'headphones',
    'gaming-consoles': 'gaming-consoles',
    'smart-devices': 'smart-devices',
    'home-appliances': 'home-appliances',
    'photo-video': 'photo-video',
    'other': 'other',
  }
  return productGroup ? (map[productGroup] || productGroup) : null
}

async function fixAllSlugs() {
  await payload.init({ config })

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\n`)

  const { docs: products } = await payload.find({
    collection: 'products',
    limit: 1000,
    depth: 0,
  })

  type SlugFix = {
    id: number
    name: string
    oldSlug: string
    newSlug: string
    productGroup: string | null
    legacyUrl: string
    canonicalUrl: string
    reason: string
    isAvailable: boolean
  }

  const fixes: SlugFix[] = []
  const existingSlugs = new Set(products.map(p => p.slug))
  const productMap = new Map(products.map(p => [p.id, p]))

  // First pass: identify all fixes and check for conflicts
  for (const product of products) {
    const hasTrailingSpace = product.slug.endsWith(' ')
    const hasInternalSpace = /\s/.test(product.slug.trim())
    const hasCyrillic = /[А-Яа-яЁё]/.test(product.slug)

    if (hasTrailingSpace || hasInternalSpace || hasCyrillic) {
      let normalized = normalizeSlug(product.slug)

      // Conflict resolution: if normalized slug already exists, append product model/suffix
      if (existingSlugs.has(normalized) && normalized !== product.slug) {
        // Try to extract unique part from product name
        const nameParts = normalizeSlug(product.name).split('-')

        // For Samsung watches: try to append model number
        if (product.name.includes('Watch 8')) {
          if (product.name.includes('Classic')) {
            normalized = 'chasy-samsung-galaxy-watch-8-classic'
          } else if (product.name.includes('LTE')) {
            normalized = 'chasy-samsung-galaxy-watch-8-lte'
          } else {
            normalized = 'chasy-samsung-galaxy-watch-8'
          }
        } else if (nameParts.length > 2) {
          // Generic: use full normalized name
          normalized = nameParts.join('-')
        } else {
          // Fallback: append product ID
          normalized = `${normalized}-${product.id}`
        }

        console.log(`⚠️  Conflict resolved for Product ${product.id}: "${normalizeSlug(product.slug)}" → "${normalized}"`)
      }

      const group = productGroupSlug(product.productGroup || null)
      const legacyUrl = group ? `/catalog/${group}/${product.slug}` : null
      const canonicalUrl = group ? `/catalog/${group}/${normalized}` : null

      fixes.push({
        id: product.id,
        name: product.name,
        oldSlug: product.slug,
        newSlug: normalized,
        productGroup: product.productGroup || null,
        legacyUrl: legacyUrl || '',
        canonicalUrl: canonicalUrl || '',
        reason: [
          hasTrailingSpace && 'trailing_space',
          hasInternalSpace && 'internal_space',
          hasCyrillic && 'cyrillic'
        ].filter(Boolean).join(', '),
        isAvailable: product.isAvailable ?? false
      })

      // Mark this normalized slug as taken
      existingSlugs.add(normalized)
    }
  }

  // Final conflict check after resolution
  const slugCounts = new Map<string, number[]>()
  fixes.forEach(f => {
    if (!slugCounts.has(f.newSlug)) {
      slugCounts.set(f.newSlug, [])
    }
    slugCounts.get(f.newSlug)!.push(f.id)
  })

  const remainingConflicts = Array.from(slugCounts.entries()).filter(([_, ids]) => ids.length > 1)
  if (remainingConflicts.length > 0) {
    console.error('❌ UNRESOLVED SLUG CONFLICTS:\n')
    remainingConflicts.forEach(([slug, ids]) => {
      console.error(`  Slug "${slug}" would be used by products: ${ids.join(', ')}`)
      const conflictingProducts = fixes.filter(f => ids.includes(f.id))
      conflictingProducts.forEach(p => console.error(`    - ID ${p.id}: ${p.name} (${p.oldSlug})`))
    })
    console.error('\n⚠️  Cannot proceed - manual resolution required.')
    process.exit(1)
  }

  console.log(`Found ${fixes.length} products with slug issues:\n`)

  const critical = fixes.filter(f => f.isAvailable)
  const nonCritical = fixes.filter(f => !f.isAvailable)

  console.log(`CRITICAL (${critical.length} - isAvailable=true, breaking URL change):`)
  critical.forEach(f => {
    console.log(`  ID ${f.id}: ${f.name}`)
    console.log(`    Old: '${f.oldSlug}'`)
    console.log(`    New: '${f.newSlug}'`)
    console.log(`    Legacy URL: ${f.legacyUrl}`)
    console.log(`    Canonical URL: ${f.canonicalUrl}`)
    console.log(`    Reason: ${f.reason}\n`)
  })

  console.log(`NON-CRITICAL (${nonCritical.length} - isAvailable=false):`)
  nonCritical.forEach(f => {
    console.log(`  ID ${f.id}: ${f.name} | ${f.oldSlug} → ${f.newSlug} (${f.reason})`)
  })

  if (apply) {
    console.log('\n⚠️  APPLYING CHANGES...\n')

    // Backup current state
    const backupPath = path.resolve(process.cwd(), 'backups', `slug-repair-backup-${stamp()}.json`)
    await fs.mkdir(path.dirname(backupPath), { recursive: true })
    await fs.writeFile(backupPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      products: fixes.map(f => ({
        id: f.id,
        name: f.name,
        oldSlug: f.oldSlug,
        productGroup: f.productGroup,
      }))
    }, null, 2) + '\n')
    console.log(`📦 Backup created: ${backupPath}\n`)

    let updated = 0
    const redirects: Array<[string, string]> = []

    for (const fix of fixes) {
      await payload.update({
        collection: 'products',
        id: fix.id,
        data: { slug: fix.newSlug }
      })
      updated++

      if (fix.isAvailable && fix.legacyUrl && fix.canonicalUrl) {
        redirects.push([fix.legacyUrl, fix.canonicalUrl])
      }

      console.log(`✓ Updated product ${fix.id}: ${fix.oldSlug} → ${fix.newSlug}`)
    }

    console.log(`\n✅ Updated ${updated} product slugs`)
    console.log('⚠️  Navigation hrefs will be auto-synced by afterChange hook')

    // Generate middleware redirects
    if (redirects.length > 0) {
      const middlewarePath = path.resolve(process.cwd(), 'src', 'middleware.ts')
      let middlewareContent = await fs.readFile(middlewarePath, 'utf-8')

      const redirectsCode = redirects.map(([legacy, canonical]) =>
        `  ['${legacy}', '${canonical}'],`
      ).join('\n')

      middlewareContent = middlewareContent.replace(
        /const LEGACY_PRODUCT_REDIRECTS: Array<\[string, string\]> = \[[\s\S]*?\]/,
        `const LEGACY_PRODUCT_REDIRECTS: Array<[string, string]> = [\n${redirectsCode}\n]`
      )

      await fs.writeFile(middlewarePath, middlewareContent)
      console.log(`\n✅ Generated ${redirects.length} legacy redirects in src/middleware.ts`)
    }

    // Save report
    const reportPath = path.resolve(process.cwd(), 'backups', `slug-repair-report-${stamp()}.json`)
    await fs.writeFile(reportPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: 'apply',
      totalFixes: fixes.length,
      criticalFixes: critical.length,
      nonCriticalFixes: nonCritical.length,
      redirectsGenerated: redirects.length,
      backupPath,
      fixes,
      redirects
    }, null, 2) + '\n')
    console.log(`📄 Report saved: ${reportPath}`)

  } else {
    console.log('\n💡 Dry-run mode. Set CATALOG_SLUG_REPAIR_APPLY=1 to apply changes.')

    // Save dry-run report
    const reportPath = path.resolve(process.cwd(), 'backups', `slug-repair-plan-${stamp()}.json`)
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: 'dry-run',
      totalFixes: fixes.length,
      criticalFixes: critical.length,
      nonCriticalFixes: nonCritical.length,
      fixes
    }, null, 2) + '\n')
    console.log(`\n📄 Plan saved: ${reportPath}`)
  }

  process.exit(0)
}

fixAllSlugs().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
