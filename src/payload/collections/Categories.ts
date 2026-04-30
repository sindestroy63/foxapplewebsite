import type { CollectionConfig } from 'payload'

import { admins, anyone, authenticated } from '../access'
import { slugify } from '../utils/slugify'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Категория',
    plural: 'Категории',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'coverImage', 'sortOrder', 'isActive'],
  },
  access: {
    read: anyone,
    create: admins,
    update: authenticated,
    delete: admins,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.name && !data.slug) {
          data.slug = slugify(data.name)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Название',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL slug',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Порядок сортировки',
      defaultValue: 100,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Активна',
      defaultValue: true,
    },
    {
      name: 'coverImage',
      type: 'upload',
      label: 'Обложка категории',
      relationTo: 'media',
      filterOptions: {
        mimeType: { like: 'image/' },
      },
      admin: {
        description: 'Рекомендуемый размер: 900×700 px. Формат: JPG, PNG или WebP. Отображается на карточке категории.',
      },
    },
  ],
}
