/**
 * FOXSTORE Production Migration SQL
 *
 * Ray-Ban category fix + DualSense slug normalization
 */

BEGIN;

-- Verification BEFORE
SELECT 'BEFORE STATE' as status, id, name, slug, product_group
FROM products WHERE id IN (55, 101, 173, 174, 175)
ORDER BY id;

-- 1. Ray-Ban: gaming-consoles → smart-devices
UPDATE products
SET
  product_group = 'smart-devices',
  updated_at = NOW()
WHERE id IN (101, 173, 174, 175)
  AND product_group = 'gaming-consoles';

-- 2. DualSense: Cyrillic slug → transliterated
UPDATE products
SET
  slug = 'geympady-ps5',
  updated_at = NOW()
WHERE id = 55
  AND slug = 'Геймпады-PS5';

-- Verification AFTER
SELECT 'AFTER STATE' as status, id, name, slug, product_group
FROM products WHERE id IN (55, 101, 173, 174, 175)
ORDER BY id;

-- Commit (comment out for DRY RUN)
COMMIT;
