/**
 * FOXSTORE — Создание подкатегории «Фото и видео» (ПРАВИЛЬНАЯ РЕАЛИЗАЦИЯ)
 *
 * Создаёт line-подкатегорию в catalog_navigation для SEO и навигации
 * Переносит GoPro (ID 72, navigation ID 276) в подкатегорию
 *
 * АРХИТЕКТУРА:
 * - BrandCatalogNavigation управляет фильтрацией через products: [72]
 * - catalog_navigation управляет SEO, хлебными крошками и иерархией
 * - Товары привязываются явно по ID, без текстового поиска
 *
 * Instax товары (ID 204, 205) ОТСУТСТВУЮТ в production
 * Когда товары будут добавлены:
 * 1. Добавить их ID в BrandCatalogNavigation.groups[other].children[photo-video].products
 * 2. Создать для них product-записи в catalog_navigation с parent_id = line
 *
 * БЕЗОПАСНОСТЬ:
 * - Идемпотентно
 * - Default ROLLBACK
 * - Проверки перед каждой операцией
 * - Backup в temp таблицы
 */

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. СОЗДАНИЕ BACKUP
-- ════════════════════════════════════════════════════════════════

CREATE TEMP TABLE IF NOT EXISTS backup_photo_video_fix AS
SELECT * FROM catalog_navigation
WHERE id IN (229, 276)
   OR stable_key LIKE 'line:other:photo-video%'
   OR (parent_id IN (SELECT id FROM catalog_navigation WHERE stable_key = 'line:other:photo-video'));

-- ════════════════════════════════════════════════════════════════
-- 2. ПРОВЕРКИ ПЕРЕД ВЫПОЛНЕНИЕМ
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  other_group_count INT;
  gopro_nav_count INT;
  gopro_product_count INT;
  photo_video_line_count INT;
BEGIN
  -- Проверка 1: Группа «Другое» (ID 229) существует
  SELECT COUNT(*) INTO other_group_count
  FROM catalog_navigation
  WHERE id = 229 AND kind = 'group' AND product_group = 'other';

  IF other_group_count = 0 THEN
    RAISE EXCEPTION 'Группа «Другое» (ID 229) не найдена';
  END IF;

  -- Проверка 2: GoPro navigation (ID 276) существует
  SELECT COUNT(*) INTO gopro_nav_count
  FROM catalog_navigation
  WHERE id = 276 AND kind = 'product' AND product_id = 72;

  IF gopro_nav_count = 0 THEN
    RAISE EXCEPTION 'GoPro navigation (ID 276) не найдена';
  END IF;

  -- Проверка 3: GoPro товар (ID 72) существует
  SELECT COUNT(*) INTO gopro_product_count
  FROM products
  WHERE id = 72;

  IF gopro_product_count = 0 THEN
    RAISE EXCEPTION 'GoPro товар (ID 72) не найден в products';
  END IF;

  -- Проверка 4: Подкатегория ещё не создана
  SELECT COUNT(*) INTO photo_video_line_count
  FROM catalog_navigation
  WHERE stable_key = 'line:other:photo-video';

  IF photo_video_line_count > 0 THEN
    RAISE NOTICE '⚠️  Подкатегория «Фото и видео» уже существует (stable_key найден)';
  END IF;

  RAISE NOTICE '✅ Все проверки пройдены';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 3. СОЗДАНИЕ LINE-ПОДКАТЕГОРИИ
-- ════════════════════════════════════════════════════════════════

INSERT INTO catalog_navigation (
  title,
  kind,
  parent_id,
  product_group,
  product_line,
  stable_key,
  sort_order,
  is_visible,
  is_new,
  created_at,
  updated_at
)
SELECT
  'Фото и видео',
  'line',
  229,  -- parent_id = «Другое»
  'other',
  NULL,  -- product_line не используется для этой line
  'line:other:photo-video',
  95,  -- sort_order между Apple (90) и текущим GoPro (100)
  TRUE,
  FALSE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_navigation WHERE stable_key = 'line:other:photo-video'
);

-- ════════════════════════════════════════════════════════════════
-- 4. ПЕРЕНОС GoPro В ПОДКАТЕГОРИЮ
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  photo_video_line_id INT;
  current_gopro_parent INT;
