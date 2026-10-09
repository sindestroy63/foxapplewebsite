-- ═══════════════════════════════════════════════════════════════════
-- FOXSTORE PRODUCTION 404 FIX - FINAL PATCH
-- ═══════════════════════════════════════════════════════════════════
--
-- TARGETS: 14 products
--   - 12 products with invalid slugs (Cyrillic, uppercase, spaces)
--   - 2 Instax products (fix product_line, create navigation)
--
-- SAFETY:
--   - Transaction with explicit checks
--   - Validates old values before UPDATE
--   - Creates temp backup table
--   - Verifies exact update count
--   - Default ROLLBACK (uncomment COMMIT after verification)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: CREATE BACKUP
-- ═══════════════════════════════════════════════════════════════════

CREATE TEMP TABLE products_backup_20261009 AS
SELECT id, name, slug, product_group, brand, product_line
FROM products
WHERE id IN (20, 51, 56, 57, 58, 60, 62, 63, 67, 69, 72, 78, 204, 205);

\echo '✅ Backup created for 14 products'

-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: UPDATE SLUGS (12 products)
-- ═══════════════════════════════════════════════════════════════════

-- Apple products (6)
UPDATE products
SET slug = 'apple-airpods-max-2-2026'
WHERE id = 63
  AND slug = 'Apple AirPods Max 2 (2026)'
  AND product_group = 'audio';

UPDATE products
SET slug = 'apple-macbook-neo-a18-pro-2026'
WHERE id = 20
  AND slug = 'Apple MacBook Neo (A18 Pro, 2026)'
  AND product_group = 'laptops';

UPDATE products
SET slug = 'apple-ipad-air-m4-2026'
WHERE id = 56
  AND slug = 'Apple-iPad-Air-(M4, 2026)'
  AND product_group = 'tablets';

UPDATE products
SET slug = 'apple-ipad-pro-m5-2025'
WHERE id = 57
  AND slug = 'Apple iPad Pro (M5, 2025)'
  AND product_group = 'tablets';

UPDATE products
SET slug = 'apple-macbook-air-m5-2026'
WHERE id = 58
  AND slug = 'Apple MacBook Air (M5, 2026)'
  AND product_group = 'laptops';

UPDATE products
SET slug = 'apple-macbook-pro-m5-2025'
WHERE id = 62
  AND slug = 'Apple MacBook Pro (M5, 2025)'
  AND product_group = 'laptops';

-- Samsung products (2)
UPDATE products
SET slug = 'chasy-samsung-galaxy-watch-8'
WHERE id = 69
  AND slug = 'Часы Samsung'
  AND product_group = 'smart-watches';

UPDATE products
SET slug = 'chasy-samsung-galaxy-watch-8-classic'
WHERE id = 78
  AND slug = 'chasy-samsung-galaxy-watch 8-classic'
  AND product_group = 'smart-watches';

-- Other products (2)
UPDATE products
SET slug = 'naushniki-marshall'
WHERE id = 67
  AND slug = 'Наушники Marshall'
  AND product_group = 'audio';

UPDATE products
SET slug = 'ekshn-kamera-gopro'
WHERE id = 72
  AND slug = 'Экшн-камера GoPro'
  AND product_group = 'other';

-- Dyson products (2)
UPDATE products
SET slug = 'vypryamitel-dyson-ht01'
WHERE id = 51
  AND slug = 'Выпрямитель-Dyson-HT01 '
  AND product_group = 'home-appliances';

UPDATE products
SET slug = 'fen-dyson-supersonic-nural-hd16'
WHERE id = 60
  AND slug = 'Фены Dyson'
  AND product_group = 'home-appliances';

\echo '✅ Slugs updated for 12 products'

-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: FIX INSTAX PRODUCT_LINE (2 products)
-- ═══════════════════════════════════════════════════════════════════

UPDATE products
SET product_line = 'Instax Mini'
WHERE id IN (204, 205)
  AND product_line = 'Экшн-камера GoPro';

\echo '✅ Instax product_line fixed'

-- ═══════════════════════════════════════════════════════════════════
-- STEP 4: VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'VERIFICATION: Compare old vs new values'
\echo '═══════════════════════════════════════════════════════════════════'

SELECT
  b.id,
  LEFT(b.name, 30) as name,
  b.slug as old_slug,
  p.slug as new_slug,
  CASE
    WHEN b.slug != p.slug THEN '✅ CHANGED'
    WHEN b.id IN (204, 205) AND p.product_line != b.product_line THEN '✅ CHANGED'
    ELSE '❌ NO CHANGE'
  END as status
FROM products_backup_20261009 b
JOIN products p ON b.id = p.id
ORDER BY b.id;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 5: UPDATE COUNT VALIDATION
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  slug_updated INTEGER;
  line_updated INTEGER;
BEGIN
  -- Count slug changes
  SELECT COUNT(*) INTO slug_updated
  FROM products p
  JOIN products_backup_20261009 b ON p.id = b.id
  WHERE p.slug != b.slug;

  -- Count product_line changes
  SELECT COUNT(*) INTO line_updated
  FROM products p
  JOIN products_backup_20261009 b ON p.id = b.id
  WHERE p.product_line != b.product_line;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'UPDATE COUNT VALIDATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Expected: 12 slug updates, 2 product_line updates';
  RAISE NOTICE 'Actual:   % slug updates, % product_line updates', slug_updated, line_updated;

  IF slug_updated != 12 THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Expected 12 slug updates, got %', slug_updated;
  END IF;

  IF line_updated != 2 THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Expected 2 product_line updates, got %', line_updated;
  END IF;

  RAISE NOTICE '✅ VALIDATION PASSED: All updates correct';
  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 6: CHECK NO SIDE EFFECTS
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  ray_ban_count INTEGER;
  dualsense_count INTEGER;
BEGIN
  -- Verify Ray-Ban products unchanged
  SELECT COUNT(*) INTO ray_ban_count
  FROM products
  WHERE id IN (101, 173, 174, 175)
    AND product_group = 'smart-devices'
    AND slug ~ '^[a-z0-9-]+$';

  -- Verify DualSense unchanged
  SELECT COUNT(*) INTO dualsense_count
  FROM products
  WHERE id = 55
    AND slug = 'geympady-ps5'
    AND product_group = 'gaming-consoles';

  IF ray_ban_count != 4 THEN
    RAISE EXCEPTION '❌ Ray-Ban products affected! Found % correct, expected 4', ray_ban_count;
  END IF;

  IF dualsense_count != 1 THEN
    RAISE EXCEPTION '❌ DualSense product affected!';
  END IF;

  RAISE NOTICE '✅ Previously fixed products (Ray-Ban, DualSense) unchanged';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- FINAL DECISION
-- ═══════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo '⚠️  REVIEW OUTPUT ABOVE'
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'If all validations passed:'
\echo '  1. Comment out ROLLBACK below'
\echo '  2. Uncomment COMMIT'
\echo '  3. Re-run this script'
\echo ''
\echo 'Current state: ROLLBACK (no changes applied)'
\echo '═══════════════════════════════════════════════════════════════════'

-- DEFAULT: ROLLBACK (safe)
ROLLBACK;

-- After verification, replace ROLLBACK with:
-- COMMIT;
