'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Suggestion = { id: string | number; name: string; href: string; price?: number; thumbnail?: { url: string; width: number; height: number }; configuration?: string; available?: boolean }

export function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)
  const imageCache = useRef(new Set<string>())

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const value = query.trim()
    if (value.length < 2) { setItems([]); setLoading(false); return }
    const requestId = ++requestRef.current
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/catalog-search?q=${encodeURIComponent(value)}`, { signal: controller.signal })
        const next = response.ok ? await response.json() as Suggestion[] : []
        if (requestId === requestRef.current) { setItems(next); setActive(-1) }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') throw error
      } finally {
        if (requestId === requestRef.current) setLoading(false)
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query])
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const submit = (event: React.FormEvent) => {
    if (active >= 0 && items[active]) {
      event.preventDefault()
      window.location.href = items[active].href
    }
    setOpen(false)
  }

  return <div className="header-search-wrap" ref={ref}>
    <form className="header-search" action="/catalog" method="get" onSubmit={submit}>
      <label className="sr-only" htmlFor="header-search-input">Поиск товаров</label>
      <input ref={inputRef} id="header-search-input" name="q" placeholder="Поиск товаров" type="search" value={query} aria-expanded={open} aria-controls="header-search-results" aria-autocomplete="list" onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((current) => Math.min(current + 1, items.length - 1)) }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)) }
      }} />
      <span className="header-search-shortcut" aria-hidden="true">⌘ K</span>
      <button aria-label="Найти товары" type="submit">⌕</button>
    </form>
    {open && <div className="header-search-dropdown" id="header-search-results" role="listbox">
       {query.trim().length < 2 ? <div className="header-search-start"><strong>Популярные категории</strong><div>{['/catalog', '/catalog?group=smartphones', '/catalog?group=laptops', '/catalog?group=audio'].map((href, index) => <Link key={href} href={href} onClick={() => setOpen(false)}>{['Каталог', 'Смартфоны', 'Ноутбуки', 'Аудио'][index]}</Link>)}</div></div> : loading ? <div className="header-search-status">Ищем товары…</div> : items.length ? <>{items.map((item, index) => <Link key={item.id} role="option" aria-selected={index === active} className={index === active ? 'is-active' : ''} href={item.href} onClick={() => setOpen(false)}><span className="header-search-thumb">{item.thumbnail ? <img src={item.thumbnail.url} width={item.thumbnail.width} height={item.thumbnail.height} loading={index < 2 ? 'eager' : 'lazy'} alt="" onLoad={(event) => { imageCache.current.add(item.thumbnail!.url); event.currentTarget.classList.add('is-loaded') }} /> : null}</span><span className="header-search-result-copy"><strong>{item.name}</strong>{item.configuration && <small>{item.configuration}</small>}<small>{item.available === false ? 'Под заказ' : 'В наличии'}</small></span>{item.price ? <b>от {item.price.toLocaleString('ru-RU')} ₽</b> : null}</Link>)}<Link className="header-search-all" href={`/catalog?q=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>Показать все результаты →</Link></> : <div className="header-search-status">Ничего не найдено</div>}
    </div>}
  </div>
}