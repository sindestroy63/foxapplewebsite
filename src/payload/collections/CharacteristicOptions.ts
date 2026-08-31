import type { CollectionConfig } from 'payload'

import { admins, anyone, denyAll } from '../access'

export function characteristicOptionsCollection(slug: string, singular: string, plural: string): CollectionConfig {
  return {
    slug,
    labels: { singular, plural },
    admin: {
      useAsTitle: 'label',
      defaultColumns: ['key', 'label', 'archived', 'sortOrder'],
      group: 'Справочники',
    },
    access: { read: anyone, create: admins, update: admins, delete: denyAll },
    fields: [
      { name: 'key', type: 'text', required: true, unique: true, label: 'Технический ключ' },
      { name: 'label', type: 'text', required: true, label: 'Отображение' },
      { name: 'sortOrder', type: 'number', defaultValue: 0, label: 'Сортировка' },
      { name: 'archived', type: 'checkbox', defaultValue: false, label: 'Архивная', access: { update: admins } },
    ],
  }
}
