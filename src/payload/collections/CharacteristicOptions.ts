import type { CollectionConfig } from 'payload'

import { admins, anyone, denyAll } from '../access'

/**
 * Characteristic Options Collection Factory
 *
 * Создаёт системные справочники, скрытые из UI
 * Пополняются только владельцем проекта через seed-скрипты
 */
export function characteristicOptionsCollection(slug: string, singular: string, plural: string): CollectionConfig {
  return {
    slug,
    labels: { singular, plural },
    admin: {
      useAsTitle: 'label',
      defaultColumns: ['key', 'label', 'archived', 'sortOrder'],
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
      { name: 'key', type: 'text', required: true, unique: true, label: 'Технический ключ' },
      { name: 'label', type: 'text', required: true, label: 'Отображение' },
      { name: 'sortOrder', type: 'number', defaultValue: 0, label: 'Сортировка' },
      { name: 'archived', type: 'checkbox', defaultValue: false, label: 'Архивная', access: { update: admins } },
    ],
  }
}
