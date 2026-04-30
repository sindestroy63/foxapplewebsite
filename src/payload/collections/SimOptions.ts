import type { CollectionConfig } from 'payload'

import { admins, anyone, authenticated } from '../access'

export const SimOptions: CollectionConfig = {
  slug: 'sim-options',
  labels: { singular: 'Вариант SIM', plural: 'Варианты SIM' },
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
      admin: { description: 'SIM_ESIM, ESIM' },
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      label: 'Отображение',
      admin: { description: 'SIM + eSIM, eSIM' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Сортировка',
      defaultValue: 0,
    },
  ],
}
