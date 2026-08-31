'use client'

import { useAuth, useFormFields } from '@payloadcms/ui'

export default function ProductSystemData() {
  const { user } = useAuth<{ id?: string | number; role?: string }>()
  const values = useFormFields((fields: Record<string, any>) => ({
    id: fields.id?.value,
    name: fields.name?.value,
    model: fields.model?.value,
    deviceModel: fields.deviceModel?.value,
    sku: fields.sku?.value,
    slug: fields.slug?.value,
    sortOrder: fields.sortOrder?.value,
    seoTitle: fields.seoTitle?.value,
    seoDescription: fields.seoDescription?.value,
    productGroup: fields.productGroup?.value,
    brand: fields.brand?.value,
    productType: fields.productType?.value,
    productLine: fields.productLine?.value,
    variants: fields.variants?.value,
    images: fields.images?.value,
    createdAt: fields.createdAt?.value,
    updatedAt: fields.updatedAt?.value,
    legacyRam: fields.ram?.value,
    legacySize: fields.size?.value,
    legacyScreenSize: fields.screenSize?.value,
    legacyConnectivity: fields.connectivity?.value,
  }))
  const name = String(values.name || values.model || 'Техника в ФОХСТОР').trim()
  const isSuperadmin = user?.role === 'superadmin' || user?.role === 'admin'
  const variantCount = Array.isArray(values.variants) ? values.variants.length : 0
  const imageCount = Array.isArray(values.images) ? values.images.length : 0
  const deviceModelLabel = values.deviceModel && typeof values.deviceModel === 'object'
    ? values.deviceModel.name || values.deviceModel.model || values.deviceModel.id
    : values.deviceModel
  return (
    <details className="product-system-data">
      <summary>Системные данные (только чтение)</summary>
      <dl>
        <dt>Служебный артикул</dt><dd>{values.sku || 'Будет сформирован автоматически'}</dd>
        <dt>Адрес товара</dt><dd>{values.slug || 'Будет сформирован автоматически'}</dd>
        <dt>Порядок карточек</dt><dd>{values.sortOrder ?? 'По умолчанию'}</dd>
        <dt>SEO preview</dt><dd>Title: {name} — купить в Самаре | ФОХСТОР</dd>
        <dd>Description: {name}. Цена, наличие и доставка в Самаре. ФОХСТОР.</dd>
        {values.createdAt && <><dt>Создан</dt><dd>{String(values.createdAt)}</dd></>}
        {values.updatedAt && <><dt>Обновлён</dt><dd>{String(values.updatedAt)}</dd></>}
        {isSuperadmin && <>
          <dt>Системный ID</dt><dd>{values.id || '—'}</dd>
          {deviceModelLabel && <><dt>Модель устройства</dt><dd>{String(deviceModelLabel)}</dd></>}
          <dt>Размещение (данные)</dt><dd>{[values.productGroup, values.brand, values.productType, values.productLine, values.model].filter(Boolean).join(' / ') || '—'}</dd>
          <dt>Варианты</dt><dd>{variantCount}</dd>
          <dt>Фотографии</dt><dd>{imageCount}</dd>
          {values.legacyRam && <><dt>Устаревшее RAM</dt><dd>Для совместимости: {String(values.legacyRam)}</dd></>}
          {values.legacySize && <><dt>Устаревший размер</dt><dd>Для совместимости: {String(values.legacySize)}</dd></>}
          {values.legacyScreenSize && <><dt>Устаревшая диагональ</dt><dd>Для совместимости: {String(values.legacyScreenSize)}</dd></>}
          {values.legacyConnectivity && <><dt>Устаревшее подключение</dt><dd>Для совместимости: {String(values.legacyConnectivity)}</dd></>}
        </>}
      </dl>
    </details>
  )
}
