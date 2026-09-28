'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Suggestion = { id: string | number; name: string; href: string; price?: number; image?: string }

export function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const value = query.trim()
    if (!value) { setItems([]); return }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/catalog-search?q=${encodeURIComponent(value)}`)
      if (response.ok) setItems(await response.json())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return <div className="header-search-wrap" ref={ref}>
    <form className="header-search" action="/catalog" method="get" onSubmit={() => setOpen(false)}>
      <label className="sr-only" htmlFor="header-search-input">Поиск товаров</label>
      <input id="header-search-input" name="q" placeholder="Поиск товаров" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }} />
      <button aria-label="Найти товары" type="submit">⌕</button>
    </form>
    {open && items.length > 0 && <div className="header-search-dropdown">{items.map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)}><span>{item.name}</span>{item.price ? <strong>от {item.price.toLocaleString('ru-RU')} ₽</strong> : null}</Link>)}<Link className="header-search-all" href={`/catalog?q=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>Показать все результаты</Link></div>}
  </div>
}