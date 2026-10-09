# FOXSTORE — ИСПРАВЛЕНИЕ «ФОТО И ВИДЕО» (ФИНАЛЬНАЯ ВЕРСИЯ)

## ✅ КРАТКИЙ ОТЧЁТ

**Статус:** Готово к применению  
**Approach:** Использование существующей архитектуры BrandCatalogNavigation + catalog_navigation  
**Проверки:** TypeScript ✅ | Production build ✅  

### Что исправлено:

1. ✅ **Отказ от text-search фильтрации** (`q=GoPro Instax камера`)
2. ✅ **Прямая привязка товаров** через `BrandCatalogNavigation.products: [72]`
3. ✅ **Правильная иерархия** в `catalog_navigation` для SEO
4. ✅ **Подтверждено:** Instax товары (ID 204, 205) **отсутствуют** в production
5. ✅ **Сохранены** оригинальные `product_line` товаров
6. ✅ **Идемпотентная миграция** с ROLLBACK по умолчанию

---

## 🔍 АРХИТЕКТУРА РЕШЕНИЯ

### Существующая система (используется):

FOXSTORE использует **двухуровневую навигацию:**

**1. BrandCatalogNavigation (Global)** — управляет фильтрацией
```typescript
{
  groups: [
    {
      key: 'other',
      title: 'ДРУГОЕ',
      children: [
        {
          key: 'other-photo-video',  // ← НОВЫЙ
          title: 'Фото и видео',
          href: '/catalog?placement=other-photo-video',
          products: [72],  // ← Прямой список ID товаров
        }
      ]
    }
  ]
}
```

**2. catalog_navigation (Collection)** — управляет SEO и хлебными крошками
```sql
-- Line-подкатегория
INSERT INTO catalog_navigation (
  title='Фото и видео', kind='line', parent_id=229,
  stable_key='line:other:photo-video'
)

-- Product-запись под line
UPDATE catalog_navigation SET parent_id = (line.id) WHERE id = 276  -- GoPro
```

### Как работает фильтрация:

**Код из `src/lib/cms.ts:156-173`:**
```typescript
if (args?.filters?.placement) {
  const navigation = await payload.findGlobal({ slug: 'brand-catalog-navigation' })
  const placementChild = findNode(navigation.groups, args.filters.placement)
  directPlacementIds = placementChild?.products.map(p => p.id)  // [72]
}

// Строка 193-194:
if (directPlacementIds.length > 0) {
  conditions.push({ id: { in: directPlacementIds } })  // WHERE id IN (72)
}
```

**Результат:**
- Payload фильтрует товары по **точным ID**: `WHERE id IN (72)`
- Никакого text-search, никаких посторонних товаров
- Когда Instax добавят — просто обновить `products: [72, 204, 205]` в CMS

---

## 📁 ФАЙЛЫ

### 1. `migrations/production-photo-video-fix.sql` (НОВЫЙ)

**Что делает:**

**Шаг 1:** Создаёт line-подкатегорию
```sql
INSERT INTO catalog_navigation (
  title='Фото и видео', kind='line', parent_id=229,
  stable_key='line:other:photo-video', sort_order=95
)
```

**Шаг 2:** Переносит GoPro navigation
```sql
UPDATE catalog_navigation
SET parent_id = (SELECT id WHERE stable_key='line:other:photo-video')
WHERE id = 276
```

**Особенности:**
- ✅ Идемпотентно (можно запускать повторно)
- ✅ Проверки перед каждой операцией
- ✅ Backup в temp таблицы
- ✅ Default ROLLBACK
- ✅ Детальные NOTICE сообщения

### 2. Изменения в коде: **НЕТ**

**Почему:**
- Существующая архитектура уже поддерживает прямую привязку через `products: [72]`
- `cms.ts:193-194` уже фильтрует по `id IN (directPlacementIds)`
- Не нужно изменять код для работы системы

---

## 🚀 ТОЧНЫЕ КОМАНДЫ ДЛЯ ПРИМЕНЕНИЯ

### ШАГ 1: Backup production БД

```bash
# SSH в production
ssh user@production-server

# Backup
docker exec foxapple-postgres-1 pg_dump -U postgres foxstore > \
  /tmp/foxstore_backup_photo_video_$(date +%Y%m%d_%H%M%S).sql

# Проверка
ls -lh /tmp/foxstore_backup_*.sql
```

### ШАГ 2: Проверка текущего состояния

```bash
# Проверить группу «Другое»
docker exec foxapple-postgres-1 psql -U postgres -d foxstore -c \
  "SELECT id, title, kind, parent_id FROM catalog_navigation WHERE id = 229;"

# Проверить GoPro navigation
docker exec foxapple-postgres-1 psql -U postgres -d foxstore -c \
  "SELECT id, title, parent_id, product_id FROM catalog_navigation WHERE id = 276;"

# Проверить, что подкатегория ещё не создана
docker exec foxapple-postgres-1 psql -U postgres -d foxstore -c \
  "SELECT COUNT(*) FROM catalog_navigation WHERE stable_key = 'line:other:photo-video';"
# Expected: count = 0
```

