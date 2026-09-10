import type { CollectionConfig } from 'payload'
import { randomBytes } from 'node:crypto'

import { admins, anyone } from '../access'
import { composeProductSlug, isProductSlug } from '../utils/slugify'
import { ensureVariantSkus, validateProductSkus } from '../utils/sku'
import { productTypeCondition, resolveProductType } from '../products/product-type'
import { deviceTypeCondition, resolveDeviceType } from '../products/device-type'
import { validateNewVariantConfigurations } from '../products/variant-validation'

const createSlugSuffix = () => randomBytes(3).toString('hex')

const ensureUniqueSlugOnCreate = async ({ name, requestedSlug, req }: { name: unknown; requestedSlug: unknown; req: any }) => {
  const requestedCandidate = isProductSlug(requestedSlug) ? requestedSlug : null

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 && requestedCandidate
      ? requestedCandidate
      : composeProductSlug(typeof name === 'string' ? name : '', createSlugSuffix())
    const existing = await req.payload.find({
      collection: 'products',
      where: { slug: { equals: candidate } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.totalDocs === 0) return candidate
  }

  throw new Error('Unable to generate a unique product URL slug.')
}

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Товар',
    plural: 'Товары',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sku', 'price', 'status', 'isAvailable', 'sortOrder'],
  },
  access: {
    read: anyone,
    create: admins,
    update: admins,
    delete: admins,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        return data
      },
    ],
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        if (operation === 'create' && data) {
          data.slug = await ensureUniqueSlugOnCreate({ name: data.name, requestedSlug: data.slug, req })
        }
        if (data?.slug && (operation === 'create' || operation === 'update')) {
          const s = data.slug as string
          const variantParts = /-(128gb|256gb|512gb|1tb|2tb|sim-esim|esim|ultramarin|chernyy|belyy|rozovyy|biryuzovyy|seryy-kosmos|chyornyy-titan|belyy-titan|pustynyy-titan|naturalnyy-titan|serebristyy|goluboy|zhyoltyy|fioletovyy|syiyayuschaya-zvezda|tyomnaya-noch|nebosno-goluboy|rozovoe-zoloto|glyantsevyy-chyornyy|oranzhevyy|shalfey|dymchato-goluboy|lavandovyy|nezhno-rozovyy|kosmicheskiy-oranzhevyy|glubokiy-siniy|svetloe-zoloto|oblachno-belyy)/
          if (variantParts.test(s)) {
            throw new Error('Нельзя создавать отдельный товар для варианта. Используйте variants внутри товара.')
          }
        }
        if (data) {
          const completeData = { ...(originalDoc || {}), ...data }
          if (typeof completeData.productType !== 'string' || !completeData.productType.trim()) {
            data.productType = resolveProductType(completeData)
          }
          if (!completeData.deviceType) data.deviceType = resolveDeviceType(completeData)
          if (Array.isArray(data.variants)) {
            data.variants = ensureVariantSkus(
              String(data.slug || originalDoc?.slug || 'product'),
              data.variants as Array<Record<string, any>>,
              (originalDoc?.variants || []) as Array<Record<string, any>>,
            )
          }
          const validationError = validateNewVariantConfigurations(data as Record<string, unknown>, originalDoc as Record<string, unknown> | null)
          if (validationError) throw new Error(validationError)
        }
        return validateProductSkus({
          data: data as Record<string, unknown>,
          originalDoc: originalDoc as Record<string, unknown> | null,
          req,
        })
      },
    ],
  },
  fields: [
    {
      name: 'basicsSection',
      type: 'ui',
      admin: { components: { Field: '/payload/components/admin/ProductSection#BasicsSection' } },
    },
    {
      name: 'category',
      type: 'relationship',
      label: 'Категория',
      relationTo: 'categories',
      admin: { hidden: true },
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
      access: { update: () => false },
      index: true,
      admin: {
        readOnly: true,
        components: { Field: '/payload/components/admin/ProductSlugField' },
        description: 'Формируется автоматически из названия.',
      },
    },
    {
      name: 'model',
      type: 'text',
      label: 'Модель',
      admin: { hidden: true },
    },
    {
      name: 'placementSection',
      type: 'ui',
      admin: { components: { Field: '/payload/components/admin/ProductSection#PlacementSection' } },
    },
    {
      name: 'catalogPlacement',
      type: 'ui',
      admin: { components: { Field: '/payload/components/admin/ProductCatalogPlacement' } },
    },
    {
      name: 'productGroup',
      type: 'select',
      label: 'Верхняя группа',
      options: [
        ['smartphones', 'Смартфоны'], ['tablets', 'Планшеты'], ['laptops', 'Ноутбуки'], ['smart-watches', 'Смарт-часы'],
        ['audio', 'Наушники и аудио'], ['gaming-consoles', 'Игровые консоли'], ['home-appliances', 'Бытовая техника'],
        ['smart-devices', 'Умные устройства'], ['accessories', 'Аксессуары'], ['other', 'Другое'], ['trade-in', 'Trade-in / Б/У товары'],
      ].map(([value, label]) => ({ value, label })),
      admin: { hidden: true },
    },
    {
      name: 'condition',
      type: 'select',
      label: 'Состояние товара',
      options: [
        { label: 'Новый', value: 'new' },
        { label: 'Б/У', value: 'used' },
      ],
      admin: {
        hidden: true,
        readOnly: true,
        description: 'Необязательное техническое поле; существующие товары не изменяются автоматически.',
      },
    },
    { name: 'brand', type: 'text', label: 'Бренд', admin: { hidden: true } },
    {
      name: 'deviceType',
      type: 'text',
      label: 'Тип устройства',
      admin: {
        components: { Field: '/payload/components/admin/DeviceTypeField' },
        description: 'Выберите тип устройства до настройки вариантов.',
      },
    },
    {
      name: 'productType',
      type: 'text',
      label: 'Тип товара',
      admin: {
        components: { Field: '/payload/components/admin/ProductTypeField' },
        description: 'Выберите тип до добавления вариантов.',
      },
    },
    { name: 'productLine', type: 'text', label: 'Линейка товара', admin: { hidden: true } },
    {
      name: 'sku',
      type: 'text',
      label: 'Артикул (SKU)',
      unique: true,
      index: true,
      access: { update: () => false },
      admin: {
        readOnly: true,
        description: 'Используется для массового обновления цен',
      },
    },
    {
      name: 'badge',
      type: 'text',
      label: 'Метка товара',
      admin: { hidden: true },
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
      label: 'Цена со скидкой',
      required: true,
      min: 0,
      admin: {
        description: 'Базовая розничная цена рассчитывается автоматически (+20%)',
      },
    },
    {
      name: 'commerceSection',
      type: 'ui',
      admin: { components: { Field: '/payload/components/admin/ProductSection#CommerceSection' } },
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
      name: 'hideUnavailableColors',
      type: 'checkbox',
      label: 'Скрывать цвета не в наличии',
      defaultValue: false,
      admin: {
        description: 'Если включено — цвета, для которых все варианты недоступны, не будут показываться на странице товара.',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      label: 'Популярный товар',
      defaultValue: false,
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'isNew',
      type: 'checkbox',
      label: 'Новинка',
      defaultValue: false,
      admin: { hidden: true },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Порядок сортировки',
      defaultValue: 100,
      admin: { hidden: true, readOnly: true, description: 'Используется для технического порядка карточек в каталоге.' },
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
      admin: {
        hidden: true,
        description: 'Устаревшее поле сохранено для обратной совместимости.',
      },
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
      name: 'mediaSection',
      type: 'ui',
      admin: { components: { Field: '/payload/components/admin/ProductSection#MediaSection' } },
    },
    {
      name: 'colorImages',
      type: 'array',
      label: 'Фотографии по цветам',
      admin: {
        description: 'Загрузите фото для каждого цвета. При выборе цвета на сайте показываются соответствующие фото. Если не заданы — общие фото товара.',
      },
      fields: [
        {
          name: 'color',
          type: 'relationship',
          relationTo: 'colors',
          label: 'Цвет',
          required: true,
        },
        {
          name: 'images',
          type: 'upload',
          relationTo: 'media',
          hasMany: true,
          label: 'Фотографии',
          required: true,
          filterOptions: { mimeType: { like: 'image/' } },
        },
      ],
    },
    {
      name: 'size',
      type: 'text',
      label: 'Размер (мм)',
      admin: {
        hidden: true,
        description: 'Для Apple Watch: 40mm, 42mm и т.д.',
      },
    },
    {
      name: 'deviceModel',
      type: 'relationship',
      relationTo: 'device-models',
      label: 'Модель устройства',
      admin: {
        hidden: true,
        description: 'Выберите модель для автозаполнения и генерации вариантов.',
        position: 'sidebar',
      },
    },
    {
      name: 'variantGenerator',
      type: 'ui',
      admin: {
        // Variant generation remains available in the component code, but is not rendered in the ordinary form.
        condition: () => false,
        components: {
          Field: '/payload/components/admin/VariantGenerator',
        },
      },
    },
    {
      name: 'variantsSection',
      type: 'ui',
      admin: { components: { Field: '/payload/components/admin/ProductSection#VariantsSection' } },
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
          { name: 'sku', type: 'text', label: 'Служебный артикул', unique: true, index: true, access: { update: () => false },
            admin: { readOnly: true, description: 'Формируется автоматически при создании варианта.' } },
          { name: 'color', type: 'relationship', relationTo: 'colors', label: 'Цвет',
            admin: { description: 'Выберите из справочника цветов' } },
          { name: 'storage', type: 'relationship', relationTo: 'storage-options', label: 'Накопитель', filterOptions: { archived: { not_equals: true } },
            admin: { condition: deviceTypeCondition(['phone', 'laptop', 'tablet'], 'storage'), description: 'Выберите накопитель из справочника (128GB, 256GB, 512GB, 1TB, 2TB)' } },
          { name: 'sim', type: 'relationship', relationTo: 'sim-options', label: 'Тип SIM', filterOptions: { value: { in: ['ESIM', 'SIM_ESIM'] } },
            admin: { condition: deviceTypeCondition(['phone'], 'sim'), description: 'Выберите eSIM или SIM + eSIM из справочника' } },
        ] },
        { type: 'row', fields: [
          { name: 'chip', type: 'text', label: 'Чип (M1, M4 Pro…)', admin: { condition: deviceTypeCondition(['laptop', 'tablet'], 'chip') } },
          { name: 'ram', type: 'text', label: 'Устаревшая RAM', admin: { readOnly: true, condition: (_data: any, siblingData: any) => !siblingData?.ramOption && Boolean(siblingData?.ram) } },
          { name: 'ramOption', type: 'relationship', relationTo: 'ram-options', label: 'Оперативная память (справочник)', filterOptions: { archived: { not_equals: true } }, admin: { condition: deviceTypeCondition(['laptop'], 'ramOption'), description: 'Выберите RAM для Mac; старое текстовое поле сохраняется.' } },
          { name: 'size', type: 'text', label: 'Устаревший размер',
            admin: { readOnly: true, condition: (_data: any, siblingData: any) => !siblingData?.sizeOption && Boolean(siblingData?.size), description: 'Старое значение сохранено для совместимости.' } },
          { name: 'sizeOption', type: 'relationship', relationTo: 'variant-size-options', label: 'Размер корпуса', filterOptions: { archived: { not_equals: true } },
            admin: { condition: deviceTypeCondition(['smartwatch'], 'sizeOption'), description: 'Размер корпуса Apple Watch из справочника.' } },
          { name: 'hasTouchId', type: 'checkbox', label: 'Есть Touch ID',
            admin: { condition: productTypeCondition(['mac'], 'hasTouchId'), description: 'Показывается для конфигураций Mac и сохранённых значений.' } },
          { name: 'screenSize', type: 'text', label: 'Устаревшая диагональ', admin: { readOnly: true, condition: (_data: any, siblingData: any) => !siblingData?.screenSizeOption && Boolean(siblingData?.screenSize) } },
          { name: 'screenSizeOption', type: 'relationship', relationTo: 'screen-size-options', label: 'Диагональ (справочник)', filterOptions: { archived: { not_equals: true } }, admin: { condition: deviceTypeCondition(['laptop', 'tablet'], 'screenSizeOption') } },
        ] },
        { type: 'row', fields: [
          { name: 'connectivity', type: 'text', label: 'Устаревшее подключение', admin: { readOnly: true, condition: (_data: any, siblingData: any) => !siblingData?.connectivityOption && Boolean(siblingData?.connectivity) } },
          { name: 'connectivityOption', type: 'relationship', relationTo: 'connectivity-options', label: 'Подключение (справочник)', filterOptions: { archived: { not_equals: true } }, admin: { condition: productTypeCondition(['mac', 'ipad', 'apple-watch', 'airpods'], 'connectivityOption'), description: 'Для iPad выберите Wi-Fi/LTE, для AirPods — USB-C/Lightning, если значение есть в справочнике.' } },
          { name: 'generation', type: 'text', label: 'Поколение / модель', admin: { condition: productTypeCondition(['mac', 'ipad', 'apple-watch', 'airpods'], 'generation') } },
          { name: 'packageLabel', type: 'text', label: 'Комплектация', admin: { condition: productTypeCondition(['apple-watch', 'airpods', 'other'], 'packageLabel'), description: 'Существующая комплектация или описание ремешка. Не используйте generation для комплектации.' } },
        ] },
        { type: 'row', fields: [
          { name: 'price', type: 'number', label: 'Цена со скидкой', required: true, min: 0 },
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
      admin: { hidden: true },
      access: { update: () => false },
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      label: 'SEO description',
      admin: { hidden: true },
      access: { update: () => false },
    },
    {
      name: 'systemDataPreview',
      type: 'ui',
      admin: { components: { Field: '/payload/components/admin/ProductSystemData' } },
    },
  ],
}
