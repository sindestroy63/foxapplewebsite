'use client'

import React from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
import { DEVICE_TYPE_OPTIONS, resolveDeviceType } from '../../products/device-type'

export default function DeviceTypeField() {
  const field = useField<string>({ path: 'deviceType' })
  const values = useFormFields(([fields]: any) => ({
    deviceType: fields.deviceType?.value,
    name: fields.name?.value,
    model: fields.model?.value,
    productLine: fields.productLine?.value,
    productGroup: fields.productGroup?.value,
    brand: fields.brand?.value,
  }))
  const value = typeof field.value === 'string' ? field.value : ''
  const inferred = resolveDeviceType(values)
  return <div className="field-type select device-type-field">
    <label className="field-label" htmlFor="field-deviceType">Тип устройства</label>
    <select id="field-deviceType" value={value} onChange={(event) => field.setValue(event.target.value)}>
      {!value && <option value="">Определить автоматически: {DEVICE_TYPE_OPTIONS.find((option) => option.value === inferred)?.label}</option>}
      {DEVICE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
}
