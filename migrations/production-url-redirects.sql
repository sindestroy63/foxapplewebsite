-- ═══════════════════════════════════════════════════════════════════
-- FOXSTORE PRODUCTION URL REDIRECTS
-- ═══════════════════════════════════════════════════════════════════
--
-- Creates 308 permanent redirects for old URLs → new URLs
--
-- IMPORTANT: Run this AFTER slug updates are committed
-- REQUIRES: postgres user or admin with INSERT permission on url_redirects
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
  WHERE (id = 63 AND slug = 'apple-airpods-max-2-2026')
     OR (id = 20 AND slug = 'apple-macbook-neo-a18-pro-2026')
     OR (id = 56 AND slug = 'apple-ipad-air-m4-2026')
     OR (id = 57 AND slug = 'apple-ipad-pro-m5-2025')
     OR (id = 58 AND slug = 'apple-macbook-air-m5-2026')
     OR (id = 62 AND slug = 'apple-macbook-pro-m5-2025')
     OR (id = 69 AND slug = 'chasy-samsung-galaxy-watch-8')
     OR (id = 78 AND slug = 'chasy-samsung-galaxy-watch-8-classic')
     OR (id = 67 AND slug = 'naushniki-marshall')
     OR (id = 72 AND slug = 'ekshn-kamera-gopro')
     OR (id = 51 AND slug = 'vypryamitel-dyson-ht01')
     OR (id = 60 AND slug = 'fen-dyson-supersonic-nural-hd16');

  IF updated_count != 12 THEN
    RAISE EXCEPTION '❌ Slugs not updated yet! Found % updated products, expected 12. Run production-404-final-patch.sql first.', updated_count;
  END IF;

  RAISE NOTICE '✅ All slugs verified as updated';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- INSERT URL REDIRECTS
-- ═══════════════════════════════════════════════════════════════════

-- Apple: brand-based URLs → productGroup-based URLs with normalized slugs
INSERT INTO url_redirects ("from", "to", permanent, source, updated_at, created_at)
VALUES
  -- AirPods Max 2
  ('/catalog/airpods/Apple AirPods Max 2 (2026)', '/catalog/audio/apple-airpods-max-2-2026', true, 'manual-migration', NOW(), NOW()),

  -- MacBook Neo
  ('/catalog/macbook/Apple MacBook Neo (A18 Pro, 2026)', '/catalog/laptops/apple-macbook-neo-a18-pro-2026', true, 'manual-migration', NOW(), NOW()),

  -- iPad Air M4
  ('/catalog/ipad/Apple-iPad-Air-(M4, 2026)', '/catalog/tablets/apple-ipad-air-m4-2026', true, 'manual-migration', NOW(), NOW()),

  -- iPad Pro M5
  ('/catalog/ipad/Apple iPad Pro (M5, 2025)', '/catalog/tablets/apple-ipad-pro-m5-2025', true, 'manual-migration', NOW(), NOW()),

  -- MacBook Air M5
  ('/catalog/macbook/Apple MacBook Air (M5, 2026)', '/catalog/laptops/apple-macbook-air-m5-2026', true, 'manual-migration', NOW(), NOW()),

  -- MacBook Pro M5
  ('/catalog/macbook/Apple MacBook Pro (M5, 2025)', '/catalog/laptops/apple-macbook-pro-m5-2025', true, 'manual-migration', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE SET
  "to" = EXCLUDED."to",
  updated_at = NOW();

-- Samsung: brand-based URLs → productGroup-based URLs
INSERT INTO url_redirects ("from", "to", permanent, source, updated_at, created_at)
VALUES
  -- Galaxy Watch 8
  ('/catalog/samsung-watch/Часы Samsung', '/catalog/smart-watches/chasy-samsung-galaxy-watch-8', true, 'manual-migration', NOW(), NOW()),

  -- Galaxy Watch 8 Classic (with space in old slug)
  ('/catalog/samsung-watch/chasy-samsung-galaxy-watch 8-classic', '/catalog/smart-watches/chasy-samsung-galaxy-watch-8-classic', true, 'manual-migration', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE SET
  "to" = EXCLUDED."to",
  updated_at = NOW();

-- Other: Cyrillic slugs → normalized slugs
INSERT INTO url_redirects ("from", "to", permanent, source, updated_at, created_at)
VALUES
  -- Marshall
  ('/catalog/audio/Наушники Marshall', '/catalog/audio/naushniki-marshall', true, 'manual-migration', NOW(), NOW()),

  -- GoPro
  ('/catalog/other/Экшн-камера GoPro', '/catalog/other/ekshn-kamera-gopro', true, 'manual-migration', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE SET
  "to" = EXCLUDED."to",
  updated_at = NOW();

-- Dyson: brand-based URLs → productGroup-based URLs with normalized slugs
INSERT INTO url_redirects ("from", "to", permanent, source, updated_at, created_at)
VALUES
  -- HT01 (trailing space in old slug)
  ('/catalog/dyson/Выпрямитель-Dyson-HT01 ', '/catalog/home-appliances/vypryamitel-dyson-ht01', true, 'manual-migration', NOW(), NOW()),

  -- Supersonic
  ('/catalog/dyson/Фены Dyson', '/catalog/home-appliances/fen-dyson-supersonic-nural-hd16', true, 'manual-migration', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE SET
  "to" = EXCLUDED."to",
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════

\echo ''
\echo '═══════════════════════════════════════════════════════════════════'
\echo 'URL REDIRECTS CREATED'
\echo '═══════════════════════════════════════════════════════════════════'

SELECT
  "from" as old_url,
  "to" as new_url,
  permanent,
  source
FROM url_redirects
WHERE source = 'manual-migration'
ORDER BY created_at DESC;

DO $$
DECLARE
  redirect_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO redirect_count
  FROM url_redirects
  WHERE source = 'manual-migration';

  IF redirect_count != 12 THEN
    RAISE EXCEPTION '❌ Expected 12 redirects, found %', redirect_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ All 12 URL redirects created successfully';
END $$;

COMMIT;
