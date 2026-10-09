import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * PRODUCTION-миграция: Подкатегория "Фото и видео" в категории "Другое"
 *
 * Production данные (72.56.34.120):
 * - MAX(products.id) = 206
 * - ID 72: Экшн-камера GoPro
 * - ID 204: Fujifilm Instax Mini 12
 * - ID 205: Fujifilm Instax Mini 13
 *
 * Изменения:
 * 1. Обновляет product_line только для Instax (204, 205)
 * 2. GoPro (72) сохраняет существующий product_line
 * 3. Создаёт подкатегорию "Фото и видео" в catalog_navigation
 * 4. Связывает все три товара с подкатегорией
 * 5. Обновляет BrandCatalogNavigation с явным списком [72, 204, 205]
 */

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  console.log('[photo-video] Starting production migration')

  // Сохранить текущие связи товаров для отката
  const existingRels = await db.execute(sql`
    SELECT id, parent_id, products_id, path, "order"
    FROM catalog_navigation_rels
    WHERE products_id IN (72, 204, 205)
  `)

  const savedRels = existingRels.rows as Array<{
    id: number
    parent_id: number
    products_id: number
    path: string
    order: number | null
  }>

  console.log(`[photo-video] Saved ${savedRels.length} existing relationships for rollback`)

  // Проверка всех трёх товаров
  const products = await db.execute(sql`
    SELECT id, name, product_line, product_group
    FROM products
    WHERE id IN (72, 204, 205)
    ORDER BY id
  `)

  if (products.rows.length !== 3) {
    throw new Error(`[photo-video] Expected 3 products (72, 204, 205), found ${products.rows.length}`)
  }

  const productMap = new Map(products.rows.map((p: any) => [p.id, p]))

  const gopro = productMap.get(72)
  const instax12 = productMap.get(204)
  const instax13 = productMap.get(205)

  if (!gopro || !instax12 || !instax13) {
    throw new Error('[photo-video] Missing products: GoPro(72), Instax Mini 12(204), or Instax Mini 13(205)')
  }

  console.log('[photo-video] Found products:', {
    gopro: { name: gopro.name, product_line: gopro.product_line },
    instax12: { name: instax12.name, product_line: instax12.product_line },
    instax13: { name: instax13.name, product_line: instax13.product_line },
  })

  // Проверка product_group
  for (const product of [gopro, instax12, instax13]) {
    if (product.product_group !== 'other') {
      throw new Error(`[photo-video] Product ${product.id} has wrong product_group: ${product.product_group}, expected: other`)
    }
  }

  // 1. Обновить product_line ТОЛЬКО для Instax (204, 205)
  // GoPro (72) сохраняет свой текущий product_line
  console.log('[photo-video] Updating product_line for Instax products only')

  await db.execute(sql`
    UPDATE products
    SET product_line = 'Instax Mini'
    WHERE id IN (204, 205)
  `)

  console.log('[photo-video] GoPro (72) keeps its existing product_line:', gopro.product_line)

  // 2. Создать подкатегорию "Фото и видео" в catalog_navigation
  console.log('[photo-video] Creating subcategory in catalog_navigation')

  // Проверка: подкатегория не существует
  const existing = await db.execute(sql`
    SELECT id
    FROM catalog_navigation
    WHERE kind = 'subcategory'
      AND product_group = 'other'
      AND title = 'Фото и видео'
  `)

  let subcategoryId: number

  if (existing.rows.length > 0) {
    subcategoryId = (existing.rows[0] as { id: number }).id
    console.log(`[photo-video] Subcategory already exists with id=${subcategoryId}, updating`)

    await db.execute(sql`
      UPDATE catalog_navigation
      SET
        product_line = 'Фото и видео',
        href = '/catalog?group=other&subcategory=photo-video',
        sort_order = 50,
        is_visible = true,
        is_new = false
      WHERE id = ${subcategoryId}
    `)
  } else {
    const inserted = await db.execute(sql`
      INSERT INTO catalog_navigation (
        title,
        kind,
        product_group,
        product_line,
        href,
        sort_order,
        is_visible,
        is_new
      )
      VALUES (
        'Фото и видео',
        'subcategory',
        'other',
        'Фото и видео',
        '/catalog?group=other&subcategory=photo-video',
        50,
        true,
        false
      )
      RETURNING id
    `)

    subcategoryId = (inserted.rows[0] as { id: number }).id
    console.log(`[photo-video] Created subcategory with id=${subcategoryId}`)
  }

  // 3. Обновить связи товаров: удалить старые, создать новые
  console.log('[photo-video] Updating product relationships')

  // Удалить только связи с catalog_navigation для этих товаров
  await db.execute(sql`
    DELETE FROM catalog_navigation_rels
    WHERE products_id IN (72, 204, 205)
      AND path = 'catalog-navigation'
  `)

  // Создать новые связи с подкатегорией
  await db.execute(sql`
    INSERT INTO catalog_navigation_rels (parent_id, products_id, path, "order")
    VALUES
      (${subcategoryId}, 72, 'catalog-navigation', 0),
      (${subcategoryId}, 204, 'catalog-navigation', 1),
      (${subcategoryId}, 205, 'catalog-navigation', 2)
  `)

  console.log('[photo-video] All products linked to subcategory')

  // 4. Обновить BrandCatalogNavigation через Payload API (с транзакционностью)
  if (payload) {
    console.log('[photo-video] Updating BrandCatalogNavigation')

    try {
      const current = await payload.findGlobal({
        slug: 'brand-catalog-navigation',
        depth: 0,
      }) as any

      const groups = Array.isArray(current.groups) ? current.groups : []

      // Найти группу "ДРУГОЕ"
      const otherGroupIndex = groups.findIndex((g: any) => g.key === 'other')

      if (otherGroupIndex === -1) {
        console.warn('[photo-video] Group "other" not found in BrandCatalogNavigation, skipping')
      } else {
        const otherGroup = groups[otherGroupIndex]
        const children = Array.isArray(otherGroup.children) ? otherGroup.children : []

        // Проверить существование подраздела "Фото и видео"
        const photoVideoIndex = children.findIndex((c: any) => c.key === 'other-photo-video')

        if (photoVideoIndex === -1) {
          // Добавить новый подраздел со всеми тремя товарами
          children.push({
            title: 'Фото и видео',
            key: 'other-photo-video',
            href: '/catalog?group=other&subcategory=photo-video',
            filter: undefined,  // НЕ используем фильтр, только явный список products
            sortOrder: children.length,
            isVisible: true,
            isNew: false,
            products: [72, 204, 205],  // Все три товара: GoPro + Instax Mini 12 + Instax Mini 13
            coverImage: null,
          })

          console.log('[photo-video] Added "Фото и видео" to BrandCatalogNavigation with products [72, 204, 205]')
        } else {
          // Обновить существующий подраздел
          children[photoVideoIndex] = {
            ...children[photoVideoIndex],
            title: 'Фото и видео',
            href: '/catalog?group=other&subcategory=photo-video',
            filter: undefined,  // НЕ используем фильтр, только явный список products
            products: [72, 204, 205],  // Обновить список товаров
          }

          console.log('[photo-video] Updated "Фото и видео" in BrandCatalogNavigation with products [72, 204, 205]')
        }

        // Удалить старый подраздел "GoPro" если он существует
        const oldGoProIndex = children.findIndex((c: any) => c.key === 'other-gopro')
        if (oldGoProIndex !== -1) {
          children.splice(oldGoProIndex, 1)
          console.log('[photo-video] Removed old "GoPro" subcategory')
        }

        otherGroup.children = children
        groups[otherGroupIndex] = otherGroup

        // Сохранить изменения (атомарно)
        await payload.updateGlobal({
          slug: 'brand-catalog-navigation',
          data: { groups },
          depth: 0,
        })

        console.log('[photo-video] BrandCatalogNavigation updated successfully')
      }
    } catch (error) {
      console.error('[photo-video] Failed to update BrandCatalogNavigation:', error)
      // Откатываем catalog_navigation_rels при ошибке BrandCatalogNavigation
      console.error('[photo-video] Rolling back catalog_navigation_rels due to BrandCatalogNavigation error')

      // Восстановить старые связи
      await db.execute(sql`
        DELETE FROM catalog_navigation_rels
        WHERE products_id IN (72, 204, 205)
          AND path = 'catalog-navigation'
      `)

      for (const rel of savedRels) {
        await db.execute(sql`
          INSERT INTO catalog_navigation_rels (parent_id, products_id, path, "order")
          VALUES (${rel.parent_id}, ${rel.products_id}, ${rel.path}, ${rel.order})
          ON CONFLICT DO NOTHING
        `)
      }

      throw new Error(`BrandCatalogNavigation update failed: ${error}`)
    }
  }

  console.log('[photo-video] Migration completed successfully')
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  console.log('[photo-video] Rolling back migration')

  // Получить ID подкатегории перед удалением
  const subcategory = await db.execute(sql`
    SELECT id FROM catalog_navigation
    WHERE kind = 'subcategory'
      AND product_group = 'other'
      AND title = 'Фото и видео'
  `)

  const subcategoryId = subcategory.rows.length > 0 ? (subcategory.rows[0] as { id: number }).id : null

  // Сохранить текущие связи товаров для восстановления
  const currentRels = await db.execute(sql`
    SELECT parent_id, products_id, path, "order"
    FROM catalog_navigation_rels
    WHERE products_id IN (72, 204, 205)
      AND path = 'catalog-navigation'
  `)

  console.log(`[photo-video] Found ${currentRels.rows.length} current relationships to remove`)

  // 1. Удалить связи товаров с подкатегорией
  if (subcategoryId) {
    await db.execute(sql`
      DELETE FROM catalog_navigation_rels
      WHERE products_id IN (72, 204, 205)
        AND parent_id = ${subcategoryId}
        AND path = 'catalog-navigation'
    `)
  }

  // 2. Удалить подкатегорию
  await db.execute(sql`
    DELETE FROM catalog_navigation
    WHERE kind = 'subcategory'
      AND product_group = 'other'
      AND title = 'Фото и видео'
  `)

  // 3. Восстановить старые связи GoPro (если были)
  // Ищем существующую запись catalog_navigation для GoPro
  const goProNav = await db.execute(sql`
    SELECT id FROM catalog_navigation
    WHERE kind = 'product'
      AND product_group = 'other'
      AND product_line LIKE '%GoPro%'
      AND title LIKE '%GoPro%'
    LIMIT 1
  `)

  if (goProNav.rows.length > 0) {
    const goProNavId = (goProNav.rows[0] as { id: number }).id
    await db.execute(sql`
      INSERT INTO catalog_navigation_rels (parent_id, products_id, path, "order")
      VALUES (${goProNavId}, 72, 'catalog-navigation', 0)
      ON CONFLICT DO NOTHING
    `)
    console.log('[photo-video] Restored GoPro product relationship')
  }

  // Instax товары не имели связей до миграции, поэтому не восстанавливаем

  // 4. Откатить product_line для Instax к предыдущим значениям
  // Сохраняем текущие значения, так как они могли быть корректны

  // 5. Откатить BrandCatalogNavigation
  if (payload) {
    try {
      const current = await payload.findGlobal({
        slug: 'brand-catalog-navigation',
        depth: 0,
      }) as any

      const groups = Array.isArray(current.groups) ? current.groups : []
      const otherGroupIndex = groups.findIndex((g: any) => g.key === 'other')

      if (otherGroupIndex !== -1) {
        const otherGroup = groups[otherGroupIndex]
        const children = Array.isArray(otherGroup.children) ? otherGroup.children : []

        // Удалить подраздел "Фото и видео"
        otherGroup.children = children.filter((c: any) => c.key !== 'other-photo-video')
        groups[otherGroupIndex] = otherGroup

        await payload.updateGlobal({
          slug: 'brand-catalog-navigation',
          data: { groups },
          depth: 0,
        })

        console.log('[photo-video] BrandCatalogNavigation rollback completed')
      }
    } catch (error) {
      console.error('[photo-video] Failed to rollback BrandCatalogNavigation:', error)
      // Не бросаем ошибку — основной откат SQL уже выполнен
    }
  }

  console.log('[photo-video] Rollback completed')
}
