# PAYLOAD CMS — ИСПРАВЛЕНИЕ АВТОМАТИЧЕСКОЙ ГЕНЕРАЦИИ SLUG

## 📋 ПРОБЛЕМА

Сотрудник видит **красную ошибку в поле slug** при создании нового товара, несмотря на сообщение «Генерируется автоматически».

## 🔍 ПРИЧИНА ОШИБКИ

### Найденная проблема:

**Поле `slug` имело `required: true` на уровне схемы Payload**

```typescript
// ❌ НЕПРАВИЛЬНО (до исправления)
{
  name: 'slug',
  type: 'text',
  required: true,  // ❌ Payload проверяет ДО выполнения hooks
  unique: true,
}
```

**Последовательность событий:**

1. Пользователь начинает создавать товар
2. Вводит название "Наушники"
3. Поле `slug` пустое
4. **Payload проверяет `required` полей ДО beforeValidate hook**
5. Видит пустой `slug` → показывает красную ошибку
6. beforeValidate hook не успевает выполниться, чтобы сгенерировать slug

**Payload lifecycle:**
```
1. User input → form data
2. ❌ Required field validation (slug пустое — ошибка!)
3. beforeValidate hook (slug генерируется здесь, но уже поздно)
4. Field validation
5. beforeChange hook
6. Save to DB
```

## ✅ ИСПРАВЛЕНИЕ

### 1. Убрать `required: true` из схемы поля

```typescript
// ✅ ПРАВИЛЬНО (после исправления)
{
  name: 'slug',
  type: 'text',
  required: false,  // ✅ Не обязательно при создании
  unique: true,
  admin: {
    description: 'Генерируется автоматически из названия товара. Изменение создаст redirect старого URL.',
  },
  validate: (value: unknown, options: any) => {
    // При создании slug может отсутствовать — будет сгенерирован в beforeValidate
    if (options.operation === 'create') {
      return true
    }

    // При обновлении slug должен существовать
    if (!value) {
      return 'URL slug обязателен'
    }

    return true
  },
}
```

**Что изменилось:**
- ✅ `required: false` — Payload не требует slug при создании
- ✅ Добавлена кастомная `validate` функция
- ✅ При `operation === 'create'` — валидация пропускается
- ✅ При `operation === 'update'` — slug обязателен

### 2. Улучшить логику beforeValidate hook

```typescript
if (operation === 'create' && data) {
  if (!data.slug && data.name) {
    // Генерация из name
    data.slug = await generateUniqueSlug(req.payload, 'products', String(data.name))
    req.payload.logger.info({ productName: data.name, generatedSlug: data.slug }, 'Auto-generated slug for new product')
  } else if (data.slug) {
    // Нормализация ручного slug
    const normalized = normalizeSlug(String(data.slug))
    const validation = validateSlug(normalized)

    if (!validation.valid) {
      throw new Error(`Некорректный slug: ${validation.error}`)
    }

    data.slug = await generateUniqueSlug(req.payload, 'products', normalized)
    req.payload.logger.info({ originalSlug: data.slug, normalizedSlug: data.slug }, 'Normalized manual slug')
  }
  // Если ни slug, ни name не заданы — не генерируем slug
  // Payload сам покажет ошибку для обязательного поля name
}
```

**Что улучшено:**
- ✅ Убрана ошибка `'Название товара обязательно для генерации slug'`
- ✅ Если `name` пустое — hook не выбрасывает ошибку, а просто не генерирует slug
- ✅ Payload покажет ошибку для обязательного поля `name` (которое `required: true`)
- ✅ Добавлено логирование для отладки

## 🧪 ПРОВЕРКА

### Тест генерации slug:

```bash
npm run test:slug
```

**Результаты:**
```
Testing: "Наушники"
  1️⃣ Normalized: "naushniki"
  2️⃣ Validation: ✅ Valid
  3️⃣ Final slug: "naushniki"
  4️⃣ Uniqueness check: ✅ Available

Testing: "Часы Samsung"
  1️⃣ Normalized: "chasy-samsung"
  2️⃣ Validation: ✅ Valid
  3️⃣ Final slug: "chasy-samsung-2"
  4️⃣ Uniqueness check: ✅ Available

Testing: "Apple MacBook Pro M5"
  1️⃣ Normalized: "apple-macbook-pro-m5"
  2️⃣ Validation: ✅ Valid
  3️⃣ Final slug: "apple-macbook-pro-m5"
  4️⃣ Uniqueness check: ✅ Available
```

### Проверка транслитерации:

✅ **Кириллица → латиница (ГОСТ 7.79-2000)**
- "Наушники" → "naushniki"
- "Часы Samsung" → "chasy-samsung"

✅ **Пробелы → дефисы**
- "Apple MacBook Pro M5" → "apple-macbook-pro-m5"

✅ **Уникальность**
- Если slug занят, добавляется суффикс: "chasy-samsung-2"

✅ **Специальные символы удаляются**
- "Ray-Ban Display!" → "ray-ban-display"

## 🔒 ПРОВЕРКА URL REDIRECTS

### Когда создаются redirects:

✅ **afterChange hook проверяет operation:**
```typescript
if (operation === 'update' && previousDoc) {
  const oldPath = buildProductPath(previousDoc.productGroup, previousDoc.slug)
  const newPath = buildProductPath(doc.productGroup, doc.slug)

  if (oldPath && newPath && oldPath !== newPath) {
    await saveUrlRedirect(req.payload, oldPath, newPath)
  }
}
```