### ШАГ 3: DRY RUN миграции (с ROLLBACK)

```bash
# Скопировать миграцию на сервер
scp migrations/production-photo-video-fix.sql user@production-server:/tmp/

# Запустить с ROLLBACK (тестирование)
docker exec -i foxapple-postgres-1 psql -U postgres foxstore < /tmp/production-photo-video-fix.sql

# Проверить вывод:
# ✅ Все NOTICE должны показать успех
# ✅ В конце должно быть: ROLLBACK
# ✅ Никаких ERROR или EXCEPTION
```

### ШАГ 4: Применение миграции (с COMMIT)

```bash
# Отредактировать миграцию
nano /tmp/production-photo-video-fix.sql

# Изменить последние строки:
# ROLLBACK;  ← Закомментировать
# COMMIT;    ← Раскомментировать

# Применить миграцию
docker exec -i foxapple-postgres-1 psql -U postgres foxstore < /tmp/production-photo-video-fix.sql

# Проверить результат
docker exec foxapple-postgres-1 psql -U postgres -d foxstore -c "
  SELECT id, title, kind, parent_id, stable_key
  FROM catalog_navigation
  WHERE id IN (229, 276) OR stable_key = 'line:other:photo-video'
  ORDER BY id;
"

# Expected output:
# 229 | Другое         | group | NULL | group:other
# 276 | Экшн-камера... | product | (line.id) | product:72
# (line.id) | Фото и видео | line | 229 | line:other:photo-video
```

### ШАГ 5: Обновление BrandCatalogNavigation

```bash
# Зайти в Payload CMS
open https://фохстор.рф/admin

# Навигация:
# 1. Globals → Brand Catalog Navigation
# 2. Найти группу "ДРУГОЕ" (key: other)
# 3. Нажать "Add children"
# 4. Заполнить:
#    title: "Фото и видео"
#    key: "other-photo-video"
#    href: "/catalog?placement=other-photo-video"
#    sortOrder: 95
#    isVisible: true
#    products: [выбрать "Экшн-камера GoPro" из списка]
# 5. Сохранить (Save)
```

### ШАГ 6: Проверка работоспособности

```bash
# 1. Проверить меню каталога (должна появиться подкатегория)
curl -I "https://фохстор.рф/catalog?group=other"
# Expected: 200 OK

# 2. Проверить фильтрацию "Фото и видео"
curl -I "https://фохстор.рф/catalog?placement=other-photo-video"
# Expected: 200 OK

# 3. Проверить карточку GoPro
curl -I "https://фохстор.рф/catalog/other/ekshn-kamera-gopro"
# Expected: 200 OK

# 4. Проверить, что GoPro показывается в подкатегории
curl -s "https://фохстор.рф/catalog?placement=other-photo-video" | grep -i "gopro"
# Expected: найдены результаты
```

### ШАГ 7: Откат (если проблемы)

```bash
# SQL откат
docker exec foxapple-postgres-1 psql -U postgres -d foxstore << 'EOF'
BEGIN;

-- Вернуть GoPro в «Другое»
UPDATE catalog_navigation
SET parent_id = 229, sort_order = 100, updated_at = NOW()
WHERE id = 276;

-- Удалить подкатегорию
DELETE FROM catalog_navigation
WHERE stable_key = 'line:other:photo-video';

COMMIT;
EOF

# В Payload CMS:
# - Удалить "Фото и видео" из BrandCatalogNavigation.groups[other].children
```

---

## 📊 ИТОГОВАЯ СТРУКТУРА

### До исправления:

```
catalog_navigation:
  229 | Другое (group)
  ├── 258 | Защитное стекло (product)
  ├── 277 | Apple (brand)
  ├── 276 | Экшн-камера GoPro (product) ← Прямо в группе
  └── 292 | Зарядные устройства (line)

brand_catalog_navigation.groups[other].children:
  - (пусто для Фото и видео)
```

### После исправления:

```
catalog_navigation:
  229 | Другое (group)
  ├── 258 | Защитное стекло (product)
  ├── 277 | Apple (brand)
  ├── (NEW) | Фото и видео (line) ← НОВАЯ подкатегория
  │   └── 276 | Экшн-камера GoPro (product) ← Перенесён
  └── 292 | Зарядные устройства (line)

brand_catalog_navigation.groups[other].children:
  - key: other-photo-video
    title: Фото и видео
    products: [72]  ← Прямой список ID
```

---

## 🔄 КОГДА ПОЯВЯТСЯ INSTAX ТОВАРЫ

### В будущем (когда добавят Instax):

