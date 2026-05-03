import type { CollectionConfig } from 'payload'

import { admins, anyone, authenticated } from '../access'

export const StorageOptions: CollectionConfig = {
  slug: 'storage-options',
  labels: { singular: 'Вариант памяти', plural: 'Варианты памяти' },
  admin: {
    useAsTitle: 'value',
    defaultColumns: ['value', 'sortOrder'],
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
      name: 'value',
      type: 'text',
      required: true,
      unique: true,
      label: 'Значение',
      admin: { description: '128GB, 256GB, 512GB, 1TB, 2TB' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Сортировка',
      defaultValue: 0,
    },
  ],
}
