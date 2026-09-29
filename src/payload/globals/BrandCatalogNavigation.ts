import type { GlobalConfig } from 'payload'
import { anyone, hasFullAdminAccess } from '../access'

const cover = { name: 'coverImage', type: 'relationship' as const, relationTo: 'media' as const, required: false }

export const BrandCatalogNavigation: GlobalConfig = {
  slug: 'brand-catalog-navigation',
  label: 'Навигация каталога (бренды)',
  admin: { hidden: true },
  access: { read: anyone, update: ({ req }) => hasFullAdminAccess(req.user) },
  fields: [{ name: 'groups', type: 'array', required: true, fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'key', type: 'text', required: true },
    { name: 'href', type: 'text' },
    { name: 'filter', type: 'json' },
    { name: 'sortOrder', type: 'number', defaultValue: 100 },
    { name: 'isVisible', type: 'checkbox', defaultValue: true },
    { name: 'isNew', type: 'checkbox', defaultValue: false },
    cover,
    { name: 'children', type: 'array', fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'key', type: 'text', required: true },
      { name: 'href', type: 'text' },
      { name: 'filter', type: 'json' },
      { name: 'sortOrder', type: 'number', defaultValue: 100 },
      { name: 'isVisible', type: 'checkbox', defaultValue: true },
      { name: 'isNew', type: 'checkbox', defaultValue: false },
      { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true },
      cover,
    ] },
  ] }],
}
