-- ═══════════════════════════════════════════════════════════════════
-- FOXSTORE PRODUCTION NAVIGATION FIX
-- ═══════════════════════════════════════════════════════════════════
--
-- Updates navigation.href for target products only
-- Does NOT touch other 29 mismatched navigation entries
--
-- IMPORTANT: Run this AFTER slug updates are committed
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY SLUGS WERE UPDATED
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM products
  WHERE slug ~ '^[a-z0-9-]+$'  -- Valid slug format
    AND id IN (20, 51, 56, 57, 58, 60, 62, 63, 67, 69, 72, 78);

  IF updated_count != 12 THEN
    RAISE EXCEPTION '❌ Slugs not fully normalized! Found % valid, expected 12', updated_count;
  END IF;

  RAISE NOTICE '✅ All target slugs verified';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- UPDATE NAVIGATION HREF (TARGET PRODUCTS ONLY)
-- ═══════════════════════════════════════════════════════════════════

UPDATE catalog_navigation cn
SET
  href = '/catalog/' || p.product_group || '/' || p.slug,
  updated_at = NOW()
FROM products p
WHERE cn.product_id = p.id
  AND p.id IN (20, 51, 60, 63, 67, 69, 72, 78)  -- Only products with existing navigation
  AND cn.href != '/catalog/' || p.product_group || '/' || p.slug;

\echo '✅ Navigation updated for target products'

-- ═══════════════════════════════════════════════════════════════════
-- CREATE NAVIGATION FOR INSTAX (if not exists)
-- ═══════════════════════════════════════════════════════════════════

-- Get parent navigation ID for "other" category
DO $$
DECLARE
  other_parent_id INTEGER;
  gopro_nav_id INTEGER;
  instax12_exists BOOLEAN;
  instax13_exists BOOLEAN;
BEGIN
  -- Find parent for "other" category
  SELECT id INTO other_parent_id
  FROM catalog_navigation
  WHERE product_group = 'other'
    AND kind = 'category'
    AND parent_id IS NULL
  LIMIT 1;

  IF other_parent_id IS NULL THEN
    RAISE EXCEPTION '❌ Parent navigation for "other" category not found';
  END IF;

  -- Check if Instax navigation already exists
  SELECT EXISTS(
    SELECT 1 FROM catalog_navigation WHERE product_id = 204
  ) INTO instax12_exists;

  SELECT EXISTS(
    SELECT 1 FROM catalog_navigation WHERE product_id = 205
  ) INTO instax13_exists;

  -- Create navigation for Instax Mini 12 if not exists
  IF NOT instax12_exists THEN
    INSERT INTO catalog_navigation (
      title, kind, product_group, href, sort_order,
      is_visible, product_id, parent_id, stable_key,
      generated_by, updated_at, created_at
    )
    SELECT
      p.name,
      'product',
      'other',
      '/catalog/other/' || p.slug,
      300,
      true,
      p.id,
      other_parent_id,
      'product-' || p.id,
      'manual-migration',
      NOW(),
      NOW()
    FROM products p
    WHERE p.id = 204;

    RAISE NOTICE '✅ Created navigation for Instax Mini 12';
  ELSE
    RAISE NOTICE '⚠️  Navigation for Instax Mini 12 already exists';
  END IF;

  -- Create navigation for Instax Mini 13 if not exists
  IF NOT instax13_exists THEN
    INSERT INTO catalog_navigation (
      title, kind, product_group, href, sort_order,
      is_visible, product_id, parent_id, stable_key,
      generated_by, updated_at, created_at
    )
    SELECT
      p.name,
      'product',
      'other',
      '/catalog/other/' || p.slug,
      301,
      true,
      p.id,
      other_parent_id,
      'product-' || p.id,
      'manual-migration',
      NOW(),
      NOW()
    FROM products p
    WHERE p.id = 205;

    RAISE NOTICE '✅ Created navigation for Instax Mini 13';
  ELSE
    RAISE NOTICE '⚠️  Navigation for Instax Mini 13 already exists';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'NAVIGATION VERIFICATION'
\echo '═══════════════════════════════════════════════════════════════════'

SELECT
  cn.id as nav_id,
  p.id as product_id,
  LEFT(p.name, 30) as name,
  cn.href,
  CASE
    WHEN cn.href = '/catalog/' || p.product_group || '/' || p.slug THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as status
FROM catalog_navigation cn
JOIN products p ON cn.product_id = p.id
WHERE p.id IN (20, 51, 60, 63, 67, 69, 72, 78, 204, 205)
ORDER BY p.id;

DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM catalog_navigation cn
  JOIN products p ON cn.product_id = p.id
  WHERE p.id IN (20, 51, 60, 63, 67, 69, 72, 78, 204, 205)
    AND cn.href != '/catalog/' || p.product_group || '/' || p.slug;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION '❌ Found % navigation mismatches for target products', mismatch_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All target product navigation verified correct';
END $$;

COMMIT;
