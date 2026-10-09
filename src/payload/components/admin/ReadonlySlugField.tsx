'use client'

import React from 'react'
import { useField } from '@payloadcms/ui'

export const ReadonlySlugField: React.FC = () => {
  const { value } = useField<string>({ path: 'slug' })

  return (
    <div className="field-type read-only">
      <label className="field-label">
        URL Slug
        <span className="required">*</span>
      </label>
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#666',
        }}
      >
        {(value as string) || '(будет сгенерирован из названия)'}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#999',
          marginTop: '4px',
        }}
      >
        Slug автоматически генерируется из названия товара
      </div>
    </div>
  )
}
