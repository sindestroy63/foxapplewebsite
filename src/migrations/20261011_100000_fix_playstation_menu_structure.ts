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
 * Товары PlayStation 5 (консоли):
 * - PlayStation 5 Pro
 * - PlayStation 5 Slim Disc
 * - PlayStation 5 Slim Digital
 * - PlayStation 5 Slim Disc Ghost of Yotei Limited Edition
 *
 * Товары Аксессуары для PS5:
 * - Дисковод Sony Disc Drive
 * - Игровые наушники PlayStation PULSE Explore
 * - Наушники PlayStation PULSE 3D (CFI-ZWH1)
 * - Шлем VR Sony PlayStation VR2
 * - Портативная консоль PS Portal Remote Player
 * - Подставка Vertical Stand
 * - Зарядная станция Sony DualSense
 */

const PS5_CONSOLE_NAMES = [
  'PlayStation 5 Pro',
  'PlayStation 5 Slim Disc',
  'PlayStation 5 Slim Digital',
  'PlayStation 5 Slim Disc Ghost of Yotei Limited Edition',
]

// Ключевые слова для аксессуаров (в порядке приоритета проверки)
const PS5_ACCESSORY_PATTERNS = [
  { keyword: 'Дисковод', name: 'Дисковод Sony Disc Drive' },
  { keyword: 'PULSE Explore', name: 'Игровые наушники PlayStation PULSE Explore' },
  { keyword: 'PULSE 3D', name: 'Наушники PlayStation PULSE 3D' },
  { keyword: 'PlayStation VR2', name: 'Шлем VR Sony PlayStation VR2' },
  { keyword: 'PS Portal', name: 'Портативная консоль PS Portal Remote Player' },
  { keyword: 'Vertical Stand', name: 'Подставка Vertical Stand' },
  { keyword: 'Зарядная станция', name: 'Зарядная станция Sony DualSense' },
]

// Проверка, является ли товар консолью PS5 (точное совпадение)
function isPS5Console(name: string): boolean {
  return PS5_CONSOLE_NAMES.some((consoleName) => {
    // Точное совпадение или name начинается с consoleName
    return name === consoleName || name.startsWith(consoleName + ' ')
  })
}

// Проверка, является ли товар аксессуаром PS5 (не геймпадом!)
function isPS5Accessory(name: string, productLine: string | null): boolean {
  // Если уже является геймпадом, то НЕ аксессуар
  if (productLine === 'Геймпады PS5') return false

  // Проверить по ключевым словам
  return PS5_ACCESSORY_PATTERNS.some(({ keyword }) => name.includes(keyword))
}

// Проверка, является ли товар геймпадом
function isGamepad(name: string, productLine: string | null): boolean {
  // Уже имеет productLine геймпада
  if (productLine === 'Геймпады PS5') return true

  // Содержит "Геймпад" но НЕ содержит "Зарядная станция"
  if (name.includes('Геймпад') && !name.includes('Зарядная станция')) return true

  // Содержит "DualSense" но НЕ "Зарядная станция"
  if (name.includes('DualSense') && !name.includes('Зарядная станция')) return true

  return false
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  payload.logger.info('Starting PlayStation menu structure migration...')

  try {
    // Получить все товары Sony gaming-consoles
    const allPlayStationProducts = await payload.find({
      collection: 'products',
      where: {
        and: [
          { productGroup: { equals: 'gaming-consoles' } },
          { brand: { equals: 'Sony' } },
        ],
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
      if (isPS5Console(name)) {
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

    // Проверка: должно быть ровно 4 консоли и 7 аксессуаров
    if (consolesToUpdate.length !== 4) {
      payload.logger.error(`Expected 4 consoles, found ${consolesToUpdate.length}. Aborting migration.`)
      throw new Error(`PlayStation migration: Expected 4 consoles, found ${consolesToUpdate.length}`)
    }

    if (accessoriesToUpdate.length !== 7) {
      payload.logger.error(`Expected 7 accessories, found ${accessoriesToUpdate.length}. Aborting migration.`)
      throw new Error(`PlayStation migration: Expected 7 accessories, found ${accessoriesToUpdate.length}`)
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
