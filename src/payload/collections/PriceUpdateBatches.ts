import type { CollectionConfig } from 'payload'

import { denyPriceUpdateMutation } from '../price-updates/access'

export const PriceUpdateBatches: CollectionConfig = {
  slug: 'price-update-batches',
  labels: { singular: 'Пакет обновления цен', plural: 'Пакеты обновления цен' },
  admin: {
    hidden: true,
    group: 'Обновление цен',
    useAsTitle: 'id',
    defaultColumns: ['id', 'author', 'status', 'totalLines', 'readyCount', 'errorCount', 'updatedCount', 'createdAt'],
    description: 'Журнал предпросмотров и подтверждений массового обновления цен.',
  },
  access: {
    read: denyPriceUpdateMutation,
    create: denyPriceUpdateMutation,
    update: denyPriceUpdateMutation,
    delete: denyPriceUpdateMutation,
  },
  fields: [
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true, label: 'Автор' },
    { name: 'sourceText', type: 'textarea', required: true, label: 'Исходный текст' },
    {
      name: 'status', type: 'select', required: true, defaultValue: 'preview', label: 'Статус', index: true,
      options: [
        { label: 'Предпросмотр', value: 'preview' },
        { label: 'Подтверждается', value: 'confirming' },
        { label: 'Подтверждён', value: 'confirmed' },
        { label: 'Ошибка', value: 'failed' },
        { label: 'Истёк', value: 'expired' },
      ],
    },
    { name: 'confirmationToken', type: 'text', required: true, unique: true, index: true, label: 'Одноразовый токен', access: { read: () => false }, admin: { hidden: true } },
    { name: 'expiresAt', type: 'date', required: true, label: 'Действителен до', admin: { position: 'sidebar' } },
    { name: 'confirmedAt', type: 'date', label: 'Дата подтверждения', admin: { position: 'sidebar' } },
    { name: 'totalLines', type: 'number', required: true, defaultValue: 0, label: 'Всего строк' },
    { name: 'readyCount', type: 'number', required: true, defaultValue: 0, label: 'Готово' },
    { name: 'errorCount', type: 'number', required: true, defaultValue: 0, label: 'Ошибок' },
    { name: 'updatedCount', type: 'number', required: true, defaultValue: 0, label: 'Обновлено' },
    { name: 'errorMessage', type: 'textarea', label: 'Ошибка пакета' },
  ],
}
