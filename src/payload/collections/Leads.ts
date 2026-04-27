import type { CollectionConfig } from 'payload'

import { admins, anyone } from '../access'

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    singular: 'Заявка',
    plural: 'Заявки',
  },
  admin: {
    useAsTitle: 'phone',
    defaultColumns: ['createdAt', 'name', 'phone', 'telegram', 'product', 'source', 'status'],
  },
  access: {
    read: admins,
    create: anyone,
    update: admins,
    delete: admins,
  },
  timestamps: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
    },
    {
      name: 'telegram',
      type: 'text',
      label: 'Telegram',
    },
    {
      name: 'product',
      type: 'relationship',
      label: 'Товар',
      relationTo: 'products',
    },
    {
      name: 'comment',
      type: 'textarea',
      label: 'Комментарий клиента',
    },
    {
      name: 'consent',
      type: 'checkbox',
      label: 'Согласие на обработку персональных данных',
      defaultValue: false,
    },
    {
      name: 'consentAt',
      type: 'date',
      label: 'Дата согласия',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'source',
      type: 'select',
      label: 'Источник',
      defaultValue: 'contact_form',
      options: [
        { label: 'Звонок', value: 'call' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Форма товара', value: 'product_form' },
        { label: 'Форма контактов', value: 'contact_form' },
        { label: 'Форма ремонта', value: 'repair_form' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Статус',
      defaultValue: 'new',
      admin: {
        position: 'sidebar',
      },
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Успешно', value: 'done' },
        { label: 'Провалено', value: 'failed' },
        { label: 'Отменена', value: 'cancelled' },
      ],
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      label: 'Заметки менеджера',
      admin: {
        description: 'Внутренние заметки по заявке. Клиент их не видит.',
      },
    },
  ],
}