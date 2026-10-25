import type { CollectionConfig } from 'payload'

import { admins, anyone, denyAll } from '../access'

/**
 * Storage Options Collection - Справочник накопителей
 *
 * Справочник вариантов накопителя и размеров устройств.
 */
export const StorageOptions: CollectionConfig = {
  slug: 'storage-options',
  labels: { singular: 'Вариант накопителя', plural: 'Варианты накопителя' },
  admin: {
    useAsTitle: 'value',
    defaultColumns: ['value', 'archived', 'sortOrder'],
    baseFilter: ({ req }) => {
      const rawWhere = req.url ? new URL(req.url, 'http://payload.local').searchParams.get('where') : null
      if (rawWhere) {
        try {
          const where = JSON.parse(rawWhere) as { archived?: { equals?: boolean } }
          if (where.archived?.equals === true) return null
        } catch {
          // Ignore malformed client filters and keep the active-only default.
        }
      }
      return { archived: { not_equals: true } }
    },
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
      label: 'Значение',
      admin: { description: '128GB, 256GB, 512GB, 1TB, 2TB' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Сортировка',
      defaultValue: 0,
    },
    {
      name: 'archived',
      type: 'checkbox',
      label: 'Архивная',
      defaultValue: false,
      access: { update: admins },
      admin: {
        position: 'sidebar',
        description: 'Архивные записи не предлагаются для новых вариантов.',
      },
    },
  ],
}
