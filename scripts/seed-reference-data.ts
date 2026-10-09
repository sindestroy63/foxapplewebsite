#!/usr/bin/env node
/**
 * Seed Reference Data Script
 *
 * Безопасное пополнение системных справочников
 * Использование: npm run seed:references
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

interface ReferenceItem {
  collection: string
  data: Record<string, any>
  uniqueKey: string
}

const REFERENCE_DATA: ReferenceItem[] = [
  // Пример: добавить новый цвет
  // {
  //   collection: 'colors',
  //   uniqueKey: 'value',
  //   data: {
  //     value: 'midnight-blue',
  //     englishLabel: 'Midnight Blue',
  //     russianLabel: 'Полуночный синий',
  //     primaryHex: '#1B1F3A',
  //     deviceTypes: ['iphone', 'ipad'],
  //     sortOrder: 100,
  //   }
  // },

  // Пример: добавить новый размер накопителя
  // {
  //   collection: 'storage-options',
  //   uniqueKey: 'value',
  //   data: {
  //     value: '4TB',
  //     sortOrder: 50,
  //     archived: false,
  //   }
  // },
]

async function seedReferences() {
  console.log('🌱 Starting reference data seeding...\n')

  const payload = await getPayload({ config })

  let added = 0
  let skipped = 0
  let errors = 0

  for (const item of REFERENCE_DATA) {
    try {
      const { collection, uniqueKey, data } = item

      // Проверка на дубликаты
      const existing = await payload.find({
        collection: collection as any,
        where: {
          [uniqueKey]: { equals: data[uniqueKey] },
        },
        limit: 1,
        overrideAccess: true,
      })

      if (existing.totalDocs > 0) {
        console.log(`⏭️  Skipped ${collection}: ${data[uniqueKey]} (already exists)`)
        skipped++
        continue
      }

      // Создание записи с overrideAccess
      await payload.create({
        collection: collection as any,
        data,
        overrideAccess: true,
      })

      console.log(`✅ Added ${collection}: ${data[uniqueKey]}`)
      added++
    } catch (error: any) {
      console.error(`❌ Error adding ${item.collection}:`, error.message)
      errors++
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`✅ Added: ${added}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('═══════════════════════════════════════\n')

  process.exit(errors > 0 ? 1 : 0)
}

seedReferences().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
