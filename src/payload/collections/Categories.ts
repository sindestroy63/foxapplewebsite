import type { CollectionConfig } from 'payload'

import { denyAll } from '../access'
import { slugify } from '../utils/slugify'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Категория',
    plural: 'Категории',
  },
  admin: {
    hidden: true,
    description: 'Сервисные категории. Товарный каталог строится через верхнюю группу, бренд, линейку и товар.',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'coverImage', 'sortOrder', 'isActive'],
  },
  access: {
    read: denyAll,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.slug && String(data.slug).toLowerCase() !== 'trade-in') {
          throw new Error('Разрешена только сервисная категория Trade-in. Товарные категории создаются через productGroup.')
        }
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
