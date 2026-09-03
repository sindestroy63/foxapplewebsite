'use client'

import React from 'react'
import Link from 'next/link'

import TradeInForm, { type FormState, type TradeInMedia } from './TradeInForm'
import { composeProductSlug, createSlugSuffix } from '../../utils/slugify'
import styles from './TradeInView.module.css'

type TradeInProduct = {
  id: number
  name: string
  slug: string
  price: number
  shortDescription?: string
  status?: string
  isAvailable?: boolean
  images?: TradeInMedia[] | number[]
}

const emptyForm = (): FormState => {
  const suffix = createSlugSuffix()

  return {
    name: '',
    slug: composeProductSlug('', suffix),
    price: '',
    shortDescription: '',
    status: 'in_stock',
    isAvailable: true,
    images: [],
  }
}

const toForm = (product: TradeInProduct): FormState => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  price: String(product.price),
  shortDescription: product.shortDescription || '',
  status: product.status || 'in_stock',
  isAvailable: product.isAvailable !== false,
  images: (product.images || []).map((image) => typeof image === 'number' ? image : image.id),
})

export default function TradeInView() {
  const [products, setProducts] = React.useState<TradeInProduct[]>([])
  const [media, setMedia] = React.useState<TradeInMedia[]>([])
  const [form, setForm] = React.useState<FormState | null>(null)
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    const [productsResponse, mediaResponse] = await Promise.all([
      fetch('/api/trade-in-products'),
      fetch('/api/media?limit=100&sort=-updatedAt'),
    ])

    if (!productsResponse.ok) throw new Error('Не удалось загрузить Trade-in товары.')

    const productData = await productsResponse.json()
    setProducts(productData.docs || [])

    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json()
      setMedia(mediaData.docs || [])
    }
  }, [])

  React.useEffect(() => {
    void load().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Ошибка загрузки.')
    })
  }, [load])

  const setName = (name: string) => setForm((current) => {
    if (!current) return current
    if (current.id) return { ...current, name }

    const suffix = current.slug.slice(-6)
    return { ...current, name, slug: composeProductSlug(name, suffix) }
  })

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form) return

    setBusy(true)
    setError('')

    try {
      const response = await fetch('/api/trade-in-products', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить Trade-in товар.')

      setForm(null)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Ошибка сохранения.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (product: TradeInProduct) => {
    if (!window.confirm(`Удалить Trade-in товар «${product.name}»?`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/trade-in-products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось удалить Trade-in товар.')
      await load()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Ошибка удаления.')
    } finally {
      setBusy(false)
    }
  }

  if (form) {
    return (
      <main className={styles.page}>
        <nav className="payload-breadcrumbs">
          <Link href="/admin">Панель</Link><span aria-hidden="true"> / </span>
          <button type="button" onClick={() => setForm(null)}>Trade-in</button>
        </nav>
        <TradeInForm
          form={form}
          media={media}
          error={error}
          busy={busy}
          onSubmit={save}
          onCancel={() => setForm(null)}
          onNameChange={setName}
          onChange={(changes) => setForm((current) => current ? { ...current, ...changes } : current)}
        />
      </main>
    )
  }

  return (
    <main className="price-update-tool">
      <nav className="payload-breadcrumbs"><Link href="/admin">Панель</Link><span aria-hidden="true"> / </span><span>Trade-in</span></nav>
      <div className="price-update-heading">
        <div>
          <h1>Trade-in</h1>
          <p>Б/У товары. Этот раздел использует коллекцию Products и не создаёт navigation records.</p>
        </div>
        <button className="primary" type="button" onClick={() => { setError(''); setForm(emptyForm()) }}>Добавить Trade-in товар</button>
      </div>
      {error && <p className="price-update-alert error">{error}</p>}
      {!products.length ? <p>Trade-in товаров пока нет.</p> : (
        <div className="price-update-table-wrap">
          <table>
            <thead><tr><th>Название</th><th>Цена</th><th>URL slug</th><th /></tr></thead>
            <tbody>{products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td><td>{product.price}</td><td><code>{product.slug}</code></td>
                <td><button type="button" onClick={() => { setError(''); setForm(toForm(product)) }}>Редактировать</button> <button type="button" disabled={busy} onClick={() => void remove(product)}>Удалить</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </main>
  )
}
