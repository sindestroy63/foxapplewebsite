'use client'

import React from 'react'
import { useDocumentInfo, useField, useFormFields } from '@payloadcms/ui'
import { getCatalogPlacementByChildKey, resolveProductCatalogPlacement } from '@/lib/product-catalog-placement'
import { ErrorBoundary } from './ErrorBoundary'

type NavigationItem = {
  title: string
  key: string
  href?: string
  filter?: Record<string, string>
  isVisible?: boolean
  children?: NavigationItem[]
  products?: Array<{ id?: string | number } | string | number>
}

const labelForGroup = (key: string, title: string) => key === 'trade-in' ? 'TRADE-IN' : title

function ProductCatalogPlacement() {
  const productGroupField = useField<string>({ path: 'productGroup' })
  const brandField = useField<string>({ path: 'brand' })
  const productLineField = useField<string>({ path: 'productLine' })
  const conditionField = useField<string>({ path: 'condition' })
  const { id: productId } = useDocumentInfo()
  const values = useFormFields(([fields]: any) => ({
    productGroup: fields.productGroup?.value,
    brand: fields.brand?.value,
    productLine: fields.productLine?.value,
    condition: fields.condition?.value,
  }))
  const [groups, setGroups] = React.useState<NavigationItem[]>([])
  const [groupKey, setGroupKey] = React.useState('')
  const [childKey, setChildKey] = React.useState('')
  const [status, setStatus] = React.useState('')

  // Hydrate the visual path from Payload's form state without mutating the document.
  React.useEffect(() => {
    try {
      if (!groups.length) return
      const placement = resolveProductCatalogPlacement(values)
      const direct = productId ? groups.find((group) => group.children?.some((child) => (child.products || []).some((product: any) => String(typeof product === 'object' ? product.id : product) === String(productId)))) : undefined
      const directChild = direct?.children?.find((child: NavigationItem) => (child.products || []).some((product: any) => String(typeof product === 'object' ? product.id : product) === String(productId)))
      if (direct && directChild) {
        setGroupKey((current) => current || direct.key)
        setChildKey((current) => current || directChild.key)
      } else if (placement) {
        setGroupKey((current) => current || placement.groupKey)
        setChildKey((current) => current || placement.childKey || '')
      }
    } catch (error) {
      console.error('[ProductCatalogPlacement] Error hydrating path:', error)
      // Не блокируем UI при ошибке
    }
  }, [groups, productId, values.productGroup, values.brand, values.productLine, values.condition])

  React.useEffect(() => {
    let active = true
    const endpoint = '/api/brand-catalog-navigation'

    const loadGroups = async () => {
      try {
        const response = await fetch(endpoint, { credentials: 'same-origin' })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          const reason = typeof payload.reason === 'string' ? payload.reason : ''
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[product-catalog-placement]', endpoint, response.status, reason || response.statusText)
          }

          const errorMessage = response.status === 401
            ? 'Сессия истекла. Войдите в админку заново.'
            : response.status === 403
            ? 'Недостаточно прав для загрузки разделов каталога.'
            : 'Не удалось загрузить разделы каталога'

          throw new Error(errorMessage)
        }

        const payload = await response.json()
        if (active) {
          setGroups(Array.isArray(payload.groups) ? payload.groups : [])
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : 'Не удалось загрузить разделы каталога'
          setStatus(message)
          console.error('[ProductCatalogPlacement] Load error:', error)
        }
      }
    }

    loadGroups()

    return () => { active = false }
  }, [])

  const selectedGroup = groups.find((group) => group.key === groupKey)
  const children = selectedGroup?.children || []
  const selectedChild = children.find((child) => child.key === childKey)
  const currentPath = [selectedGroup?.title, selectedChild?.title].filter(Boolean).join(' → ')

  const chooseGroup = (nextKey: string) => {
    setGroupKey(nextKey)
    setChildKey('')
    const group = groups.find((item) => item.key === nextKey)
    if (group?.key === 'trade-in') {
      productGroupField.setValue('trade-in')
      brandField.setValue('')
      productLineField.setValue('')
      conditionField.setValue('used')
      setStatus('Trade-in: productGroup=trade-in, condition=used')
    }
  }

  const savePlacement = () => {
    const group = selectedGroup
    if (!group) { setStatus('Выберите раздел каталога'); return }
    if (group.key === 'trade-in') {
      productGroupField.setValue('trade-in')
      brandField.setValue('')
      productLineField.setValue('')
      conditionField.setValue('used')
      setStatus('Размещение Trade-in подготовлено к сохранению')
      return
    }
    const placement = getCatalogPlacementByChildKey(selectedChild?.key)
    const filter = selectedChild?.filter || {}
    const productGroup = placement?.productGroup || filter.group || filter.productGroup || (filter.appleAccessories ? 'other' : '')
    const brand = placement?.brand || filter.brand || ''
    const productLine = placement?.productLine || filter.line || ''
    const save = async () => {
      if (productId && selectedChild?.key) {
        const response = await fetch('/api/brand-catalog-placement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, childKey: selectedChild.key }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          setStatus(payload.error || 'Не удалось сохранить размещение')
          return
        }
      }
      if (productGroup) productGroupField.setValue(productGroup)
      brandField.setValue(brand)
      productLineField.setValue(productLine)
      conditionField.setValue('new')
      setStatus('Размещение сохранено')
    }
    void save()
  }

  return (<>
    <span hidden>Навигация каталога</span>
    <div className="product-placement" aria-label="Раздел каталога">
      <strong>Раздел каталога</strong>
      <div className="product-placement-fields">
        <label>Брендовый раздел
          <select value={groupKey} onChange={(event) => chooseGroup(event.target.value)}>
            <option value="">Выберите раздел</option>
            {groups.map((group) => <option key={group.key} value={group.key}>{labelForGroup(group.key, group.title)}</option>)}
          </select>
        </label>
        {selectedGroup?.key !== 'trade-in' && <label>Подраздел
          <select value={childKey} onChange={(event) => setChildKey(event.target.value)} disabled={!selectedGroup}>
            <option value="">Весь раздел</option>
            {children.map((child) => <option key={child.key} value={child.key}>{child.title}</option>)}
          </select>
        </label>}
      </div>
      <div className="product-placement-result"><span>Текущий путь:</span> <strong>{currentPath || 'Выберите раздел'}</strong></div>
      <button type="button" className="product-placement-save" onClick={savePlacement} disabled={!selectedGroup}>Сохранить размещение</button>
      {status && <small role="status">{status}</small>}
    </div>
  </>)
}

// Обернём компонент в ErrorBoundary для защиты от полного краша админки
export default function ProductCatalogPlacementWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ProductCatalogPlacement />
    </ErrorBoundary>
  )
}
