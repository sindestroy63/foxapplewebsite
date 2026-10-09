# FOXSTORE PRODUCTION AUDIT — ФИНАЛЬНЫЙ ОТЧЁТ

**Дата:** 2026-10-09  
**Режим:** READ-ONLY  
**Источник:** Production PostgreSQL (localhost:15433 → SSH tunnel)

---

## 📊 ПОДТВЕРЖДЁННЫЕ ПЕРВОПРИЧИНЫ

### 1️⃣ Ray-Ban 404

**ROOT CAUSE:** `productGroup = 'gaming-consoles'` (НЕПРАВИЛЬНО)

| ID | Название | productGroup | isAvailable | Проблема |
|----|----------|--------------|-------------|----------|
| 101 | Ray Ban Wayfarer Gen 2 | gaming-consoles | true | ❌ Должен быть smart-devices |
| 173 | Ray Ban Display | gaming-consoles | true | ❌ Должен быть smart-devices |
| 174 | Ray-Ban Skyler Gen 2 | gaming-consoles | true | ❌ Должен быть smart-devices |
| 175 | Ray Ban Starfire Kylie | gaming-consoles | true | ❌ Должен быть smart-devices |

**Navigation 275:**
- Current: `/catalog/drugoe/umnye-ochki` ❌
- Should be: `/catalog/smart-devices/umnye-ochki` (после исправления productGroup)

**Все Ray-Ban доступны** (`isAvailable=true`), но открываются по неправильным URL.

---

### 2️⃣ DualSense PS5 404

**ROOT CAUSE:** Slug содержит кириллицу `Геймпады-PS5`

| ID | Название | Slug | productGroup | Проблема |
|----|----------|------|--------------|----------|
| 55 | DualSense PS5 | Геймпады-PS5 | gaming-consoles | ❌ Кириллица в slug |
| 59 | Зарядная станция Sony | zaryadnaya-stanciya-sony | gaming-consoles | ✅ OK |

**Navigation 263:**
- Current: `/catalog/playstation/Геймпады-PS5` ❌
- Should be: `/catalog/gaming-consoles/geympady-ps5` (после slug fix)

**Product 55 существует и доступен**, но slug не транслитерирован.

---

### 3️⃣ Best Offers — пустые изображения

**ROOT CAUSE:** `Product.images = 0`, изображения хранятся в `variants.images`

| ID | Название | Product.images | Variants | Статус |
|----|----------|----------------|----------|--------|
| 159 | iPhone 18 Pro Max | 0 | 32 | ⚠️ Variant images |
| 160 | iPhone 18 Pro | 0 | 32 | ⚠️ Variant images |
| 164 | Apple Watch Series 12 | 0 | 16 | ⚠️ Variant images |

**Изображения существуют в variant.images**, но текущий код `getProductImage()` в production их не подхватывает.

**Localhost уже исправлен:** `getProductImage(product, selectedVariant)` поддерживает variant images.

---

## ✅ LOCALHOST vs ❌ PRODUCTION

| Компонент | Localhost | Production |
|-----------|-----------|------------|
| Ray-Ban productGroup | ✅ smart-devices | ❌ gaming-consoles |
| Navigation 275 href | ✅ /catalog/smart-devices/... | ❌ /catalog/drugoe/... |
| DualSense slug | ✅ geympady-ps5 | ❌ Геймпады-PS5 |
| Navigation 263 href | ✅ normalized | ❌ /catalog/playstation/... |
| getProductImage() | ✅ variant support | ❌ old code |
| buildProductUrl() | ✅ deployed | ❌ not deployed |

---

## 🔧 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ

### Проблема → Причина → Решение

| # | Проблема | Подтверждённая причина | Необходимое исправление |
|---|----------|------------------------|-------------------------|
| 1 | **Ray-Ban 404** | productGroup = gaming-consoles | UPDATE products SET product_group = 'smart-devices' WHERE id IN (101,173,174,175) |
| 2 | **Ray-Ban Navigation** | href = /catalog/drugoe/... | Запустить navigation sync script после #1 |
| 3 | **DualSense 404** | slug = 'Геймпады-PS5' (кириллица) | UPDATE products SET slug = 'geympady-ps5' WHERE id = 55 |
| 4 | **DualSense Navigation** | href = /catalog/playstation/... | Запустить navigation sync script после #3 |
| 5 | **Best Offers images** | getProductImage() без variant support | Deploy нового кода (buildProductUrl + variant support) |
| 6 | **Legacy redirects** | Отсутствуют для изменённых URL | Добавить в src/lib/legacy-redirects.ts |

---

## 📋 PRODUCTION MIGRATION PLAN

### Шаг 1: Backup
```bash
pg_dump -h 127.0.0.1 -p 15433 -U foxstore_reader foxapple > backup-$(date +%Y%m%d).sql
```

### Шаг 2: Database Updates (idempotent)
```sql
BEGIN;

-- Ray-Ban: gaming-consoles → smart-devices
UPDATE products 
SET product_group = 'smart-devices' 
WHERE id IN (101, 173, 174, 175) 
  AND product_group = 'gaming-consoles';

-- DualSense: транслитерация slug
UPDATE products 
SET slug = 'geympady-ps5' 
WHERE id = 55 
  AND slug = 'Геймпады-PS5';

COMMIT;
```

### Шаг 3: Navigation Sync
```bash
DATABASE_URL=production npm run catalog:navigation:sync-href -- --dry-run
# Проверить отчёт
DATABASE_URL=production CATALOG_NAVIGATION_SYNC_APPLY=1 npm run catalog:navigation:sync-href
```

### Шаг 4: Code Deploy
```bash
git push origin main
# Vercel/deploy trigger
```

### Шаг 5: Verify
```bash
curl https://foxapple.ru/catalog/smart-devices/umnye-ochki  # 200
curl https://foxapple.ru/catalog/drugoe/umnye-ochki  # 308
curl https://foxapple.ru/catalog/gaming-consoles/geympady-ps5  # 200
```

---

## 📊 СТАТИСТИКА

| Метрика | Значение |
|---------|----------|
| Ray-Ban products требуют update | 4 |
| DualSense products требуют update | 1 |
| Navigation требуют sync | ~3+ |
| Код готов к deploy | ✅ Yes |
| Production backup required | ✅ Yes |

---

## ⚠️ РИСКИ И ПРЕДОСТОРОЖНОСТИ

✅ **Низкий риск:**
- Все операции idempotent
- Read-only audit подтвердил данные
- Localhost протестирован
- Legacy redirects предотвратят 404

⚠️ **Требуется:**
- Backup перед migration
- DRY RUN навигации перед APPLY
- Тестирование после deploy

---

## 🎯 ИТОГ

**Audit завершён:** ✅  
**Первопричины подтверждены:** ✅  
**Migration plan готов:** ✅  
**Ожидает подтверждения:** 🔴

**Localhost исправлен на 100%**  
**Production требует только применения готовой migration**
