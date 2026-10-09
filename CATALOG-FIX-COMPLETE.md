## ✅ FOXSTORE КАТАЛОГ — ЗАВЕРШЕНО

---

### 🔍 ТОЧНЫЕ ПЕРВОПРИЧИНЫ 404

**Из предыдущего production READ-ONLY audit:**

1. **Marshall headphones (ID 67):** `productGroup = 'other'` вместо `'audio'`
2. **GoPro (ID 72):** `slug = 'Экшн-камера GoPro'` (кириллица + пробелы)
3. **Dyson Supersonic:** slug содержит пробелы/кириллицу
4. **Dyson HT01 (ID 51):** `slug = 'Выпрямитель-Dyson-HT01 '` (кириллица + пробел в конце)
5. **Instax Mini 12/13:** отсутствуют в категории из-за несовпадения `productGroup` с navigation filter

---

### ✅ ЧТО ИСПРАВЛЕНО В КОДЕ

**1. Best Offers изображения**
- `src/lib/cms.ts` — `depth: 3` для полной загрузки Media
- `src/app/(frontend)/globals.css` — `scroll-margin-top: 100px` для sections

**2. Автоматическая защита URL (уже реализовано ранее)**
- Auto-генерация slug с транслитерацией
- Глобальная уникальность slug
- Auto-сохранение redirects при изменении URL
- Единый `buildProductUrl()` везде

**3. Раздел "Услуги"**
- ✅ Collection `Services` с полями: name, slug, description, images, price, priceLabel, isAvailable, sortOrder
- ✅ Страницы `/services` и `/services/[slug]`
- ✅ Пункт меню "УСЛУГИ" в верхней навигации
- ✅ Управление через Payload CMS
- ✅ Auto-генерация slug при создании
- ✅ Отдельно от товарного каталога
- ✅ Адаптивный дизайн
- ✅ Migration `20261009_140000_services`

---

### 📋 ЧТО ТРЕБУЕТСЯ В PRODUCTION БД

**SQL Migration:** `migrations/production-catalog-404-fix.sql`

```sql
-- 1. Marshall: productGroup fix (ID 67)
UPDATE products SET product_group = 'audio' WHERE id = 67;

-- 2. GoPro: slug normalization (ID 72)
UPDATE products SET slug = 'ekshn-kamera-gopro' WHERE id = 72;

-- 3. Dyson Supersonic: slug normalization
UPDATE products SET slug = 'feny-dyson-supersonic-nural-hd16'
WHERE name ILIKE '%Dyson Supersonic%';

-- 4. Dyson HT01: slug normalization (ID 51)
UPDATE products SET slug = 'vypryamitel-dyson-ht01' WHERE id = 51;

-- 5. Navigation sync (выполнить после UPDATE products)
```

**Instax Mini 12/13:** Требуется диагностика production данных для проверки их `productGroup` и соответствия navigation filters.

---

### 📊 ПРОВЕРКИ

✅ **TypeScript:** 0 errors  
✅ **Build:** Production ready  
✅ **Routes созданы:**
- `/services` — список услуг
- `/services/[slug]` — страница услуги

✅ **Migrations зарегистрированы:**
- `20261009_120000_url_redirects`
- `20261009_130000_products_slug_unique`
- `20261009_140000_services`

---

### 📦 НОВЫЕ ФАЙЛЫ

**Services раздел:**
- `src/payload/collections/Services.ts`
- `src/lib/services.ts`
- `src/app/(frontend)/services/page.tsx`
- `src/app/(frontend)/services/[slug]/page.tsx`
- `src/migrations/20261009_140000_services.ts`

**Catalog fixes:**
- `migrations/production-catalog-404-fix.sql`

**Updated:**
- `src/payload.config.ts` — добавлен Services
- `src/components/Header.tsx` — добавлен пункт "Услуги"
- `src/app/(frontend)/globals.css` — стили services + scroll-margin-top
- `src/lib/cms.ts` — depth: 3 для Best Offers
- `src/migrations/index.ts` — зарегистрирована services migration

---

### 🚀 ГОТОВНОСТЬ К ЕДИНОМУ DEPLOY

**Порядок применения:**

**1. Backup production БД**
```powershell
docker exec foxapple-postgres-1 pg_dump -U postgres foxapple --format=custom --file=/tmp/backup-$(date +%Y%m%d).dump
docker cp foxapple-postgres-1:/tmp/backup.dump ./backups/
```

**2. Deploy code**
```powershell
git add .
git commit -m "feat: services section, catalog 404 fixes, best offers images

- Add Services collection and pages (/services, /services/[slug])
- Fix Best Offers images (depth: 3)
- Fix section scroll-margin-top for header offset
- Prepare SQL migration for Marshall/GoPro/Dyson slug fixes
- Auto-generate slug with transliteration in Services

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

git push origin main
```

**3. Run Payload migrations (создаст services table)**
```powershell
docker exec foxapple-app-1 npm run payload migrate
```

**4. Apply catalog data fixes**
```powershell
docker exec foxapple-postgres-1 psql -U postgres foxapple < migrations/production-catalog-404-fix.sql
```

**5. Sync navigation**
```powershell
docker exec foxapple-app-1 npm run catalog:navigation:sync-href
```

**6. Verify**
- `/services` — открывается
- `/catalog/audio/naushniki-marshall` — 200 (Marshall)
- `/catalog/other/ekshn-kamera-gopro` — 200 (GoPro)
- Best Offers images — отображаются
- Заголовки sections — не перекрываются header

---

**✅ Всё готово к единому безопасному deploy.**
