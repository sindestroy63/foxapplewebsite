import type { CollectionConfig } from 'payload'

import { admins, anyone, authenticated } from '../access'

export const DeviceModels: CollectionConfig = {
  slug: 'device-models',
  labels: { singular: 'Модель устройства', plural: 'Модели устройств' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'basePrice'],
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
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      label: 'Название модели',
      admin: { description: 'iPhone 16 Pro, MacBook Air 13″ M4, Apple Watch Series 11 и т.д.' },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Категория',
    },
    {
      name: 'availableColors',
      type: 'relationship',
      relationTo: 'colors',
      hasMany: true,
      label: 'Доступные цвета',
      admin: { description: 'Официальные цвета этой модели' },
    },
    {
      name: 'availableStorage',
      type: 'relationship',
      relationTo: 'storage-options',
      hasMany: true,
      label: 'Доступная память / размеры',
      admin: { description: '128GB, 256GB… или 42mm, 46mm для Watch' },
    },
    {
      name: 'availableSim',
      type: 'relationship',
      relationTo: 'sim-options',
      hasMany: true,
      label: 'Доступные варианты SIM',
      admin: { description: 'Оставьте пустым, если SIM не применим' },
    },
    {
      type: 'row',
      fields: [
        { name: 'chip', type: 'text', label: 'Чип', admin: { description: 'A16, M4, M4 Pro…' } },
        { name: 'ram', type: 'text', label: 'Оперативная память' },
        { name: 'screenSize', type: 'text', label: 'Диагональ' },
        { name: 'connectivity', type: 'text', label: 'Подключение', admin: { description: 'Wi-Fi, Cellular…' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'basePrice', type: 'number', label: 'Базовая цена', min: 0, admin: { description: 'Цена младшей конфигурации' } },
        { name: 'priceStep', type: 'number', label: 'Шаг цены', min: 0, defaultValue: 0, admin: { description: 'Разница между конфигурациями памяти' } },
      ],
    },
    {
      name: 'storageIsSize',
      type: 'checkbox',
      label: 'Память = размер (для Watch)',
      defaultValue: false,
      admin: { description: 'Если включено, поле memory записывается как size (для Apple Watch)' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Сортировка',
      defaultValue: 0,
    },
  ],
}
