import type { CollectionConfig } from 'payload'

import { admins, anyone, authenticated } from '../access'

export const StorageOptions: CollectionConfig = {
  slug: 'storage-options',
  labels: { singular: 'Вариант памяти', plural: 'Варианты памяти' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value'],
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
      label: 'Значение (ключ)',
      admin: { description: '128GB, 256GB, 512GB, 1TB, 2TB' },
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      label: 'Отображение',
      admin: { description: '128 ГБ, 256 ГБ, 512 ГБ, 1 ТБ, 2 ТБ' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Сортировка',
      defaultValue: 0,
    },
  ],
}
