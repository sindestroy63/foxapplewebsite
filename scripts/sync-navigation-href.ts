/**
 * FOXSTORE СИСТЕМНЫЙ ФИКС
 *
 * Этот скрипт создаёт migration для синхронизации navigation.href
 * с актуальными productGroup товаров.
 *
 * ИСПОЛЬЗОВАНИЕ:
 * 1. DRY RUN: npm run catalog:navigation:sync-href
 * 2. Проверить отчёт
 * 3. APPLY: CATALOG_NAVIGATION_SYNC_APPLY=1 npm run catalog:navigation:sync-href
 */

import payload from 'payload'
import config from '../src/payload.config'
import { buildProductUrl } from '../src/lib/product-url-builder'
import fs from 'fs'

type NavigationItem = {
  id: number
  product?: number | { id: number; slug: string; productGroup?: string }
  href?: string
}

async function syncNavigationHrefs(apply = false) {
  await payload.init({ config })

  console.log(`\n=== NAVIGATION HREF SYNC ${apply ? 'APPLY' : 'DRY RUN'} ===\n`)

  const navigation = await payload.find({
    collection: 'catalog-navigation',
    depth: 2,
    limit: 1000,
    where: {
      product: { exists: true }
    }
  })

  const updates: Array<{ id: number; oldHref: string; newHref: string; product: string }> = []
  const noChange: Array<{ id: number; href: string; product: string }> = []

  for (const item of navigation.docs as NavigationItem[]) {
    if (!item.product || typeof item.product !== 'object') continue

    const product = item.product
    const currentHref = item.href || ''
    const correctHref = buildProductUrl({
      slug: product.slug,
      productGroup: product.productGroup
    })

    if (currentHref !== correctHref) {
      updates.push({
        id: item.id,
        oldHref: currentHref,
        newHref: correctHref,
        product: product.slug
      })

      if (apply) {
        await payload.update({
          collection: 'catalog-navigation',
          id: item.id,
          data: { href: correctHref },
          overrideAccess: true
        })
      }
    } else {
      noChange.push({
        id: item.id,
        href: currentHref,
        product: product.slug
      })
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    mode: apply ? 'APPLY' : 'DRY_RUN',
    totalChecked: navigation.docs.length,
    updatesNeeded: updates.length,
    noChangeNeeded: noChange.length,
    updates,
    noChange
  }

  const reportPath = `backups/navigation-href-sync-${apply ? 'apply' : 'plan'}-${Date.now()}.json`
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(`Всего navigation записей: ${navigation.docs.length}`)
  console.log(`Требуют обновления: ${updates.length}`)
  console.log(`Корректны: ${noChange.length}`)
  console.log(`\nОтчёт сохранён: ${reportPath}\n`)

  if (updates.length > 0) {
    console.log('Примеры обновлений:')
    updates.slice(0, 5).forEach(u => {
      console.log(`  Nav ${u.id} (${u.product}):`)
      console.log(`    OLD: ${u.oldHref}`)
      console.log(`    NEW: ${u.newHref}`)
    })
  }

  if (!apply && updates.length > 0) {
    console.log(`\n⚠️  DRY RUN MODE - изменения не применены`)
    console.log(`Для применения: CATALOG_NAVIGATION_SYNC_APPLY=1 npm run catalog:navigation:sync-href\n`)
  } else if (apply) {
    console.log(`\n✅ Обновлено ${updates.length} navigation записей\n`)
  }

  process.exit(0)
}

const apply = process.env.CATALOG_NAVIGATION_SYNC_APPLY === '1'
syncNavigationHrefs(apply).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
