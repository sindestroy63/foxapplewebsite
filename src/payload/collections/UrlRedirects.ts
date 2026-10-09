import type { CollectionConfig } from 'payload'
import { admins, anyone } from '../access'

/**
 * URL Redirects Collection
 *
 * Автоматически управляемая коллекция редиректов при изменении slug/category
 * ВНИМАНИЕ: Скрыта из UI, управляется только автоматически через hooks
 */
export const UrlRedirects: CollectionConfig = {
  slug: 'url-redirects',
  labels: {
    singular: 'URL Redirect',
    plural: 'URL Redirects',
  },
  admin: {
    useAsTitle: 'from',
    defaultColumns: ['from', 'to', 'permanent', 'createdAt'],
    description: 'Автоматически создаются при изменении URL товаров',
    hidden: true,  // ✅ Скрыто из бокового меню
  },
  access: {
    read: ({ req }) => {
      // Только авторизованные пользователи могут читать для internal проверок
      return req.user !== undefined
    },
    create: () => false,  // ❌ Только через hooks и миграции
    update: () => false,  // ❌ Только через hooks и миграции
    delete: () => false,  // ❌ Только через миграции с подтверждением
  },
  fields: [
    {
      name: 'from',
      type: 'text',
      label: 'From Path',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Старый URL (например: /catalog/gaming-consoles/umnye-ochki)',
      },
    },
    {
      name: 'to',
      type: 'text',
      label: 'To Path',
      required: true,
      index: true,
      admin: {
        description: 'Новый URL (например: /catalog/smart-devices/umnye-ochki)',
      },
    },
    {
      name: 'permanent',
      type: 'checkbox',
      label: 'Permanent (308)',
      defaultValue: true,
      admin: {
        description: '308 Permanent Redirect (рекомендуется для SEO)',
      },
    },
    {
      name: 'source',
      type: 'select',
      label: 'Source',
      defaultValue: 'auto',
      options: [
        { label: 'Auto (system generated)', value: 'auto' },
        { label: 'Manual', value: 'manual' },
        { label: 'Migration', value: 'migration' },
      ],
      admin: {
        description: 'Источник создания редиректа',
      },
    },
  ],
  timestamps: true,
}