**Результат:**
- ✅ При `operation === 'create'` — redirect НЕ создаётся
- ✅ При `operation === 'update'` и изменении URL — redirect создаётся
- ✅ Нет ложных redirects для новых товаров

## 📝 ИЗМЕНЁННЫЕ ФАЙЛЫ

### 1. `src/payload/collections/Products.ts`

**Изменение 1: Поле slug**
- Убрано `required: true`
- Добавлено `required: false`
- Добавлена кастомная `validate` функция

**Изменение 2: beforeValidate hook**
- Убрана ошибка при отсутствии name
- Добавлено логирование генерации slug
- Улучшена обработка edge cases

### 2. `scripts/test-slug-generation.ts` (новый файл)

Тестовый скрипт для проверки генерации slug.

## ✅ ИТОГОВОЕ ПОВЕДЕНИЕ

### Создание нового товара:

**Сценарий 1: Пользователь вводит только название**
1. ✅ Пользователь вводит "Наушники"
2. ✅ Поле slug остаётся пустым (без красной ошибки)
3. ✅ beforeValidate hook генерирует slug: "naushniki"
4. ✅ validate проходит (operation === 'create')
5. ✅ Товар сохраняется успешно

**Сценарий 2: Пользователь вводит название и slug вручную**
1. ✅ Пользователь вводит "Наушники Marshall"
2. ✅ Пользователь вводит slug: "НАУШНИКИ Marshall"
3. ✅ beforeValidate нормализует: "naushniki-marshall"
4. ✅ Проверяет валидацию и уникальность
5. ✅ Товар сохраняется с нормализованным slug

**Сценарий 3: Пользователь не вводит название**
1. ❌ Пользователь оставляет название пустым
2. ❌ Payload показывает ошибку: "Название обязательно" (поле name required)
3. ✅ beforeValidate НЕ бросает ошибку из-за отсутствия slug
4. ❌ Товар не сохраняется (из-за name, а не slug)

### Редактирование существующего товара:

**Сценарий 4: Изменение названия**
1. ✅ Товар уже имеет slug: "naushniki"
2. ✅ Пользователь меняет название на "Наушники Marshall"
3. ✅ beforeValidate НЕ перегенерирует slug (operation === 'update', slug не изменён)
4. ✅ Товар сохраняется с прежним slug

**Сценарий 5: Изменение slug вручную**
1. ✅ Товар имеет slug: "naushniki", productGroup: "audio"
2. ✅ Пользователь меняет slug на "marshall-headphones"
3. ✅ beforeValidate нормализует и проверяет уникальность
4. ✅ afterChange создаёт redirect: "/catalog/audio/naushniki" → "/catalog/audio/marshall-headphones"
5. ✅ Товар сохраняется с новым slug и redirect

**Сценарий 6: Попытка удалить slug вручную**
1. ❌ Товар имеет slug: "naushniki"
2. ❌ Пользователь удаляет slug (пустое поле)
3. ❌ validate выбрасывает ошибку: "URL slug обязателен" (operation === 'update')
4. ❌ Товар не сохраняется

## 🔧 ПРОВЕРКИ ВЫПОЛНЕНЫ

✅ **TypeScript компиляция** — успешна
✅ **Production build** — успешен
✅ **Генерация slug из кириллицы** — работает
✅ **Транслитерация (ГОСТ 7.79-2000)** — корректна
✅ **Нормализация пробелов и спецсимволов** — работает
✅ **Проверка уникальности** — работает (добавляет суффикс при конфликте)
✅ **Redirect создаётся только при update** — подтверждено
✅ **Redirect НЕ создаётся при create** — подтверждено
✅ **Валидация slug при update** — работает
✅ **Валидация пропускается при create** — работает

## 🚀 ГОТОВНОСТЬ К PRODUCTION

### Изменения безопасны:

✅ **Обратная совместимость**
- Существующие товары продолжат работать
- Existing slugs не изменяются
- Все relationship сохранены

✅ **Миграции НЕ требуются**
- Изменены только validation rules и hooks
- Структура БД не изменена
- Данные не затронуты

✅ **Тесты пройдены**
- Slug generation работает корректно
- URL redirects не создаются при создании
- Validation logic корректна

### Что проверить после deploy:

1. ✅ Создать новый товар с названием на кириллице
2. ✅ Проверить, что slug сгенерирован автоматически
3. ✅ Проверить, что поле slug не показывает красную ошибку
4. ✅ Сохранить товар и убедиться, что нет чёрного экрана
5. ✅ Изменить slug существующего товара
6. ✅ Проверить, что создался redirect в таблице url_redirects
7. ✅ Попытаться удалить slug у существующего товара (должна быть ошибка)

## 📄 ДОБАВИТЬ В ОСНОВНОЙ ОТЧЁТ

Это исправление включить в `PAYLOAD-CMS-FIXES-REPORT.md` как **дополнительное исправление**:

---

### 🆕 ДОПОЛНИТЕЛЬНОЕ ИСПРАВЛЕНИЕ: Автоматическая генерация slug

**Проблема:**
Красная ошибка в поле slug при создании нового товара.

**Причина:**
Поле имело `required: true` на уровне схемы, но генерация происходила в beforeValidate hook (после проверки required).

**Исправление:**
- Убрано `required: true` из схемы поля
- Добавлена кастомная `validate` функция
- При `create` — валидация пропускается
- При `update` — slug обязателен

**Результат:**
✅ Slug генерируется автоматически без ошибок
✅ Поле не показывает красную ошибку при создании
✅ Транслитерация кириллицы работает корректно
✅ URL redirects создаются только при изменении существующего товара
