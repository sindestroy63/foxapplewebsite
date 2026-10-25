





BEGIN;


SELECT 'BEFORE STATE' as status, id, name, slug, product_group
FROM products WHERE id IN (55, 101, 173, 174, 175)
ORDER BY id;


UPDATE products
SET
  product_group = 'smart-devices',
  updated_at = NOW()
WHERE id IN (101, 173, 174, 175)
  AND product_group = 'gaming-consoles';


UPDATE products
SET
  slug = 'geympady-ps5',
  updated_at = NOW()
WHERE id = 55
  AND slug = 'Геймпады-PS5';


SELECT 'AFTER STATE' as status, id, name, slug, product_group
FROM products WHERE id IN (55, 101, 173, 174, 175)
ORDER BY id;


COMMIT;
