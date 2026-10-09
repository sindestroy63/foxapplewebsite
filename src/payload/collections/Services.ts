import type { CollectionConfig } from 'payload'
import { admins, anyone } from '../access'
import { slugify } from '../utils/slugify'

export const Services: CollectionConfig = {
  slug: 'services',
  labels: {
    singular: 'Услуга',
    plural: 'Услуги',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'price', 'isAvailable', 'sortOrder'],
    description: 'Услуги, предоставляемые магазином (ремонт, настройка, консультации и т.д.)',
  },
  access: {
    read: anyone,
    create: admins,
    update: admins,
    delete: admins,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data?.name && !data.slug) {
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
      label: 'Название услуги',
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
        description: 'Автоматически генерируется из названия. Используется в URL: /services/[slug]',
      },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Категория услуги',
      options: [
        { label: 'Ремонт', value: 'repair' },
        { label: 'Настройка', value: 'setup' },
        { label: 'Консультация', value: 'consultation' },
        { label: 'Установка', value: 'installation' },
        { label: 'Обслуживание', value: 'maintenance' },
        { label: 'Другое', value: 'other' },
      ],
      admin: {
        description: 'Тип услуги для группировки в каталоге',
      },
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Краткое описание',
      maxLength: 200,
      admin: {
        description: 'Краткое описание для карточки услуги (до 200 символов)',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Полное описание',
      admin: {
        description: 'Подробное описание услуги, условия, что входит и т.д.',
      },
    },
    {
      name: 'price',
      type: 'number',
      label: 'Цена (₽)',
      required: true,
      min: 0,
      admin: {
        description: 'Стоимость услуги в рублях. Для услуг с переменной ценой укажите минимальную.',
      },
    },
    {
      name: 'priceType',
      type: 'select',
      label: 'Тип цены',
      options: [
        { label: 'Фиксированная', value: 'fixed' },
        { label: 'От (минимальная)', value: 'from' },
        { label: 'По договорённости', value: 'negotiable' },
      ],
      defaultValue: 'fixed',
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Длительность',
      admin: {
        description: 'Примерное время выполнения (например: "30 минут", "1-2 дня")',
      },
    },
    {
      name: 'images',
      type: 'array',
      label: 'Изображения',
      maxRows: 5,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
      admin: {
        description: 'Фотографии, иллюстрирующие услугу',
      },
    },
    {
      name: 'features',
      type: 'array',
      label: 'Что входит',
      fields: [
        {
          name: 'item',
          type: 'text',
          label: 'Пункт',
          required: true,
        },
      ],
      admin: {
        description: 'Список того, что включено в услугу',
      },
    },
    {
      name: 'isAvailable',
      type: 'checkbox',
      label: 'Доступна для заказа',
      defaultValue: true,
      admin: {
        description: 'Отключите, чтобы скрыть услугу из каталога',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Порядок сортировки',
      defaultValue: 100,
      admin: {
        description: 'Меньшее число = выше в списке',
      },
    },
  ],
}
