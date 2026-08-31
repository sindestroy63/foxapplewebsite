'use client'

// @ts-ignore -- Payload CMS UI client types
import { useField, useFormFields } from '@payloadcms/ui'
import React, { useCallback, useEffect, useState } from 'react'

import { classifyVariantForNormalization } from '../../catalog-normalization/classification'
import { isAllowedStorageValue } from '../../catalog-normalization/allowed-values'

type ColorDoc = {
  id: number
  value: string
  englishLabel: string
  russianLabel: string
  primaryHex: string
  secondaryHex?: string
}

type StorageDoc = {
  id: number
  value: string
  archived?: boolean
}

type SizeDoc = {
  id: number
  value: string
  archived?: boolean
}

type SimDoc = {
  id: number
  value: string
  label: string
}

type DeviceModelDoc = {
  id: number
  name: string
  availableColors?: ColorDoc[]
  availableStorage?: StorageDoc[]
  availableSizes?: SizeDoc[]
  availableSim?: SimDoc[]
  chip?: string
  ram?: string
  screenSize?: string
  connectivity?: string
  basePrice?: number
  priceStep?: number
  storageIsSize?: boolean
}

type GeneratedVariant = {
  color?: number
  storage?: number
  sim?: number
  chip?: string
  ram?: string
  size?: string
  hasTouchId?: boolean
  screenSize?: string
  connectivity?: string
  price: number
  status: string
  isAvailable: boolean
}

function normalizeGeneratedStorage(storage: StorageDoc | undefined, model: DeviceModelDoc, allStorage: StorageDoc[]) {
  if (!storage) return { ram: model.ram || undefined }
  const classified = classifyVariantForNormalization({
    productId: 'variant-generator',
    productName: model.name,
    category: { slug: model.storageIsSize ? 'apple-watch' : 'generated' },
    storage: storage.value,
    ram: model.ram || null,
  })
  if (classified.status === 'auto_size') {
    return { size: classified.proposedSize || undefined, ram: model.ram || undefined }
  }
  if (classified.status === 'unchanged') {
    return { storage: storage.id, ram: model.ram || undefined }
  }
  if (classified.status === 'auto_split' || classified.status === 'auto_touch_id') {
    const cleanStorage = allStorage.find((option) => option.value === classified.proposedStorage)
    if (!cleanStorage) throw new Error(`Не найдено чистое значение накопителя ${classified.proposedStorage} в справочнике.`)
    return {
      storage: cleanStorage.id,
      ram: classified.proposedRam || model.ram || undefined,
      hasTouchId: classified.proposedHasTouchId || undefined,
    }
  }
  throw new Error(`Значение «${storage.value}» нельзя безопасно использовать при генерации вариантов.`)
}

const containerStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '4px',
  padding: '20px',
  marginBottom: '20px',
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  fontWeight: 600,
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '16px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 500,
  fontSize: '13px',
}

const checkboxGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
}

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  background: 'var(--theme-elevation-100)',
  borderRadius: '4px',
  fontSize: '13px',
  cursor: 'pointer',
}

const colorDotStyle = (hex: string): React.CSSProperties => ({
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  backgroundColor: hex,
  border: '1px solid rgba(0,0,0,0.15)',
  flexShrink: 0,
})

const buttonStyle: React.CSSProperties = {
  background: 'var(--theme-success-500)',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  marginRight: '8px',
}

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'var(--theme-elevation-200)',
  color: 'var(--theme-text)',
}

const infoStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--theme-elevation-100)',
  borderRadius: '4px',
  fontSize: '13px',
  color: 'var(--theme-elevation-500)',
}

const priceInputStyle: React.CSSProperties = {
  width: '120px',
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid var(--theme-elevation-200)',
  fontSize: '13px',
}

const bulkRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  marginBottom: '12px',
  flexWrap: 'wrap',
}

