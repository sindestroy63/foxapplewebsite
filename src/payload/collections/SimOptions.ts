import type { CollectionConfig } from 'payload'

import { admins, anyone, denyAll } from '../access'

/**
 * SIM Options Collection - Справочник типов SIM
 *
 * Справочник типов SIM для вариантов товаров.
 */
export const SimOptions: CollectionConfig = {
  slug: 'sim-options',
  labels: { singular: 'Вариант SIM', plural: 'Варианты SIM' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value'],
    group: 'Справочники',
    hidden: false,
  },
  access: {
    read: anyone,  // ✅ Чтение для всех (нужно для relationship)
    create: admins,
    update: admins,
    delete: denyAll,
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
