import type { CollectionConfig } from 'payload'

import { denyPriceUpdateMutation } from '../price-updates/access'

export const PriceUpdateItems: CollectionConfig = {
  slug: 'price-update-items',
  labels: { singular: 'Строка обновления цены', plural: 'Строки обновления цен' },
  admin: {
    hidden: true,
    group: 'Обновление цен',
    useAsTitle: 'sku',
    defaultColumns: ['sku', 'matchType', 'oldCashPrice', 'newCashPrice', 'status', 'batch', 'createdAt'],
  },
  access: {
    read: denyPriceUpdateMutation,
    create: denyPriceUpdateMutation,
    update: denyPriceUpdateMutation,
    delete: denyPriceUpdateMutation,
  },
  fields: [
    { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true, label: 'Автор', admin: { hidden: true } },
    { name: 'batch', type: 'relationship', relationTo: 'price-update-batches', required: true, index: true, label: 'Пакет' },
    { name: 'lineNumber', type: 'number', required: true, label: 'Номер строки' },
    { name: 'sourceLine', type: 'text', required: true, label: 'Исходная строка' },
    { name: 'sku', type: 'text', label: 'SKU', index: true },
    {
      name: 'matchType', type: 'select', label: 'Тип совпадения',
      options: [{ label: 'Товар', value: 'product' }, { label: 'Вариант', value: 'variant' }],
    },
    { name: 'product', type: 'relationship', relationTo: 'products', label: 'Товар', index: true },
    { name: 'productLabel', type: 'text', label: 'Название товара' },
    { name: 'variantId', type: 'text', label: 'ID варианта' },
    { name: 'oldCashPrice', type: 'number', label: 'Старая цена за наличные' },
    { name: 'newCashPrice', type: 'number', label: 'Новая цена за наличные' },
    { name: 'oldCardPrice', type: 'number', label: 'Старая цена по карте' },
    { name: 'newCardPrice', type: 'number', label: 'Новая цена по карте' },
    {
      name: 'status', type: 'select', required: true, label: 'Статус', index: true,
      options: [
        { label: 'Готово', value: 'ready' },
        { label: 'SKU не найден', value: 'not_found' },
        { label: 'Некорректная цена', value: 'invalid_price' },
        { label: 'Повтор SKU', value: 'duplicate_sku_in_input' },
        { label: 'Конфликт', value: 'conflict' },
        { label: 'Обновлено', value: 'updated' },
        { label: 'Ошибка', value: 'failed' },
      ],
    },
    { name: 'errorMessage', type: 'textarea', label: 'Ошибка' },
  ],
}
