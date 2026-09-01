'use client'

import React from 'react'
import { useDocumentInfo, useField, useFormFields } from '@payloadcms/ui'

import { composeProductSlug, createSlugSuffix, getProductSlugSuffix } from '../../utils/slugify'

export default function ProductSlugField() {
  const { id } = useDocumentInfo()
  const slugField = useField<string>({ path: 'slug' })
  const name = useFormFields(([fields]: any) => fields.name?.value)
  const suffixRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (id) return

    const currentSlug = typeof slugField.value === 'string' ? slugField.value : ''
    const suffix = getProductSlugSuffix(currentSlug) || suffixRef.current || createSlugSuffix()
    suffixRef.current = suffix

    const nextSlug = composeProductSlug(typeof name === 'string' ? name : '', suffix)
    if (currentSlug !== nextSlug) slugField.setValue(nextSlug)
  }, [id, name, slugField])

  return (
    <div className="field-type text product-slug-field">
      <label className="field-label" htmlFor="field-slug">URL slug</label>
      <input id="field-slug" readOnly value={typeof slugField.value === 'string' ? slugField.value : ''} />
      <p className="field-description">Формируется автоматически из названия и сохраняется при создании товара.</p>
    </div>
  )
}
