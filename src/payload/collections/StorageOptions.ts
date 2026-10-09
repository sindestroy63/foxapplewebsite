import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../access'

/**
 * Storage Options Collection - Справочник накопителей
 *
 * Системный справочник, скрыт из UI
 * Пополняется только владельцем проекта через seed-скрипты
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