**1. Создать товары в Payload CMS:**
- Instax Mini 12 (получит новый ID, например 186)
- Instax Mini 13 (получит новый ID, например 187)

**2. Обновить BrandCatalogNavigation:**
```typescript
// Globals → Brand Catalog Navigation → ДРУГОЕ → Фото и видео
products: [72, 186, 187]  // Добавить новые ID
```

**3. Создать navigation записи (SQL):**
```sql
-- Для Instax Mini 12
INSERT INTO catalog_navigation (
  title, kind, parent_id, product_id, product_group, product_line,
  stable_key, sort_order, is_visible, href, created_at, updated_at
)
SELECT
  p.name, 'product',
  (SELECT id FROM catalog_navigation WHERE stable_key = 'line:other:photo-video'),
  p.id, 'other', 'Instax Mini',
  'product:' || p.id, 20, TRUE,
  '/catalog/other/' || p.slug, NOW(), NOW()
FROM products p
WHERE p.id = 186;

-- Для Instax Mini 13 (аналогично, id=187, sort_order=30)
```

**4. Результат:**
- URL: `/catalog?placement=other-photo-video`
- Фильтрация: `WHERE id IN (72, 186, 187)`
- Показываются: GoPro + Instax Mini 12 + Instax Mini 13

---

## ⚠️ ВАЖНО

### Что НЕ изменено:

✅ **Товары:**
- GoPro (ID 72): `product_line = 'Экшн-камера GoPro'` — **не изменён**
- Все характеристики сохранены
- slug не изменён

✅ **Другие категории:**
- Навигация в других разделах не затронута
- Другие line-подкатегории работают как прежде

✅ **Код:**
- Никаких изменений в TypeScript
- Существующая архитектура используется как есть

### Backward compatibility:

✅ **Полная совместимость:**
- Существующие ссылки работают
- URL redirects не требуются
- Frontend API-запросы не затронуты

### Почему Instax товары отсутствуют:

**Проверено SQL-аудитом:**
```sql
SELECT id, name FROM products WHERE id IN (204, 205);
-- Result: 0 rows

SELECT MAX(id) FROM products;
-- Result: 185

SELECT id, name FROM products WHERE LOWER(name) LIKE '%instax%';
-- Result: 0 rows
```

**Вывод:** Товары с ID 204, 205 **не существуют** в production БД.
Максимальный ID в таблице products = 185.

---

## ✅ ПРОВЕРКИ

### Выполнено:

✅ TypeScript компиляция успешна  
✅ Production build успешен  
✅ SQL синтаксис проверен  
✅ Идемпотентность миграции проверена  
✅ Проверено отсутствие Instax товаров  
✅ Проверена архитектура BrandCatalogNavigation  
✅ Проверена совместимость с миграциями 404/slug/redirects  

### Требуется после deploy:

⏳ SQL миграция применена без ошибок  
⏳ BrandCatalogNavigation обновлён  
⏳ Подкатегория появилась в меню  
⏳ GoPro показывается в подкатегории  
⏳ URL корректен: `/catalog?placement=other-photo-video`  
⏳ Хлебные крошки корректны  

---

## 📞 ПОДДЕРЖКА

### Если после deploy возникнут проблемы:

**1. Подкатегория не появилась в меню:**
- Проверить SQL: `SELECT * FROM catalog_navigation WHERE stable_key = 'line:other:photo-video';`
- Проверить BrandCatalogNavigation в Payload CMS

**2. GoPro не показывается:**
- Проверить parent_id: `SELECT id, parent_id FROM catalog_navigation WHERE id = 276;`
- Проверить products в BrandCatalogNavigation: должен быть `[72]`

**3. Ошибка 404:**
- Проверить href в BrandCatalogNavigation: `/catalog?placement=other-photo-video`
- Проверить placement в коде

**4. Откатить:**
- Запустить SQL из Шага 7
- Удалить child из BrandCatalogNavigation в CMS

---

## 🎯 ИТОГ

**Первопричина:**
- Невозможность использовать standard line-фильтрацию для товаров с разными `product_line`
- Необходимость явной группировки без text-search

**Решение:**
- Использование существующей архитектуры `BrandCatalogNavigation.products: [72]`
- Прямая привязка товаров по ID
- Line-подкатегория в `catalog_navigation` для SEO

**Файлы:**
- `migrations/production-photo-video-fix.sql` — SQL миграция

**Изменения в production:**
1. Создание line-подкатегории
2. Обновление parent_id для GoPro navigation
3. Ручное добавление child в BrandCatalogNavigation (через CMS)

**Порядок:**
1. Backup БД
2. DRY RUN (ROLLBACK)
3. COMMIT миграции
4. Обновить BrandCatalogNavigation
5. Проверка

**Проверки:**
✅ TypeScript
✅ Production build
✅ SQL корректность
✅ Идемпотентность

**Готово к применению.**
