import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Миграция для исправления структуры меню PlayStation
 *
 * Цель:
 * 1. Установить productLine для консолей PS5 → "PlayStation 5"
 * 2. Установить productLine для аксессуаров PS5 → "Аксессуары для PS5"
 * 3. Обновить brand-catalog-navigation: добавить подраздел "Аксессуары для PS5"
 *
 * Production данные (12 товаров gaming-consoles):
 *
 * Консоли (4):
 * - ID 35 — PlayStation 5 Pro (brand: Sony)
 * - ID 36 — PlayStation 5 Slim Disk (brand: Sony)
 * - ID 37 — PlayStation 5 Slim Digital (brand: Sony)
 * - ID 180 — PlayStation 5 Slim Disk Ghost of Yotei Limited Edition (brand: Sony)
 *
 * Аксессуары (7):
 * - ID 59 — Зарядная станция Sony Dualsense (brand: Sony)
 * - ID 166 — Дисковод Sony Disc Drive (brand: пустой)
 * - ID 167 — Игровые наушники PlayStation PULSE Explore (brand: пустой)
 * - ID 168 — Наушники PlayStation PULSE 3D (brand: пустой)
 * - ID 169 — Шлем VR Sony PlayStation VR2 (brand: пустой)
 * - ID 170 — Портативная консоль PS Portal Remote Player (brand: пустой)
 * - ID 179 — Подставка Vertical Stand (brand: Sony)
 *
 * Геймпад (1):
 * - ID 55 — DualSense PS5 (brand: Sony)
 *
 * Важно: 5 аксессуаров имеют пустой brand, поэтому фильтр только по brand='Sony' не работает
 */

// Ключевые паттерны для консолей PS5 (по реальным названиям production)
const PS5_CONSOLE_PATTERNS = [
  /^PlayStation 5 Pro$/i,
  /^PlayStation 5 Slim Dis[ck]$/i,  // "Disk" или "Disc"
  /^PlayStation 5 Slim Digital$/i,
  /^PlayStation 5 Slim Dis[ck].*Ghost of (Y|Yo)tei/i,
]

// Паттерны для аксессуаров (по реальным названиям production)
const PS5_ACCESSORY_PATTERNS = [
  /Зарядная станция.*Dualsense/i,  // ID 59
  /Дисковод.*Disc Drive/i,          // ID 166
  /PULSE Explore/i,                  // ID 167
  /PULSE 3D/i,                       // ID 168
  /VR.*PlayStation VR2/i,            // ID 169
  /PS Portal/i,                      // ID 170
  /Vertical Stand/i,                 // ID 179
]

// Паттерны для геймпадов (исключить из аксессуаров)
const PS5_GAMEPAD_PATTERNS = [
  /^DualSense/i,
  /Геймпад.*PS5/i,
]

// Проверка, является ли товар консолью PS5 (гибкое совпадение)
function isPS5Console(name: string, productLine: string | null): boolean {
  // Если уже имеет productLine консоли - оставить как консоль
  if (productLine === 'PlayStation 5') return true

  // Проверить по паттернам
  return PS5_CONSOLE_PATTERNS.some((pattern) => pattern.test(name))
}

// Проверка, является ли товар геймпадом
function isGamepad(name: string, productLine: string | null): boolean {
  // Уже имеет productLine геймпада
  if (productLine === 'Геймпады PS5') return true

  // Проверить по паттернам геймпадов (исключая "Зарядная станция")
  if (name.includes('Зарядная станция')) return false

  return PS5_GAMEPAD_PATTERNS.some((pattern) => pattern.test(name))
}

