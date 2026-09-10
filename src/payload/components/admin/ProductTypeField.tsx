'use client'

import React from 'react'
import { useField, useFormFields } from '@payloadcms/ui'

import { PRODUCT_TYPE_OPTIONS, isManagedProductType, resolveProductType } from '../../products/product-type'

export default function ProductTypeField() {
  const field = useField<string>({ path: 'productType' })
  const data = useFormFields(([fields]: any) => ({
    name: fields.name?.value,
    model: fields.model?.value,
    productGroup: fields.productGroup?.value,
    brand: fields.brand?.value,
    productLine: fields.productLine?.value,
    productType: fields.productType?.value,
  }))
  const value = typeof field.value === 'string' ? field.value : ''
  const inferred = resolveProductType(data)
  const legacy = value && !isManagedProductType(value) ? value : ''

  return (
    <div className="field-type select product-type-field">
      <label className="field-label" htmlFor="field-productType">Тип товара</label>
      <select id="field-productType" value={value} onChange={(event) => field.setValue(event.target.value)}>
        {!value && <option value="">Определён автоматически: {PRODUCT_TYPE_OPTIONS.find((option) => option.value === inferred)?.label}</option>}
        {legacy && <option value={legacy}>Текущее значение: {legacy}</option>}
        {PRODUCT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p className="field-description">Определяет набор полей нового варианта. Смена типа не удаляет сохранённые характеристики.</p>
    </div>
  )
}
