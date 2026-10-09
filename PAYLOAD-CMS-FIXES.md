# PAYLOAD CMS FIXES — ПЛАН ИСПРАВЛЕНИЙ

## 📋 АНАЛИЗ ПРОБЛЕМ

### 1. Чёрный экран при работе с товарами

**Возможные причины:**

1. **Отсутствие обработки ошибок в afterChange hook** (Products.ts:54-108)
   - Hook выполняет операции с `catalog-navigation` и `url-redirects`
   - При ошибке в hook весь запрос падает без корректного сообщения
   - React Admin показывает чёрный экран вместо ошибки

2. **Проблемы с relationship-полями в вариантах**
   - Множественные relationship (colors, storage-options, ram-options и т.д.)
   - При сохранении Payload может не найти связанные записи
   - Отсутствие валидации перед сохранением

3. **Циклические зависимости при удалении**
   - Product → catalog-navigation (через product_id)
   - Product → url-redirects (через hook)
   - При удалении товара hook пытается обновить navigation, которая уже удаляется

4. **Ошибки в beforeValidate hook** (Products.ts:116-181)
   - Сложная логика генерации slug, SKU, variants
   - При ошибке валидации форма "зависает" без явного сообщения

### 2. Защита URL Redirects

**Текущее состояние:**
- Коллекция видна в меню (admin.group не задан)
- Доступ: create/update/delete = admins (правильно)
- Но физически доступна через UI

**Требуется:**
- Скрыть из бокового меню
- Сохранить автоматическое создание через hook
- Заблокировать ручное редактирование через API

### 3. Справочники в меню CMS

**Текущее состояние:**
- Colors, StorageOptions, SimOptions, RamOptions, VariantSizeOptions, ScreenSizeOptions, ConnectivityOptions, DeviceModels
- Все имеют `admin.group: 'Справочники'`
- Видны в боковом меню для всех администраторов

**Требуется:**
- Скрыть из бокового меню
- Сохранить relationship-выбор в формах Products
- Защитить от create/update/delete обычными пользователями

### 4. Защита справочников на уровне API

**Текущий доступ (все справочники):**
```typescript
access: {
  read: anyone,
  create: admins,
  update: authenticated,  // ❌ СЛИШКОМ ШИРОКО
  delete: admins,
}
```

**Проблема:**
- `update: authenticated` означает любой авторизованный пользователь
- Нужно `update: () => false` для обычных пользователей
- Только системные операции должны иметь доступ

## 🔧 ПЛАН ИСПРАВЛЕНИЙ

### Шаг 1: Исправить afterChange hook в Products

```typescript
hooks: {
  afterChange: [
    async ({ doc, req, previousDoc, operation }) => {
      // Обернуть в try-catch с логированием
      // Не бросать ошибку — только логировать
      // Вернуть doc в любом случае
    }
  ]
}
```

### Шаг 2: Добавить beforeDelete hook для безопасного удаления

```typescript
hooks: {
  beforeDelete: [
    async ({ req, id }) => {
      // Удалить связанные catalog-navigation записи
      // Удалить url-redirects, которые ссылаются на этот товар
      // Логировать процесс
    }
  ]
}
```

### Шаг 3: Улучшить обработку ошибок в beforeValidate

```typescript
hooks: {
  beforeValidate: [
    async ({ data, operation, originalDoc, req }) => {
      try {
        // Существующая логика
      } catch (error) {
        // Добавить понятное сообщение об ошибке
        throw new Error(`Ошибка валидации товара: ${error.message}`)
      }
    }
  ]
}
```

### Шаг 4: Скрыть URL Redirects из меню

```typescript
// src/payload/collections/UrlRedirects.ts
export const UrlRedirects: CollectionConfig = {
  slug: 'url-redirects',
  admin: {
    hidden: true,  // ✅ Скрыть из меню
  },
  access: {
    read: ({ req }) => req.user !== undefined,  // Только для авторизованных
    create: () => false,  // ❌ Запретить через UI
    update: () => false,  // ❌ Запретить через UI
    delete: () => false,  // ❌ Запретить через UI
  },
}
```

### Шаг 5: Скрыть справочники из меню

```typescript
// Для каждого справочника добавить:
admin: {
  hidden: true,  // ✅ Скрыть из бокового меню
  group: 'Справочники',  // Сохранить для будущего
}
```

**Файлы:**
- Colors.ts
- StorageOptions.ts
- SimOptions.ts
- RamOptions.ts
- VariantSizeOptions.ts
- ScreenSizeOptions.ts
- ConnectivityOptions.ts
- DeviceModels.ts

### Шаг 6: Защитить справочники от изменений

```typescript
access: {
  read: anyone,  // ✅ Чтение разрешено
  create: () => false,  // ❌ Только через seed/миграции
  update: () => false,  // ❌ Только через seed/миграции
  delete: () => false,  // ❌ Только через seed/миграции
}
```

### Шаг 7: Создать seed-скрипт для справочников

```typescript
// scripts/seed-reference-data.ts
// Безопасное добавление новых значений
// Проверка на дубликаты
// Возможность деактивации (archived: true)
```

### Шаг 8: Улучшить UI для выбора характеристик

**Текущее состояние:**
- Relationship-поля уже используют выпадающие списки
- Фильтрация по `archived: { not_equals: true }` уже работает

**Улучшения:**
- Добавить `hasMany: false` где нужен только один выбор
- Добавить `admin.isSortable: true` для удобства
- Добавить `admin.condition` для показа только релевантных полей

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

1. **src/payload/collections/Products.ts**
   - Улучшить afterChange hook
   - Добавить beforeDelete hook
   - Улучшить beforeValidate hook

2. **src/payload/collections/UrlRedirects.ts**
   - Добавить `admin.hidden: true`
   - Изменить access control

3. **Справочники (8 файлов):**
   - src/payload/collections/Colors.ts
   - src/payload/collections/StorageOptions.ts
   - src/payload/collections/SimOptions.ts
   - src/payload/collections/RamOptions.ts
   - src/payload/collections/VariantSizeOptions.ts
   - src/payload/collections/ScreenSizeOptions.ts
   - src/payload/collections/ConnectivityOptions.ts
   - src/payload/collections/DeviceModels.ts

4. **Новый файл:**
   - scripts/seed-reference-data.ts

## ✅ ПРОВЕРКИ ПОСЛЕ ИСПРАВЛЕНИЙ

1. ✅ Создание нового товара без чёрного экрана
2. ✅ Редактирование товара и сохранение
3. ✅ Повторное открытие товара
4. ✅ Удаление товара
5. ✅ Работа вариантов товара
6. ✅ URL Redirects не видны в меню
7. ✅ Справочники не видны в меню
8. ✅ Выбор из справочников работает в форме товара
9. ✅ Попытка создать/изменить справочник через API возвращает 403
10. ✅ TypeScript проходит
11. ✅ Production build успешен

## 🔒 БЕЗОПАСНОСТЬ

- ✅ Не удалять существующие записи справочников
- ✅ Не удалять существующие товары
- ✅ Не изменять production без подтверждения
- ✅ Сохранить все существующие связи
- ✅ Логировать все критические операции
