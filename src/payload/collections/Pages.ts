import type { CollectionConfig } from 'payload'

import { anyone, superadmins } from '../access'
import { slugify } from '../utils/slugify'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Страница',
    plural: 'Страницы',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    hidden: true,
  },
  access: {
    read: anyone,
    create: superadmins,
    update: superadmins,
    delete: superadmins,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.title && !data.slug) {
          data.slug = slugify(data.title)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок',
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
      name: 'content',
      type: 'richText',
      label: 'Контент',
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
