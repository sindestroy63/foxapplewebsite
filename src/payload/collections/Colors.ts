import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../access'

/**
 * Colors Collection - Справочник цветов
 *
 * Системный справочник, скрыт из UI
 * Пополняется только владельцем проекта через seed-скрипты
 */
export const Colors: CollectionConfig = {
  slug: 'colors',
  labels: { singular: 'Цвет', plural: 'Цвета' },
  admin: {
    useAsTitle: 'englishLabel',
    defaultColumns: ['englishLabel', 'russianLabel', 'primaryHex', 'deviceTypes'],
    group: 'Справочники',
    hidden: true,  // ✅ Скрыто из бокового меню
  },
  access: {
    read: anyone,  // ✅ Чтение для всех (нужно для relationship)
    create: () => false,  // ❌ Только через seed/миграции
    update: () => false,  // ❌ Только через seed/миграции
    delete: () => false,  // ❌ Только через seed/миграции
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'value', type: 'text', required: true, unique: true, label: 'Slug (ключ)', admin: { description: 'black, ultramarine, space-gray и т.д.' } },
        { name: 'englishLabel', type: 'text', required: true, label: 'English Name' },
        { name: 'russianLabel', type: 'text', required: true, label: 'Русское название' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'primaryHex', type: 'text', required: true, label: 'HEX основной', admin: { description: '#RRGGBB' } },
        { name: 'secondaryHex', type: 'text', label: 'HEX вторичный', admin: { description: 'Для двухцветных (опционально)' } },
      ],
    },
    {
      name: 'deviceTypes',
      type: 'select',
      hasMany: true,
      label: 'Типы устройств',
      admin: { description: 'Для каких категорий применим этот цвет' },
      options: [
        { label: 'iPhone', value: 'iphone' },
        { label: 'iPad', value: 'ipad' },
        { label: 'MacBook', value: 'macbook' },
        { label: 'Apple Watch', value: 'apple-watch' },
        { label: 'AirPods', value: 'airpods' },
        { label: 'PlayStation', value: 'playstation' },
        { label: 'Аксессуары', value: 'accessories' },
      ],
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Сортировка',
      defaultValue: 0,
    },
  ],
}
