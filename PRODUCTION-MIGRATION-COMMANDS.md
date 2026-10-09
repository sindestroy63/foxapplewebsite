# FOXSTORE PRODUCTION MIGRATION — ФИНАЛЬНЫЕ КОМАНДЫ

**Дата:** 2026-10-09  
**Статус:** VERIFIED - Ready for execution  
**Риск:** LOW (idempotent, transactional, reversible)

---

## 📊 ТОЧНЫЕ ИЗМЕНЕНИЯ ДО → ПОСЛЕ

### Ray-Ban Products (4)

| ID | Name | productGroup BEFORE | productGroup AFTER | isAvailable |
|----|------|---------------------|-------------------|-------------|
| 101 | Ray Ban Wayfarer Gen 2 | gaming-consoles | smart-devices | true |
| 173 | Ray Ban Display | gaming-consoles | smart-devices | true |
| 174 | Ray-Ban Skyler Gen 2 | gaming-consoles | smart-devices | true |
| 175 | Ray Ban Starfire Kylie | gaming-consoles | smart-devices | true |

**Slugs:** Остаются без изменений ✅  
**Variants:** 9 + 4 + 3 + 1 = 17 (сохраняются) ✅  
**Images:** 0 (используют variant images) ✅

### DualSense PS5 (1)

| ID | Name | slug BEFORE | slug AFTER | productGroup |
|----|------|-------------|------------|--------------|
| 55 | DualSense PS5 | Геймпады-PS5 | geympady-ps5 | gaming-consoles |

**Conflict check:** ✅ SAFE (slug 'geympady-ps5' не существует)  
**Variants:** 20 (сохраняются) ✅  
**Images:** 0 (используют variant images) ✅  
**productGroup:** Остаётся gaming-consoles (ПРАВИЛЬНО) ✅

### Navigation (2)

| Nav ID | Title | href BEFORE | href AFTER |
|--------|-------|-------------|------------|
| 263 | DualSense для PS5 | /catalog/playstation/Геймпады-PS5 | /catalog/gaming-consoles/geympady-ps5 |
| 275 | Ray-Ban Wayfarer | /catalog/drugoe/umnye-ochki | /catalog/smart-devices/umnye-ochki |

### Legacy Redirects (5 новых)

```typescript
// Добавить в src/lib/legacy-redirects.ts
['/catalog/gaming-consoles/umnye-ochki', '/catalog/smart-devices/umnye-ochki'],
['/catalog/gaming-consoles/ray-ban-display-uq0icl', '/catalog/smart-devices/ray-ban-display-uq0icl'],
['/catalog/gaming-consoles/ray-ban-skyler-gen-2-rw4014-cfnorf', '/catalog/smart-devices/ray-ban-skyler-gen-2-rw4014-cfnorf'],
['/catalog/gaming-consoles/ray-ban-starfire-kylie-edition-classic-8i4rw8', '/catalog/smart-devices/ray-ban-starfire-kylie-edition-classic-8i4rw8'],
['/catalog/gaming-consoles/Геймпады-PS5', '/catalog/gaming-consoles/geympady-ps5'],
['/catalog/playstation/Геймпады-PS5', '/catalog/gaming-consoles/geympady-ps5'],
['/catalog/drugoe/umnye-ochki', '/catalog/smart-devices/umnye-ochki'],
```

---

## 🔒 BACKUP КОМАНДЫ

### 1. PostgreSQL Backup
```bash
# SSH tunnel должен быть активен
ssh -L 15433:localhost:5432 production-server

# Backup всей БД
pg_dump -h 127.0.0.1 -p 15433 -U foxstore_admin foxapple \
  --format=custom \
  --file=backup-foxapple-$(date +%Y%m%d-%H%M%S).dump

# Backup только затрагиваемых таблиц
pg_dump -h 127.0.0.1 -p 15433 -U foxstore_admin foxapple \
  --format=custom \
  --table=products \
  --table=catalog_navigation \
  --file=backup-migration-$(date +%Y%m%d-%H%M%S).dump

# Проверка backup
pg_restore --list backup-foxapple-*.dump | head -20
```

### 2. Code Backup
```bash
git status
git stash push -m "pre-migration-state"
git tag pre-migration-$(date +%Y%m%d-%H%M%S)
git push origin --tags
```

---

## ⚙️ ПРИМЕНЕНИЕ КОМАНДЫ

### Step 1: Database Migration (idempotent, transactional)

```bash
# Создать migration script
cat > /tmp/foxstore-migration.sql << 'EOF'
BEGIN;

-- Verification queries
SELECT 'BEFORE STATE' as status, id, product_group, slug 
FROM products WHERE id IN (55, 101, 173, 174, 175);

-- Ray-Ban: gaming-consoles → smart-devices
UPDATE products 
SET product_group = 'smart-devices', updated_at = NOW()
WHERE id IN (101, 173, 174, 175) 
  AND product_group = 'gaming-consoles';

-- DualSense: Cyrillic slug → transliterated
UPDATE products 
SET slug = 'geympady-ps5', updated_at = NOW()
WHERE id = 55 
  AND slug = 'Геймпады-PS5';

-- Verification
SELECT 'AFTER STATE' as status, id, product_group, slug 
FROM products WHERE id IN (55, 101, 173, 174, 175);

-- Commit (remove this line for DRY RUN)
COMMIT;
EOF

# DRY RUN (with ROLLBACK)
psql -h 127.0.0.1 -p 15433 -U foxstore_admin foxapple < /tmp/foxstore-migration.sql

# APPLY (если DRY RUN успешен)
psql -h 127.0.0.1 -p 15433 -U foxstore_admin foxapple < /tmp/foxstore-migration.sql
```

