import type { CollectionConfig } from 'payload'

import { admins, adminsOrFirstUser, roleFieldAccess, superadmins } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Администратор',
    plural: 'Администраторы',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'name', 'createdAt'],
  },
  auth: true,
  access: {
    read: admins,
    create: adminsOrFirstUser,
    update: ({ req }) => {
      const role = (req.user as any)?.role
      return role === 'superadmin' || role === 'admin'
    },
    delete: superadmins,
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
        update: roleFieldAccess,
      },
      admin: {
        description: 'Суперадмин — полный доступ. Админ — управление каталогом и создание менеджеров. Менеджер — только редактирование товаров.',
      },
    },
  ],
}