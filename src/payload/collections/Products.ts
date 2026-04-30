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
      ({ data, operation }) => {
        if (data?.name && !data.slug) {
          data.slug = slugify(data.name)
        }
        if (data?.slug && (operation === 'create' || operation === 'update')) {
          const s = data.slug as string
          const variantParts = /-(128gb|256gb|512gb|1tb|2tb|sim-esim|esim|ultramarin|chernyy|belyy|rozovyy|biryuzovyy|seryy-kosmos|chyornyy-titan|belyy-titan|pustynyy-titan|naturalnyy-titan|zelyonyy-titan|serebristyy|goluboy|zhyoltyy|fioletovyy|syiyayuschaya-zvezda|tyomnaya-noch|nebosno-goluboy|rozovoe-zoloto|glyantsevyy-chyornyy|oranzhevyy|zelyonyy|shalfey)/
          if (variantParts.test(s)) {
            throw new Error('Нельзя создавать отдельный товар для варианта. Используйте variants внутри товара.')
          }
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
        description: 'Формируется автоматически из названия.',
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
      admin: { hidden: true },
    },
    {
      name: 'color',
      type: 'text',
      label: 'Цвет',
      admin: { hidden: true },
    },
    {
      name: 'simType',
      type: 'text',
      label: 'SIM/eSIM',
      admin: { hidden: true },
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
      admin: {
        description: 'Рекомендуемый размер: 1000×1000 px (квадрат). Формат: JPG, PNG или WebP. Первое фото — основное.',
      },
    },
    {
      name: 'size',
      type: 'text',
      label: 'Размер (мм)',
      admin: {
        description: 'Для Apple Watch: 40mm, 42mm и т.д.',
      },
    },
    {
      name: 'deviceModel',
      type: 'relationship',
      relationTo: 'device-models',
      label: 'Модель устройства',
      admin: {
        description: 'Выберите модель для автозаполнения и генерации вариантов.',
        position: 'sidebar',
      },
    },
    {
      name: 'variantGenerator',
      type: 'ui',
      admin: {
        components: {
          Field: '/payload/components/admin/VariantGenerator',
        },
      },
    },
    {
      name: 'variants',
      type: 'array',
      label: 'Варианты товара',
      admin: {
        description: 'Конфигурации товара (цвет, память, размер и т.д.). Если не заданы — используются основные поля.',
      },
      fields: [
        { type: 'row', fields: [
          { name: 'color', type: 'relationship', relationTo: 'colors', label: 'Цвет',
            admin: { description: 'Выберите из справочника цветов' } },
          { name: 'storage', type: 'relationship', relationTo: 'storage-options', label: 'Память / Размер',
            admin: { description: 'Выберите из справочника (128GB, 256GB, 42mm…)' } },
          { name: 'sim', type: 'relationship', relationTo: 'sim-options', label: 'Тип SIM',
            admin: { description: 'Выберите из справочника SIM-вариантов' } },
        ] },
        { type: 'row', fields: [
          { name: 'chip', type: 'text', label: 'Чип (M1, M4 Pro…)' },
          { name: 'ram', type: 'text', label: 'Оперативная память' },
          { name: 'screenSize', type: 'text', label: 'Диагональ' },
        ] },
        { type: 'row', fields: [
          { name: 'connectivity', type: 'text', label: 'Подключение (Wi-Fi, Cellular…)' },
        ] },
        { type: 'row', fields: [
          { name: 'price', type: 'number', label: 'Цена наличные', required: true, min: 0 },
          { name: 'oldPrice', type: 'number', label: 'Старая цена', min: 0 },
        ] },
        { name: 'status', type: 'select', label: 'Статус', defaultValue: 'in_stock', options: [
          { label: 'В наличии', value: 'in_stock' },
          { label: 'Под заказ', value: 'preorder' },
          { label: 'Нет в наличии', value: 'out_of_stock' },
        ] },
        { name: 'isAvailable', type: 'checkbox', label: 'Доступен', defaultValue: true },
        { name: 'images', type: 'upload', label: 'Фото варианта', relationTo: 'media', hasMany: true,
          filterOptions: { mimeType: { like: 'image/' } },
          admin: { description: '1000×1000 px, JPG/PNG/WebP. Пусто → общие фото товара.' },
        },
      ],
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
