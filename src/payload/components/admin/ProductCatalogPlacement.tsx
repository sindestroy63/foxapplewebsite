'use client'

import React from 'react'
import { useDocumentInfo, useField, useFormFields } from '@payloadcms/ui'

type PlacementOption = { id: string | number; path: string; kind: 'group' | 'brand' | 'line' }
type PlacementCurrent = { id: string | number; path: string }

const groups: Record<string, string> = {
  smartphones: 'Смартфоны', tablets: 'Планшеты', laptops: 'Ноутбуки', 'smart-watches': 'Смарт-часы',
  audio: 'Наушники и аудио', 'gaming-consoles': 'Игровые консоли', 'home-appliances': 'Бытовая техника',
  'smart-devices': 'Умные устройства', accessories: 'Аксессуары', other: 'Другое',
}
const segments = (path: string) => path.split(/\s*(?:→|в†’)\s*/).filter(Boolean)
groups['trade-in'] = 'Trade-in / Б/У товары'
const optionPath = (option: PlacementOption | undefined) => option ? segments(option.path) : []

export default function ProductCatalogPlacement() {
  const { id: documentId } = useDocumentInfo()
  const productGroupField = useField<string>({ path: 'productGroup' })
  const brandField = useField<string>({ path: 'brand' })
  const productLineField = useField<string>({ path: 'productLine' })
  const values = useFormFields((fields: Record<string, any>) => ({ productGroup: fields.productGroup?.value, brand: fields.brand?.value, productLine: fields.productLine?.value }))
  const [options, setOptions] = React.useState<PlacementOption[]>([])
  const [current, setCurrent] = React.useState<PlacementCurrent | null>(null)
  const [groupId, setGroupId] = React.useState('')
  const [brandId, setBrandId] = React.useState('')
  const [lineId, setLineId] = React.useState('')
  const [status, setStatus] = React.useState('')

  React.useEffect(() => {
    fetch('/api/catalog-placement-options')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Не удалось загрузить размещения')))
      .then((payload) => {
        const nextOptions = (payload.options || []) as PlacementOption[]
        setOptions(nextOptions)
        const placement = documentId ? payload.current?.[String(documentId)] as PlacementCurrent | undefined : undefined
        if (!placement) return
        setCurrent(placement)
        const path = segments(placement.path)
        const group = nextOptions.find((item) => item.kind === 'group' && optionPath(item)[0] === path[0])
        const brand = nextOptions.find((item) => item.kind === 'brand' && item.path === path.slice(0, 2).join(' → '))
        const line = nextOptions.find((item) => item.kind === 'line' && item.path === path.join(' → '))
        setGroupId(group ? String(group.id) : '')
        setBrandId(brand ? String(brand.id) : '')
        setLineId(line ? String(line.id) : '')
      }).catch(() => setStatus('Не удалось загрузить дерево каталога.'))
  }, [documentId])

  const groupOptions = options.filter((option) => option.kind === 'group')
  const selectedGroup = groupOptions.find((option) => String(option.id) === groupId)
  const groupPath = optionPath(selectedGroup)[0]
  const brandOptions = options.filter((option) => option.kind === 'brand' && optionPath(option)[0] === groupPath)
  const selectedBrand = brandOptions.find((option) => String(option.id) === brandId)
  const brandPath = optionPath(selectedBrand)
  const lineOptions = options.filter((option) => option.kind === 'line' && optionPath(option)[0] === groupPath && (!brandId ? optionPath(option).length === 2 : optionPath(option)[1] === brandPath[1]))
  const selectedLine = lineOptions.find((option) => String(option.id) === lineId)
  const placementId = selectedLine?.id || selectedBrand?.id || selectedGroup?.id
  const resultPath = (selectedLine || selectedBrand || selectedGroup)?.path || current?.path || [groups[values.productGroup] || values.productGroup, values.brand, values.productLine].filter(Boolean).join(' → ')

  const savePlacement = async () => {
    if (!documentId || !placementId) return
    if (current && String(current.id) !== String(placementId) && !window.confirm('Товар будет перемещён в другую ветку каталога. Цена, SKU, URL, варианты и фотографии не изменятся.')) return
    setStatus('Сохраняем размещение…')
    try {
      const response = await fetch('/api/catalog-placement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: documentId, placementId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить размещение')
      productGroupField.setValue(payload.placement.productGroup)
      brandField.setValue(payload.placement.brand || '')
      productLineField.setValue(payload.placement.productLine || '')
      setCurrent({ id: placementId, path: payload.placement.path })
      setStatus(`Текущая структура: ${payload.placement.path}`)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Не удалось сохранить размещение') }
  }
  return (
    <div className="product-placement" aria-label="Размещение в каталоге">
      <strong>Размещение в каталоге</strong>
      <div className="product-placement-fields">
        <label>Группа<select value={groupId} onChange={(event) => { setGroupId(event.target.value); setBrandId(''); setLineId('') }} disabled={!groupOptions.length}><option value="">Выберите группу</option>{groupOptions.map((option) => <option key={option.id} value={String(option.id)}>{optionPath(option)[0]}</option>)}</select></label>
        <label>Бренд<select value={brandId} onChange={(event) => { setBrandId(event.target.value); setLineId('') }} disabled={!groupId}><option value="">Без бренда</option>{brandOptions.map((option) => <option key={option.id} value={String(option.id)}>{optionPath(option).at(-1)}</option>)}</select></label>
        <label>Линейка<select value={lineId} onChange={(event) => setLineId(event.target.value)} disabled={!groupId}><option value="">Без линейки</option>{lineOptions.map((option) => <option key={option.id} value={String(option.id)}>{optionPath(option).at(-1)}</option>)}</select></label>
      </div>
      <div className="product-placement-result"><span>Текущий путь:</span> <strong>{resultPath || 'Выберите группу'}</strong></div>
      <p>Порядок и видимость пункта на сайте настраиваются отдельно в «Навигации каталога».</p>
      {placementId && (!current || String(current.id) !== String(placementId)) && <button type="button" className="product-placement-save" onClick={() => void savePlacement()}>Сохранить размещение</button>}
      {status && <small role="status">{status}</small>}
    </div>
  )
}