BEGIN
  -- Получаем ID подкатегории
  SELECT id INTO photo_video_line_id
  FROM catalog_navigation
  WHERE stable_key = 'line:other:photo-video';

  IF photo_video_line_id IS NULL THEN
    RAISE EXCEPTION 'Подкатегория «Фото и видео» не найдена после создания';
  END IF;

  -- Проверяем текущий parent_id GoPro
  SELECT parent_id INTO current_gopro_parent
  FROM catalog_navigation
  WHERE id = 276;

  IF current_gopro_parent = photo_video_line_id THEN
    RAISE NOTICE '⚠️  GoPro уже находится в подкатегории «Фото и видео»';
  ELSE
    -- Переносим GoPro
    UPDATE catalog_navigation
    SET
      parent_id = photo_video_line_id,
      sort_order = 10,  -- Первый товар в подкатегории
      updated_at = NOW()
    WHERE id = 276 AND product_id = 72;

    RAISE NOTICE '✅ GoPro (ID 276) перенесён в подкатегорию «Фото и видео»';
    RAISE NOTICE '   parent_id: % → %', current_gopro_parent, photo_video_line_id;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════
-- 5. ФИНАЛЬНЫЕ ПРОВЕРКИ
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  photo_video_line_id INT;
  photo_video_line_count INT;
  gopro_parent_id INT;
  gopro_in_subcategory BOOLEAN;
BEGIN
  -- Проверка 1: Подкатегория создана
  SELECT COUNT(*), MAX(id) INTO photo_video_line_count, photo_video_line_id
  FROM catalog_navigation
  WHERE stable_key = 'line:other:photo-video';

  IF photo_video_line_count = 0 THEN
    RAISE EXCEPTION 'Подкатегория «Фото и видео» не создана';
  END IF;

  IF photo_video_line_count > 1 THEN
    RAISE EXCEPTION 'Дубликаты подкатегории «Фото и видео» (count: %)', photo_video_line_count;
  END IF;

  -- Проверка 2: GoPro перенесён корректно
  SELECT parent_id INTO gopro_parent_id
  FROM catalog_navigation
  WHERE id = 276;

  gopro_in_subcategory := (gopro_parent_id = photo_video_line_id);

  IF NOT gopro_in_subcategory THEN
    RAISE EXCEPTION 'GoPro не перенесён в подкатегорию. parent_id=%, expected=%', gopro_parent_id, photo_video_line_id;
  END IF;

  -- Проверка 3: Нет дублирующих product-записей для GoPro
  DECLARE
    gopro_nav_count INT;
  BEGIN
    SELECT COUNT(*) INTO gopro_nav_count
    FROM catalog_navigation
    WHERE product_id = 72 AND kind = 'product';

    IF gopro_nav_count > 1 THEN
      RAISE EXCEPTION 'Дублирующие navigation записи для GoPro (count: %)', gopro_nav_count;
    END IF;
  END;

  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Подкатегория «Фото и видео» создана (ID: %)', photo_video_line_id;
  RAISE NOTICE 'GoPro перенесён в подкатегорию';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '⚠️  ROLLBACK по умолчанию';
  RAISE NOTICE '   Для применения изменений замените ROLLBACK на COMMIT';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'СЛЕДУЮЩИЙ ШАГ: Обновить BrandCatalogNavigation';
  RAISE NOTICE '  1. Зайти в Payload CMS → Globals → Brand Catalog Navigation';
  RAISE NOTICE '  2. Найти группу "ДРУГОЕ"';
  RAISE NOTICE '  3. Добавить дочерний элемент:';
  RAISE NOTICE '     - title: "Фото и видео"';
  RAISE NOTICE '     - key: "other-photo-video"';
  RAISE NOTICE '     - href: "/catalog?placement=other-photo-video"';
  RAISE NOTICE '     - products: [72] (GoPro)';
  RAISE NOTICE '     - sortOrder: 95';
  RAISE NOTICE '  4. Сохранить';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 6. ОТКАТ ПО УМОЛЧАНИЮ
-- ════════════════════════════════════════════════════════════════

ROLLBACK;
-- Раскомментируйте COMMIT и закомментируйте ROLLBACK для применения:
-- COMMIT;
