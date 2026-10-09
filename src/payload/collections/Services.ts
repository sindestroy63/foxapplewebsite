import { CollectionConfig } from 'payload'

export const Services: CollectionConfig = {
  slug: 'services',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'price', 'isAvailable', 'sortOrder'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Название услуги',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug (URL)',
      admin: {
        description: 'Автоматически генерируется при создании',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Описание',
    },
    {
      name: 'images',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      label: 'Изображения',
    },
    {
      name: 'price',
      type: 'number',
      label: 'Цена (₽)',
      admin: {
        description: 'Оставьте пустым для "Цена по запросу"',
      },
    },
    {
      name: 'priceLabel',
      type: 'text',
      label: 'Метка цены',
      admin: {
        description: 'Например: "от 5000 ₽" или "по запросу"',
      },
    },
    {
      name: 'isAvailable',
      type: 'checkbox',
      label: 'Доступна',
      defaultValue: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Порядок сортировки',
      defaultValue: 0,
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        // Auto-generate slug on create
        if (operation === 'create' && data?.name && !data?.slug) {
          const { normalizeSlug } = await import('@/lib/slug-generator')
          data.slug = normalizeSlug(data.name)
        }
        return data
      },
    ],
  },
}
