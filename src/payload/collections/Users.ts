import type { CollectionConfig } from 'payload'

import { denyAll } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Администратор',
    plural: 'Администраторы',
  },
  admin: {
    hidden: true,
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'name', 'createdAt'],
  },
  auth: true,
  access: {
    read: ({ req, id }) => req.user && id ? { id: { equals: req.user.id } } : false,
    create: denyAll,
    update: ({ req, id }) => req.user && id ? { id: { equals: req.user.id } } : false,
    delete: denyAll,
  },
  hooks: {
    beforeChange: [({ data, originalDoc }) => {
      if (originalDoc && data) {
        if (data.email && data.email !== originalDoc.email) throw new Error('Email cannot be changed from account settings.')
        if (data.role && data.role !== originalDoc.role) throw new Error('Role cannot be changed from account settings.')
      }
      return data
    }],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
    },
    {
      name: 'role',
      type: 'select',
      label: 'Роль',
      defaultValue: 'manager',
      required: true,
      options: [
        { label: 'Суперадмин', value: 'superadmin' },
        { label: 'Администратор', value: 'admin' },
        { label: 'Менеджер', value: 'manager' },
      ],
      access: {
        update: () => false,
      },
      admin: {
        description: 'Суперадмин — полный доступ. Админ — управление каталогом и создание менеджеров. Менеджер — только редактирование товаров.',
      },
    },
  ],
}
