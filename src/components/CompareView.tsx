'use client'

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react'

import { CompareGlyph } from '@/components/CompareGlyph'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { useCompare } from '@/contexts/CompareContext'
import { COMPARE_LIMIT, buildCompareRows, type CompareItem } from '@/lib/compare'
import { formatPrice } from '@/lib/format'

export function CompareView() {
  const { ids, ready, remove, clear, replace } = useCompare()
  const [items, setItems] = useState<CompareItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [onlyDifferent, setOnlyDifferent] = useState(false)
  const key = ids.join(',')

  useEffect(() => {
    if (!ready) return
    if (!key) {
      setItems([])
      setFailed(false)
      setLoaded(true)
      return
    }
    const controller = new AbortController()
    fetch(`/api/compare?ids=${key}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('compare')
        return response.json() as Promise<CompareItem[]>
      })
      .then((data) => {
        setItems(data)
        setFailed(false)
        setLoaded(true)
        if (data.length !== key.split(',').length) replace(data.map((item) => item.id))
      })
      .catch((error: Error) => {
        if (error.name === 'AbortError') return
        setFailed(true)
        setLoaded(true)
      })
    return () => controller.abort()
  }, [key, ready, replace])

  const visible = useMemo(
    () => ids.map((id) => items.find((item) => item.id === id)).filter((item): item is CompareItem => Boolean(item)),
    [ids, items],
  )
  const rows = useMemo(() => buildCompareRows(visible), [visible])
  const shownRows = onlyDifferent ? rows.filter((row) => row.different) : rows

  const prices = visible.filter((item) => item.available && item.price > 0).map((item) => item.price)
  const lowest = prices.length > 1 && new Set(prices).size > 1 ? Math.min(...prices) : null

  if (!ready || !loaded) {
    return <p className="compare-status">Загружаем сравнение…</p>
  }

  if (ids.length === 0) {
    return (
      <div className="compare-empty">
        <span className="compare-empty__icon">
          <CompareGlyph size={30} />
        </span>
        <h1>Сравнение пока пустое</h1>
        <p>Нажмите значок весов на фото товара, чтобы добавить его сюда. Можно сравнить до {COMPARE_LIMIT} товаров.</p>
        <Link className="button" href="/catalog">
          Перейти в каталог
        </Link>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="compare-empty">
        <h1>Не удалось загрузить сравнение</h1>
        <p>Проверьте соединение и попробуйте ещё раз.</p>
        <button className="button" type="button" onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </div>
    )
  }

  return (
    <div className="compare-page">
      <div className="compare-head">
        <div>
          <h1>Сравнение</h1>
          <p className="compare-count">
            {visible.length} из {COMPARE_LIMIT} товаров
          </p>
        </div>
        <div className="compare-tools">
          {visible.length > 1 && rows.length > 0 && (
            <label className="compare-switch">
              <input type="checkbox" checked={onlyDifferent} onChange={(event) => setOnlyDifferent(event.target.checked)} />
              <span className="compare-switch__track" aria-hidden="true" />
              <span>Только различия</span>
            </label>
          )}
          {visible.length < COMPARE_LIMIT && (
            <Link className="button small secondary" href="/catalog">
              Добавить товар
            </Link>
          )}
          <button className="compare-clear" type="button" onClick={clear}>
            Очистить
          </button>
        </div>
      </div>

      {visible.length === 1 && <p className="compare-hint">Добавьте ещё один товар, и мы покажем, чем они отличаются.</p>}

      <div className="compare-scroll">
        <div className="compare-grid" style={{ '--compare-cols': visible.length } as CSSProperties}>
          {visible.map((item) => (
            <article className="compare-card" key={item.id}>
              <button
                type="button"
                className="compare-card__remove"
                onClick={() => remove(item.id)}
                aria-label={`Убрать из сравнения: ${item.name}`}
              >
                ✕
              </button>
              <Link href={item.href} className="compare-card__media" aria-label={item.name}>
                {item.image ? <ImageWithFallback src={item.image} alt={item.imageAlt} /> : <span className="image-placeholder" aria-hidden="true" />}
              </Link>
              <Link href={item.href} className="compare-card__name">
                {item.name}
              </Link>
              <div className="compare-card__price">
                <strong>
                  {item.priceFrom ? 'от ' : ''}
                  {formatPrice(item.price)}
                </strong>
                {lowest !== null && item.price === lowest && <span className="compare-card__best">ниже всех</span>}
              </div>
              <span className={`compare-card__status${item.available ? '' : ' compare-card__status--off'}`}>
                {item.available ? item.statusLabel : 'Нет в наличии'}
              </span>
              <Link href={item.href} className="button small compare-card__open">
                Выбрать
              </Link>
            </article>
          ))}

          {shownRows.map((row) => (
            <Fragment key={row.key}>
              <div className="compare-row-label">
                <span>{row.label}</span>
                {row.different && <em>отличается</em>}
              </div>
              {visible.map((item, index) => (
                <div className={`compare-cell${row.different ? ' compare-cell--diff' : ''}`} key={item.id}>
                  {row.values[index].length ? row.values[index].join(', ') : '—'}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {rows.length === 0 && <p className="compare-hint">Характеристики этих товаров пока не заполнены.</p>}
      {rows.length > 0 && shownRows.length === 0 && <p className="compare-hint">Все характеристики у выбранных товаров совпадают.</p>}
    </div>
  )
}
