import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../access'

/**
 * SIM Options Collection - Справочник типов SIM
 *
 * Системный справочник, скрыт из UI
 * Пополняется только владельцем проекта через seed-скрипты
 */
export const SimOptions: CollectionConfig = {
  slug: 'sim-options',
  labels: { singular: 'Вариант SIM', plural: 'Варианты SIM' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value'],
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
