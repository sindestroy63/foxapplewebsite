import type { CollectionConfig } from 'payload'

import { admins, anyone, authenticated } from '../access'

export const Colors: CollectionConfig = {
  slug: 'colors',
  labels: { singular: 'Цвет', plural: 'Цвета' },
  admin: {
    useAsTitle: 'englishLabel',
    defaultColumns: ['englishLabel', 'russianLabel', 'primaryHex', 'deviceTypes'],
    group: 'Справочники',
  },
  access: {
    read: anyone,
    create: admins,
    update: authenticated,
    delete: admins,
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