// Проверка, является ли товар аксессуаром PS5 (не геймпадом!)
function isPS5Accessory(name: string, productLine: string | null): boolean {
  // Если уже является геймпадом или консолью, то НЕ аксессуар
  if (productLine === 'Геймпады PS5') return false
  if (productLine === 'PlayStation 5') return false

  // Если уже имеет productLine аксессуаров - оставить как аксессуар
  if (productLine === 'Аксессуары для PS5') return true

  // Проверить по паттернам аксессуаров
  return PS5_ACCESSORY_PATTERNS.some((pattern) => pattern.test(name))
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  payload.logger.info('Starting PlayStation menu structure migration...')

  try {
    // Получить все товары gaming-consoles (не только Sony, т.к. у некоторых аксессуаров brand пустой)
    const allPlayStationProducts = await payload.find({
      collection: 'products',
      where: {
        productGroup: { equals: 'gaming-consoles' },
      },
      limit: 1000,
      depth: 0,
    })

    payload.logger.info(`Found ${allPlayStationProducts.docs.length} PlayStation products`)

    // Разделить на консоли и аксессуары
    const consolesToUpdate: Array<{ id: number; name: string }> = []
    const accessoriesToUpdate: Array<{ id: number; name: string }> = []
    const gamepads: Array<{ id: number; name: string }> = []
    const unknown: Array<{ id: number; name: string; productLine: string | null }> = []

    allPlayStationProducts.docs.forEach((product: any) => {
      const name = product.name || ''
      const productLine = product.productLine || null

      // Сначала проверить геймпады (чтобы исключить их из аксессуаров)
      if (isGamepad(name, productLine)) {
        gamepads.push({ id: product.id, name })
        return
      }

      // Проверить, является ли товар консолью PS5
      if (isPS5Console(name, productLine)) {
        consolesToUpdate.push({ id: product.id, name })
        return
      }

      // Проверить, является ли товар аксессуаром PS5
      if (isPS5Accessory(name, productLine)) {
        accessoriesToUpdate.push({ id: product.id, name })
        return
      }

      // Неопознанный товар
      unknown.push({ id: product.id, name, productLine })
    })

    payload.logger.info(`Categorized: ${consolesToUpdate.length} consoles, ${accessoriesToUpdate.length} accessories, ${gamepads.length} gamepads, ${unknown.length} unknown`)

    // Логировать список товаров для каждой категории
    if (consolesToUpdate.length > 0) {
      payload.logger.info('Consoles to update:')
      consolesToUpdate.forEach((p) => payload.logger.info(`  - ${p.name} (ID: ${p.id})`))
    }

    if (accessoriesToUpdate.length > 0) {
      payload.logger.info('Accessories to update:')
      accessoriesToUpdate.forEach((p) => payload.logger.info(`  - ${p.name} (ID: ${p.id})`))
    }

    if (gamepads.length > 0) {
      payload.logger.info('Gamepads (skipped):')
      gamepads.forEach((p) => payload.logger.info(`  - ${p.name} (ID: ${p.id})`))
    }

    if (unknown.length > 0) {
      payload.logger.warn('Unknown PlayStation products (skipped):')
      unknown.forEach((p) => payload.logger.warn(`  - ${p.name} (ID: ${p.id}, productLine: ${p.productLine})`))
    }

    // Строгая проверка: должно быть ровно 4 консоли и 7 аксессуаров (по production данным)
    if (consolesToUpdate.length !== 4) {
      payload.logger.error(`Expected exactly 4 consoles, found ${consolesToUpdate.length}. Aborting migration.`)
      payload.logger.error('Migration requires all known consoles to be classified correctly.')
      throw new Error(`PlayStation migration: Expected exactly 4 consoles, found ${consolesToUpdate.length}`)
    }

    if (accessoriesToUpdate.length !== 7) {
      payload.logger.error(`Expected exactly 7 accessories, found ${accessoriesToUpdate.length}. Aborting migration.`)
      payload.logger.error('Migration requires all known accessories to be classified correctly.')
      throw new Error(`PlayStation migration: Expected exactly 7 accessories, found ${accessoriesToUpdate.length}`)
    }

    if (gamepads.length !== 1) {
      payload.logger.warn(`Expected 1 gamepad, found ${gamepads.length}. This is not critical, continuing.`)
    }

    // Обновить productLine для консолей
    if (consolesToUpdate.length > 0) {
      payload.logger.info(`Updating ${consolesToUpdate.length} consoles to productLine="PlayStation 5"...`)

      for (const console of consolesToUpdate) {
        await payload.update({
          collection: 'products',
          id: console.id,
          data: {
            productLine: 'PlayStation 5',
          },
        })
        payload.logger.info(`  ✓ Updated: ${console.name}`)
      }

      payload.logger.info('✓ Consoles updated')
    }

    // Обновить productLine для аксессуаров
    if (accessoriesToUpdate.length > 0) {
      payload.logger.info(`Updating ${accessoriesToUpdate.length} accessories to productLine="Аксессуары для PS5"...`)

      for (const accessory of accessoriesToUpdate) {
        await payload.update({
          collection: 'products',
          id: accessory.id,
          data: {
            productLine: 'Аксессуары для PS5',
          },
        })
        payload.logger.info(`  ✓ Updated: ${accessory.name}`)
      }

      payload.logger.info('✓ Accessories updated')
    }

    // Обновить brand-catalog-navigation
    payload.logger.info('Updating brand-catalog-navigation...')

    const nav = await payload.findGlobal({
      slug: 'brand-catalog-navigation',
      depth: 0,
    }) as any

    const groups = nav.groups || []
    const playstationGroup = groups.find((g: any) => g.key === 'playstation')

    if (playstationGroup) {
      // Проверить, есть ли уже подраздел "Аксессуары для PS5"
      const hasAccessoriesChild = playstationGroup.children?.some((child: any) => child.key === 'ps5-accessories')

      if (!hasAccessoriesChild) {
        // Добавить подраздел "Аксессуары для PS5"
        if (!Array.isArray(playstationGroup.children)) {
          playstationGroup.children = []
        }

        playstationGroup.children.push({
          title: 'Аксессуары для PS5',
          key: 'ps5-accessories',
          href: '/catalog?group=gaming-consoles&brand=Sony&line=Аксессуары+для+PS5',
          filter: {
            group: 'gaming-consoles',
            brand: 'Sony',
            line: 'Аксессуары для PS5',
          },
          sortOrder: 1,
          isVisible: true,
          isNew: false,
          coverImage: null,
          products: [],
        })

        // Обновить фильтр для "PlayStation 5" — добавить line для точности
        const ps5Child = playstationGroup.children.find((child: any) => child.key === 'playstation-5')
        if (ps5Child && !ps5Child.filter?.line) {
          ps5Child.filter = {
            ...ps5Child.filter,
            line: 'PlayStation 5',
          }
          ps5Child.href = '/catalog?group=gaming-consoles&brand=Sony&line=PlayStation+5'
        }

        await payload.updateGlobal({
          slug: 'brand-catalog-navigation',
          data: { groups },
        })

        payload.logger.info('✓ brand-catalog-navigation updated: added "Аксессуары для PS5" child')
      } else {
        payload.logger.info('✓ brand-catalog-navigation already has "Аксессуары для PS5" child')
      }
    } else {
      payload.logger.warn('PlayStation group not found in brand-catalog-navigation')
    }

    payload.logger.info('PlayStation menu structure migration completed successfully')
  } catch (error: unknown) {
    payload.logger.error('PlayStation menu structure migration failed')
    if (error instanceof Error) {
      payload.logger.error(error.message)
    }
    throw error
  }
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.info('Rolling back PlayStation menu structure migration...')

  try {
    // Получить все товары Sony gaming-consoles
    const allPlayStationProducts = await payload.find({
      collection: 'products',
      where: {
        and: [
          { productGroup: { equals: 'gaming-consoles' } },
          { brand: { equals: 'Sony' } },
          {
            or: [
              { productLine: { equals: 'PlayStation 5' } },
              { productLine: { equals: 'Аксессуары для PS5' } },
            ],
          },
        ],
      },
      limit: 1000,
      depth: 0,
    })

    payload.logger.info(`Found ${allPlayStationProducts.docs.length} products to rollback`)

    // Сбросить productLine для консолей и аксессуаров
    for (const product of allPlayStationProducts.docs) {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: {
          productLine: null,
        },
      })
    }

    // Удалить подраздел "Аксессуары для PS5" из brand-catalog-navigation
    const nav = await payload.findGlobal({
      slug: 'brand-catalog-navigation',
      depth: 0,
    }) as any

    const groups = nav.groups || []
    const playstationGroup = groups.find((g: any) => g.key === 'playstation')

    if (playstationGroup?.children) {
      playstationGroup.children = playstationGroup.children.filter((child: any) => child.key !== 'ps5-accessories')

      // Удалить line из фильтра "PlayStation 5"
      const ps5Child = playstationGroup.children.find((child: any) => child.key === 'playstation-5')
      if (ps5Child?.filter) {
        delete ps5Child.filter.line
        ps5Child.href = '/catalog?group=gaming-consoles&brand=Sony'
      }

      await payload.updateGlobal({
        slug: 'brand-catalog-navigation',
        data: { groups },
      })
    }

    payload.logger.info('PlayStation menu structure migration rollback completed')
  } catch (error: unknown) {
    payload.logger.error('PlayStation menu structure migration rollback failed')
    if (error instanceof Error) {
      payload.logger.error(error.message)
    }
    throw error
  }
}
