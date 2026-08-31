import type { CollectionConfig, Where } from 'payload'
import { admins } from '../access'
const kinds = [{ label: 'Группа', value: 'group' }, { label: 'Бренд', value: 'brand' }, { label: 'Линейка', value: 'line' }, { label: 'Товар', value: 'product' }, { label: 'Своя ссылка', value: 'custom_link' }]
const allowedParents: Record<string, string[]> = { brand: ['group'], line: ['group', 'brand'], product: ['group', 'brand', 'line'], custom_link: ['group', 'brand', 'line'] }
export const CatalogNavigation: CollectionConfig = {
  slug: 'catalog-navigation', labels: { singular: 'Пункт навигации', plural: 'Навигация каталога' },
  admin: { hidden: true, useAsTitle: 'title', defaultColumns: ['parent', 'sortOrder', 'title', 'kind', 'product', 'isVisible', 'isNew'], group: 'Настройки сайта' },
  access: { read: ({ req }) => !req.user || req.user.role === 'admin' || req.user.role === 'superadmin', create: admins, update: admins, delete: admins },
  hooks: { beforeValidate: [async ({ data, req, originalDoc }) => {
    if (!data) return data
    const kind = data.kind || originalDoc?.kind, parentId = data.parent ?? originalDoc?.parent, productId = data.product ?? originalDoc?.product
    if (kind === 'group' && parentId) throw new Error('Group cannot have a parent.')
    if (kind === 'product' && !productId) throw new Error('Product navigation item requires a product.')
    if (kind === 'custom_link' && !/^\/(?!\/)/.test(String(data.href ?? originalDoc?.href ?? ''))) throw new Error('Custom links must use an internal path.')
    if (parentId) { const parent = await req.payload.findByID({ collection: 'catalog-navigation', id: typeof parentId === 'object' ? parentId.id : parentId, depth: 0, req }) as any; if (!parent) throw new Error('Parent navigation item not found.'); if (originalDoc?.id && parent.id === originalDoc.id) throw new Error('Navigation cycles are not allowed.'); if (kind !== 'group' && !allowedParents[kind]?.includes(parent.kind)) throw new Error(`Invalid parent for ${kind}.`); let cursor = parent; const seen = new Set<number | string>(); while (cursor?.parent) { if (seen.has(cursor.id)) throw new Error('Navigation cycle detected.'); seen.add(cursor.id); const next = await req.payload.findByID({ collection: 'catalog-navigation', id: typeof cursor.parent === 'object' ? cursor.parent.id : cursor.parent, depth: 0, req }) as any; if (!next) throw new Error('Orphan parent navigation item.'); if (originalDoc?.id && next.id === originalDoc.id) throw new Error('Navigation cycles are not allowed.'); cursor = next } }
    if (kind === 'group') data.parent = null; if (kind !== 'product') data.product = null; if (kind !== 'custom_link') data.href = undefined; if (data.isNew && !data.badgeText) data.badgeText = 'Новинка'; return data
  }] },
  fields: [
    { name: 'title', type: 'text', required: true }, { name: 'kind', type: 'select', required: true, options: kinds },
    { name: 'parent', type: 'relationship', relationTo: 'catalog-navigation', filterOptions: (() => ({ kind: { not_equals: 'product' } })) as unknown as Where },
    { name: 'productGroup', type: 'text' }, { name: 'brand', type: 'text' }, { name: 'productLine', type: 'text' }, { name: 'product', type: 'relationship', relationTo: 'products' }, { name: 'coverImage', type: 'relationship', relationTo: 'media', admin: { condition: (data: any) => data?.kind === 'group', description: 'Обложка раздела. Связь можно очистить без удаления Media.' } }, { name: 'href', type: 'text' }, { name: 'sortOrder', type: 'number', required: true, defaultValue: 100 }, { name: 'isVisible', type: 'checkbox', defaultValue: true }, { name: 'isNew', type: 'checkbox', defaultValue: false }, { name: 'badgeText', type: 'text' }, { name: 'description', type: 'textarea' }, { name: 'stableKey', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } }, { name: 'generatedBy', type: 'text', admin: { readOnly: true } },
  ],
}
