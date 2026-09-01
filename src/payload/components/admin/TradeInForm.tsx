'use client'

import React from 'react'

import styles from './TradeInView.module.css'

export type TradeInMedia = { id: number; filename?: string; url?: string; alt?: string }

export type FormState = {
  id?: number
  name: string
  slug: string
  price: string
  shortDescription: string
  status: string
  isAvailable: boolean
  images: number[]
}

type Props = {
  form: FormState
  media: TradeInMedia[]
  error: string
  busy: boolean
  onSubmit: (event: React.FormEvent) => void
  onCancel: () => void
  onNameChange: (name: string) => void
  onChange: (changes: Partial<FormState>) => void
}

const mediaLabel = (image: TradeInMedia) => image.filename || `Media #${image.id}`

export default function TradeInForm({ form, media, error, busy, onSubmit, onCancel, onNameChange, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const selectedMedia = form.images
    .map((id) => media.find((image) => image.id === id))
    .filter((image): image is TradeInMedia => Boolean(image))

  const toggleImage = (id: number) => {
    onChange({ images: form.images.includes(id) ? form.images.filter((imageId) => imageId !== id) : [...form.images, id] })
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <header className={styles.formHeader}>
        <div>
          <h1>{form.id ? 'Редактирование Trade-in товара' : 'Добавить Trade-in товар'}</h1>
          <p>Товар будет сохранён как Б/У в Trade-in.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Отмена</button>
          <button className="primary" disabled={busy} type="submit">{busy ? 'Сохранение...' : 'Сохранить'}</button>
        </div>
      </header>

      {error && <p className="price-update-alert error" role="alert">{error}</p>}

      <section className={styles.section} aria-labelledby="trade-in-main">
        <h2 id="trade-in-main">Основное</h2>
        <div className={styles.fieldGrid}>
          <label className={styles.wideField}>
            <span>Название</span>
            <input required value={form.name} onChange={(event) => onNameChange(event.target.value)} />
          </label>
          <label>
            <span>URL slug</span>
            <input className={styles.readOnlyInput} readOnly aria-readonly="true" value={form.slug} />
          </label>
          <label>
            <span>Цена</span>
            <input required min="0" type="number" value={form.price} onChange={(event) => onChange({ price: event.target.value })} />
          </label>
          <label className={styles.wideField}>
            <span>Краткое описание</span>
            <textarea rows={5} value={form.shortDescription} onChange={(event) => onChange({ shortDescription: event.target.value })} />
          </label>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="trade-in-sale">
        <h2 id="trade-in-sale">Продажа</h2>
        <div className={styles.fieldGrid}>
          <label>
            <span>Статус</span>
            <select value={form.status} onChange={(event) => onChange({ status: event.target.value })}>
              <option value="in_stock">В наличии</option>
              <option value="preorder">Под заказ</option>
              <option value="out_of_stock">Нет в наличии</option>
            </select>
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" checked={form.isAvailable} onChange={(event) => onChange({ isAvailable: event.target.checked })} />
            <span>Показывать на сайте</span>
          </label>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="trade-in-media">
        <div className={styles.sectionHeading}>
          <div><h2 id="trade-in-media">Фотографии</h2><p>Выберите один или несколько файлов из существующей медиатеки.</p></div>
          <button type="button" className={styles.secondaryButton} onClick={() => setPickerOpen((open) => !open)}>
            {pickerOpen ? 'Закрыть выбор' : 'Выбрать фото'}
          </button>
        </div>
        {selectedMedia.length ? (
          <div className={styles.selectedMedia}>
            {selectedMedia.map((image) => (
              <article className={styles.mediaCard} key={image.id}>
                {image.url ? <img src={image.url} alt={image.alt || mediaLabel(image)} /> : <div className={styles.mediaPlaceholder}>Нет превью</div>}
                <div><span title={mediaLabel(image)}>{mediaLabel(image)}</span><button type="button" onClick={() => toggleImage(image.id)}>Удалить</button></div>
              </article>
            ))}
          </div>
        ) : <p className={styles.muted}>Фотографии пока не выбраны.</p>}
        {pickerOpen && (
          <div className={styles.mediaPicker} aria-label="Медиатека">
            {media.map((image) => {
              const selected = form.images.includes(image.id)
              return (
                <button key={image.id} type="button" className={`${styles.mediaOption} ${selected ? styles.mediaOptionSelected : ''}`} aria-pressed={selected} onClick={() => toggleImage(image.id)}>
                  {image.url ? <img src={image.url} alt="" /> : <span className={styles.mediaPlaceholder}>Нет превью</span>}
                  <span title={mediaLabel(image)}>{mediaLabel(image)}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="trade-in-extra">
        <h2 id="trade-in-extra">Дополнительно</h2>
        <p className={styles.muted}>Группа товара и состояние фиксируются автоматически: Trade-in, Б/У. Размещение в обычном каталоге не используется.</p>
      </section>

      <div className={styles.bottomActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Отмена</button>
        <button className="primary" disabled={busy} type="submit">{busy ? 'Сохранение...' : 'Сохранить'}</button>
      </div>
    </form>
  )
}
