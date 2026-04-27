import type { CollectionConfig } from 'payload'

import { admins, anyone, authenticated } from '../access'
import { slugify } from '../utils/slugify'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Товар',
    plural: 'Товары',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'price', 'status', 'isAvailable', 'sortOrder'],
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
        if (data?.name) {
          const parts = [data.name, data.memory, data.simType].filter(Boolean)
          data.slug = slugify(parts.join(' '))
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'category',
      type: 'relationship',
      label: 'Категория',
      relationTo: 'categories',
      required: true,
      index: true,
    },
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
      admin: {
        description: 'Формируется автоматически из названия, памяти и SIM.',
        readOnly: true,
      },
    },
    {
      name: 'model',
      type: 'text',
      label: 'Модель',
    },
    {
      name: 'memory',
      type: 'text',
      label: 'Память',
    },
    {
      name: 'color',
      type: 'text',
      label: 'Цвет',
    },
    {
      name: 'simType',
      type: 'text',
      label: 'SIM/eSIM',
    },
    {
      name: 'price',
      type: 'number',
      label: 'Цена за наличные',
      required: true,
      min: 0,
      admin: {
        description: 'Цена по карте рассчитывается автоматически (+16%)',
      },
    },
    {
      name: 'oldPrice',
      type: 'number',
      label: 'Старая цена',
      min: 0,
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус наличия',
      defaultValue: 'in_stock',
      options: [
        {
          label: 'В наличии',
          value: 'in_stock',
        },
        {
          label: 'Под заказ',
          value: 'preorder',
        },
        {
          label: 'Нет в наличии',
          value: 'out_of_stock',
        },
      ],
    },
    {
      name: 'isAvailable',
      type: 'checkbox',
      label: 'Показывать на сайте',
      defaultValue: true,
      index: true,
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      label: 'Популярный товар',
      defaultValue: false,
      index: true,
    },
    {
      name: 'isNew',
      type: 'checkbox',
      label: 'Новинка',
      defaultValue: false,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Порядок сортировки',
      defaultValue: 100,
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Краткое описание',
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Описание',
    },
    {
      name: 'images',
      type: 'upload',
      label: 'Фотографии',
      filterOptions: {
        mimeType: {
          like: 'image/',
        },
      },
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: 'SEO title',
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      label: 'SEO description',
    },
  ],
}