export default function VariantGenerator() {
  const deviceModelField = useFormFields((fields: Record<string, any>) => fields['deviceModel'])
  const variantsField = useField<GeneratedVariant[]>({ path: 'variants' })

  const [model, setModel] = useState<DeviceModelDoc | null>(null)
  const [allStorage, setAllStorage] = useState<StorageDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [generatorError, setGeneratorError] = useState('')

  const [selectedColors, setSelectedColors] = useState<Set<number>>(new Set())
  const [selectedStorage, setSelectedStorage] = useState<Set<number>>(new Set())
  const [selectedSizes, setSelectedSizes] = useState<Set<number>>(new Set())
  const [selectedSim, setSelectedSim] = useState<Set<number>>(new Set())

  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStatus, setBulkStatus] = useState('in_stock')

  const deviceModelId = deviceModelField?.value

  useEffect(() => {
    if (!deviceModelId) {
      setModel(null)
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all([
      fetch(`/api/device-models/${deviceModelId}?depth=2`).then((r) => r.json() as Promise<DeviceModelDoc>),
      fetch('/api/storage-options?limit=1000&depth=0&where[archived][not_equals]=true').then((r) => r.json() as Promise<{ docs?: StorageDoc[] }>),
    ])
      .then(([data, storageData]) => {
        if (cancelled) return
        setModel(data)
        setAllStorage((storageData.docs || []).filter((storage) => !storage.archived).filter((storage) => isAllowedStorageValue(storage.value)))
        setSelectedColors(new Set((data.availableColors || []).map((c) => c.id)))
        setSelectedStorage(new Set((data.availableStorage || []).filter((s) => !s.archived).filter((s) => isAllowedStorageValue(s.value)).map((s) => s.id)))
        setSelectedSizes(new Set((data.availableSizes || []).filter((s) => !s.archived).map((s) => s.id)))
        setSelectedSim(new Set((data.availableSim || []).map((s) => s.id)))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [deviceModelId])

  const toggleColor = useCallback((id: number) => {
    setSelectedColors((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleStorage = useCallback((id: number) => {
    setSelectedStorage((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSim = useCallback((id: number) => {
    setSelectedSim((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSize = useCallback((id: number) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const generateVariants = useCallback(() => {
    if (!model) return
    setGeneratorError('')

    const colors = (model.availableColors || []).filter((c) => selectedColors.has(c.id))
    const storages = (model.availableStorage || []).filter((s) => selectedStorage.has(s.id))
    const sizes = (model.availableSizes || []).filter((s) => selectedSizes.has(s.id) && !s.archived)
    const sims = (model.availableSim || []).filter((s) => selectedSim.has(s.id))

    const simList: (SimDoc | undefined)[] = sims.length > 0 ? sims : [undefined]
    const storageList = model.storageIsSize ? [undefined] : (storages.length > 0 ? storages : [undefined])
    const sizeList = model.storageIsSize ? (sizes.length > 0 ? sizes : [undefined]) : [undefined]
    const colorList = colors.length > 0 ? colors : [undefined]

    const variants: GeneratedVariant[] = []

    for (const sim of simList) {
      for (const color of colorList) {
        for (let i = 0; i < storageList.length; i++) {
          const storage = storageList[i]
          for (let j = 0; j < sizeList.length; j++) {
          const size = sizeList[j]
          const price = (model.basePrice || 0) + (model.priceStep || 0) * (model.storageIsSize ? j : i)

          let normalizedStorage: ReturnType<typeof normalizeGeneratedStorage>
          try {
            normalizedStorage = model.storageIsSize
              ? { size: size?.value, ram: model.ram || undefined }
              : normalizeGeneratedStorage(storage, model, allStorage)
          } catch (error) {
            setGeneratorError(error instanceof Error ? error.message : 'Не удалось нормализовать характеристики варианта.')
            return
          }

          variants.push({
            color: color?.id,
            ...normalizedStorage,
            sim: sim?.id,
            chip: model.chip || undefined,
            screenSize: model.screenSize || undefined,
            connectivity: model.connectivity || undefined,
            price,
            status: 'in_stock',
            isAvailable: true,
          })
          }
        }
      }
    }

    variantsField.setValue(variants)
  }, [model, allStorage, selectedColors, selectedStorage, selectedSizes, selectedSim, variantsField])

  const applyBulkPrice = useCallback(() => {
    const priceNum = Number(bulkPrice)
    if (!priceNum || !variantsField.value) return
    const updated = (variantsField.value as GeneratedVariant[]).map((v) => ({ ...v, price: priceNum }))
    variantsField.setValue(updated)
  }, [bulkPrice, variantsField])

  const applyBulkStatus = useCallback(() => {
    if (!variantsField.value) return
    const updated = (variantsField.value as GeneratedVariant[]).map((v) => ({
      ...v,
      status: bulkStatus,
      isAvailable: bulkStatus !== 'out_of_stock',
    }))
    variantsField.setValue(updated)
  }, [bulkStatus, variantsField])

  if (!deviceModelId) {
    return (
      <div style={containerStyle}>
        <h4 style={headingStyle}>Генератор вариантов</h4>
        <p style={infoStyle}>
          Выберите «Модель устройства» в боковой панели, чтобы активировать генератор.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <h4 style={headingStyle}>Генератор вариантов</h4>
        <p style={infoStyle}>Загрузка модели…</p>
      </div>
    )
  }

  if (!model) {
    return (
      <div style={containerStyle}>
        <h4 style={headingStyle}>Генератор вариантов</h4>
        <p style={infoStyle}>Модель не найдена.</p>
      </div>
    )
  }

  const colors = model.availableColors || []
  const storages = (model.availableStorage || []).filter((storage) => !storage.archived).filter((storage) => isAllowedStorageValue(storage.value))
  const sizes = (model.availableSizes || []).filter((size) => !size.archived)
  const sims = model.availableSim || []
  const totalCombinations =
    Math.max(selectedColors.size, 1) *
    Math.max(model.storageIsSize ? selectedSizes.size : selectedStorage.size, 1) *
    Math.max(selectedSim.size, 1)

  return (
    <div style={containerStyle}>
      <h4 style={headingStyle}>
        Генератор вариантов — {model.name}
      </h4>
      <p style={{ ...infoStyle, color: 'var(--theme-warning-500)' }}>
        Внимание: генератор может заменить текущие варианты товара. Используйте только при создании нового товара или после проверки.
      </p>

      {colors.length > 0 && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Цвета ({selectedColors.size} из {colors.length})</span>
          <div style={checkboxGridStyle}>
            {colors.map((c) => (
              <label key={c.id} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={selectedColors.has(c.id)}
                  onChange={() => toggleColor(c.id)}
                />
                <span style={colorDotStyle(c.primaryHex)} />
                {c.englishLabel}
              </label>
            ))}
          </div>
        </div>
      )}

      {(model.storageIsSize ? sizes.length > 0 : storages.length > 0) && (
        <div style={sectionStyle}>
          <span style={labelStyle}>
            {model.storageIsSize ? 'Размер корпуса' : 'Накопитель'} ({selectedStorage.size} из {storages.length})
          </span>
          <div style={checkboxGridStyle}>
            {(model.storageIsSize ? sizes : storages).map((s) => (
              <label key={s.id} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={model.storageIsSize ? selectedSizes.has(s.id) : selectedStorage.has(s.id)}
                  onChange={() => model.storageIsSize ? toggleSize(s.id) : toggleStorage(s.id)}
                />
                {s.value}
              </label>
            ))}
          </div>
        </div>
      )}

      {sims.length > 0 && (
        <div style={sectionStyle}>
          <span style={labelStyle}>SIM ({selectedSim.size} из {sims.length})</span>
          <div style={checkboxGridStyle}>
            {sims.map((s) => (
              <label key={s.id} style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={selectedSim.has(s.id)}
                  onChange={() => toggleSim(s.id)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" style={buttonStyle} onClick={generateVariants}>
          Сгенерировать {totalCombinations} вариант(ов)
        </button>
        <span style={{ fontSize: '13px', color: 'var(--theme-elevation-400)' }}>
          Заменит текущие варианты
        </span>
      </div>

      {generatorError && <p style={{ ...infoStyle, color: 'var(--theme-error-500)' }}>{generatorError}</p>}

      <hr style={{ border: 'none', borderTop: '1px solid var(--theme-elevation-150)', margin: '16px 0' }} />

      <h4 style={{ ...headingStyle, fontSize: '14px' }}>Массовое редактирование</h4>

      <div style={bulkRowStyle}>
        <label style={{ fontSize: '13px', fontWeight: 500 }}>Цена для всех:</label>
        <input
          type="number"
          style={priceInputStyle}
          placeholder="0"
          value={bulkPrice}
          onChange={(e) => setBulkPrice(e.target.value)}
        />
        <button type="button" style={secondaryButtonStyle} onClick={applyBulkPrice}>
          Применить цену
        </button>
      </div>

      <div style={bulkRowStyle}>
        <label style={{ fontSize: '13px', fontWeight: 500 }}>Статус для всех:</label>
        <select
          style={priceInputStyle}
          value={bulkStatus}
          onChange={(e) => setBulkStatus(e.target.value)}
        >
          <option value="in_stock">В наличии</option>
          <option value="preorder">Под заказ</option>
          <option value="out_of_stock">Нет в наличии</option>
        </select>
        <button type="button" style={secondaryButtonStyle} onClick={applyBulkStatus}>
          Применить статус
        </button>
      </div>
    </div>
  )
}
