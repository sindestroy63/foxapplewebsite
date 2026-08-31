import type { CollectionConfig } from 'payload'

import { denyPriceUpdateMutation } from '../price-updates/access'

export const PriceImportItems: CollectionConfig = {
  slug: 'price-import-items',
  labels: { singular: 'Позиция импорта прайса', plural: 'Позиции импорта прайса' },
  admin: {
    hidden: true,
    group: 'Обновление цен',
    useAsTitle: 'sourceLine',
    defaultColumns: ['sourceLine', 'modelText', 'price', 'matchStatus', 'resolution', 'session', 'createdAt'],
  },
  access: { read: denyPriceUpdateMutation, create: denyPriceUpdateMutation, update: denyPriceUpdateMutation, delete: denyPriceUpdateMutation },
  fields: [
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { hidden: true } },
    { name: 'session', type: 'relationship', relationTo: 'price-import-sessions', required: true, index: true },
    { name: 'itemNumber', type: 'number', required: true },
    { name: 'sourceLine', type: 'text', required: true },
    { name: 'contextHeading', type: 'text' },
    { name: 'modelText', type: 'text', required: true },
    { name: 'price', type: 'number', required: true },
    { name: 'storage', type: 'text' },
    { name: 'ram', type: 'text' },
    { name: 'color', type: 'text' },
    { name: 'sim', type: 'text' },
    { name: 'region', type: 'text' },
    { name: 'revision', type: 'text' },
    { name: 'manufacturerModelNumber', type: 'text' },
    { name: 'notes', type: 'json' },
    {
      name: 'matchStatus', type: 'select', required: true, index: true,
      options: ['matched', 'ambiguous', 'not_found', 'missing_attributes', 'manual_review', 'excluded_used'],
    },
    { name: 'reason', type: 'textarea', required: true },
    { name: 'candidates', type: 'json', required: true },
    {
      name: 'resolution', type: 'select', required: true, defaultValue: 'pending', index: true,
      options: ['pending', 'automatic', 'manual', 'skipped'],
    },
    { name: 'selectedCandidateKey', type: 'text', admin: { hidden: true } },
    { name: 'selectedSku', type: 'text', index: true },
    { name: 'selectedProduct', type: 'relationship', relationTo: 'products' },
    { name: 'selectedVariantId', type: 'text' },
  ],
}
