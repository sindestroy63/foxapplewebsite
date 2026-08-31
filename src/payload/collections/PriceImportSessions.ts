import type { CollectionConfig } from 'payload'

import { denyPriceUpdateMutation } from '../price-updates/access'

export const PriceImportSessions: CollectionConfig = {
  slug: 'price-import-sessions',
  labels: { singular: 'Импорт прайса', plural: 'Импорты прайсов' },
  admin: {
    hidden: true,
    group: 'Обновление цен',
    useAsTitle: 'id',
    defaultColumns: ['id', 'author', 'status', 'totalItems', 'resolvedCount', 'skippedCount', 'createdAt'],
  },
  access: { read: denyPriceUpdateMutation, create: denyPriceUpdateMutation, update: denyPriceUpdateMutation, delete: denyPriceUpdateMutation },
  fields: [
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'sourceText', type: 'textarea', required: true },
    { name: 'questions', type: 'json' },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'matching', index: true,
      options: ['matching', 'resolved', 'previewed', 'expired', 'failed'],
    },
    { name: 'sessionToken', type: 'text', required: true, unique: true, index: true, access: { read: () => false }, admin: { hidden: true } },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'totalItems', type: 'number', required: true, defaultValue: 0 },
    { name: 'resolvedCount', type: 'number', required: true, defaultValue: 0 },
    { name: 'skippedCount', type: 'number', required: true, defaultValue: 0 },
    { name: 'previewBatch', type: 'relationship', relationTo: 'price-update-batches' },
    { name: 'errorMessage', type: 'textarea' },
  ],
}