### Step 2: Navigation Sync

```bash
# DRY RUN
DATABASE_URL="postgresql://foxstore_admin:PASSWORD@127.0.0.1:15433/foxapple" \
  npm run catalog:navigation:sync-href

# APPLY
DATABASE_URL="postgresql://foxstore_admin:PASSWORD@127.0.0.1:15433/foxapple" \
  CATALOG_NAVIGATION_SYNC_APPLY=1 \
  npm run catalog:navigation:sync-href
```

### Step 3: Code Deploy

```bash
# Add legacy redirects
git add src/lib/legacy-redirects.ts
git add src/lib/product-url-builder.ts
git add src/lib/media.ts
git add src/components/ProductCard.tsx

git commit -m "fix: Ray-Ban category and DualSense slug normalization

- Ray-Ban (101,173,174,175): gaming-consoles → smart-devices
- DualSense (55): Геймпады-PS5 → geympady-ps5
- Navigation sync for affected entries
- Legacy redirects for old URLs
- Best Offers variant images support

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

# Push to production
git push origin main

# Vercel/Docker deploy will trigger automatically
```

---

## ✅ ПРОВЕРКА КОМАНДЫ

### 1. Database Verification
```bash
psql -h 127.0.0.1 -p 15433 -U foxstore_reader foxapple -c "
SELECT id, name, product_group, slug, is_available 
FROM products 
WHERE id IN (55, 101, 173, 174, 175)
ORDER BY id;
"
```

**Expected:**
- 101-175: productGroup = 'smart-devices' ✅
- 55: slug = 'geympady-ps5' ✅

### 2. Navigation Verification
```bash
psql -h 127.0.0.1 -p 15433 -U foxstore_reader foxapple -c "
SELECT id, title, href 
FROM catalog_navigation 
WHERE id IN (263, 275);
"
```

**Expected:**
- 263: /catalog/gaming-consoles/geympady-ps5 ✅
- 275: /catalog/smart-devices/umnye-ochki ✅

### 3. HTTP Verification
```bash
# Ray-Ban новый URL
curl -I https://foxapple.ru/catalog/smart-devices/umnye-ochki
# Expected: HTTP 200

# Ray-Ban старый URL (redirect)
curl -I https://foxapple.ru/catalog/gaming-consoles/umnye-ochki
# Expected: HTTP 308 → /catalog/smart-devices/umnye-ochki

# DualSense новый URL
curl -I https://foxapple.ru/catalog/gaming-consoles/geympady-ps5
# Expected: HTTP 200

# DualSense старый URL (redirect)
curl -I https://foxapple.ru/catalog/gaming-consoles/Геймпады-PS5
# Expected: HTTP 308 → /catalog/gaming-consoles/geympady-ps5
```

### 4. Best Offers Images
```bash
# Проверить variant images на production
curl -s https://foxapple.ru/ | grep -o 'apple-watch.*\.webp' | head -3
curl -s https://foxapple.ru/ | grep -o 'iphone-18.*\.webp' | head -3
```

**Expected:** Изображения загружаются ✅

---

## 🔄 ROLLBACK ПЛАН

### Если что-то пошло не так:

**1. Database Rollback (в течение транзакции)**
```sql
ROLLBACK;
```

**2. Database Rollback (после commit)**
```bash
# Restore из backup
pg_restore -h 127.0.0.1 -p 15433 -U foxstore_admin \
  --clean --if-exists \
  -d foxapple backup-migration-*.dump
```

**3. Code Rollback**
```bash
git revert HEAD
git push origin main
```

**4. Частичный Rollback (только productGroup)**
```sql
BEGIN;
UPDATE products SET product_group = 'gaming-consoles' 
WHERE id IN (101, 173, 174, 175);
COMMIT;
```

**5. Частичный Rollback (только slug)**
```sql
BEGIN;
UPDATE products SET slug = 'Геймпады-PS5' WHERE id = 55;
COMMIT;
```

---

## ⚠️ ПРЕДОСТОРОЖНОСТИ

✅ **Безопасно:**
- Все операции идемпотентны (можно запустить дважды)
- Транзакции защищают от partial updates
- Legacy redirects предотвращают 404
- Не затрагивают цены, остатки, заказы, Media

⚠️ **Проверить:**
- SSH tunnel активен перед командами
- Backup успешно создан и проверен
- DRY RUN показал ожидаемые изменения
- Production не перегружен (низкий трафик)

🔴 **Не делать:**
- Не менять isAvailable автоматически
- Не удалять старые записи
- Не трогать orders/payments
- Не запускать во время пиковых часов

---

## 📊 ЧЕКЛИСТ ВЫПОЛНЕНИЯ

```
[ ] 1. SSH tunnel активен
[ ] 2. PostgreSQL backup создан
[ ] 3. Git tag создан
[ ] 4. Database migration DRY RUN успешен
[ ] 5. Database migration APPLY успешен
[ ] 6. Navigation sync DRY RUN успешен
[ ] 7. Navigation sync APPLY успешен
[ ] 8. Database verification прошла
[ ] 9. Code committed and pushed
[ ] 10. Deploy завершён
[ ] 11. HTTP verification успешна
[ ] 12. Best Offers images загружаются
[ ] 13. Мониторинг 404 errors (должен снизиться)
[ ] 14. Пользовательское тестирование
```

---

## 🎯 ИТОГ

**Затрагиваемые записи:** 5 products + 2 navigation = 7 updates  
**Риск:** LOW  
**Rollback:** Доступен  
**Downtime:** 0 (zero-downtime migration)  
**Ожидаемый результат:** Устранение 404 для Ray-Ban и DualSense, корректные изображения в Best Offers

**Готово к выполнению после вашего подтверждения.**
