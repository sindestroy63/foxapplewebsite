'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { CatalogNavNode, NavGroup } from '@/lib/cms'
import type { BrandMenu, BrandMenuItem } from '@/lib/brand-catalog-menu'
import type { MenuProduct } from '@/lib/menu-series'
import { telegramLinkProps } from '@/lib/format'
import type { SiteSettings } from '@/lib/types'

type NavCategory = { slug: string; name: string; products: { model: string; slug: string; badge?: string | null }[] }

const secondaryLinks = [
  { href: '/installment', label: 'Рассрочка' },
  { href: '/compare', label: 'Сравнение' },
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/contacts', label: 'Контакты' },
]

function MobileNode({ node, close, level = 0 }: { node: CatalogNavNode; close: () => void; level?: number }) {
  const badge = node.isNew && <small className="nav-new-badge">{node.badgeText || 'Новинка'}</small>

  if (!node.children.length) {
    return <div className={`mobile-tree-leaf mobile-tree-level-${level}`}><Link href={node.href} onClick={close} className="mobile-tree-link"><span>{node.title}</span>{badge}</Link></div>
  }

  return <details className={`mobile-tree-level mobile-tree-level-${level}`}><summary><span>{node.title}</span>{badge}</summary><Link href={node.href} onClick={close} className="mobile-tree-open-link">Открыть раздел</Link>{node.children.map((child) => <MobileNode key={child.id} node={child} close={close} level={level + 1} />)}</details>
}

function MobileProduct({ product, close }: { product: MenuProduct; close: () => void }) {
  return <Link href={product.href} onClick={close} className="mobile-tree-link mobile-tree-level-2"><span>{product.name}</span>{product.isNew && <small className="nav-new-badge">Новинка</small>}</Link>
}

function MobileItem({ item, close }: { item: BrandMenuItem; close: () => void }) {
  const series = item.series || []
  const grouped = new Set(series.flatMap((entry) => entry.products.map((product) => String(product.id))))
  const loose = (item.products || []).filter((product) => !grouped.has(String(product.id)))
  const badge = item.isNew ? <small className="nav-new-badge">Новинка</small> : null

  if (series.length === 0 && loose.length === 0) {
    return <Link href={item.href} onClick={close} className="mobile-tree-link"><span>{item.label}</span>{badge}</Link>
  }

  return (
    <details className="mobile-tree-level mobile-tree-level-1">
      <summary><span>{item.label}</span>{badge}</summary>
      <Link href={item.href} onClick={close} className="mobile-tree-open-link">Открыть раздел</Link>
      {series.map((entry) => (
        <details key={entry.key} className="mobile-tree-level mobile-tree-level-2 mobile-tree-series">
          <summary><span>{entry.label}</span></summary>
          {entry.products.map((product) => <MobileProduct key={product.id} product={product} close={close} />)}
        </details>
      ))}
      {loose.map((product) => <MobileProduct key={product.id} product={product} close={close} />)}
    </details>
  )
}

export function MobileMenu({ phone, settings, navData: _navData, groupNavData: _groupNavData, catalogNavigation: _catalogNavigation, brandNavigation }: { phone: string; settings: SiteSettings; navData?: NavCategory[]; groupNavData?: NavGroup[]; catalogNavigation?: CatalogNavNode[]; brandNavigation?: BrandMenu[] }) {
  const [open, setOpen] = useState(false)
  const menu = brandNavigation || []

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => setOpen(false)

  return <>
    <button className="burger-btn" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} onClick={() => setOpen(!open)}><span className={`burger-icon ${open ? 'open' : ''}`} /></button>
    {open && <div className="mobile-overlay" onClick={close}>
      <nav className="mobile-nav" onClick={(event) => event.stopPropagation()} aria-label="Мобильная навигация">
        <form className="catalog-search mobile-catalog-search" action="/catalog" method="get">
          <label className="sr-only" htmlFor="mobile-search-input">Поиск товаров</label>
          <input id="mobile-search-input" name="q" placeholder="Найти товар" type="search" />
          <button className="button" type="submit">Найти</button>
        </form>
        <div className="mobile-catalog-tree">{menu.map((brand) => brand.key === 'trade-in' ? <Link key={brand.key} href="/trade-in/catalog" onClick={close} className="mobile-nav-cat">TRADE-IN</Link> : <details key={brand.key} className="mobile-nav-group"><summary><span className="mobile-brand-title">{brand.label}</span>{brand.isNew && <small className="nav-new-badge">Новинка</small>}</summary>{brand.items.map((item) => <MobileItem key={item.key} item={item} close={close} />)}{brand.items.length > 0 && <Link href={brand.href} onClick={close} className="mobile-tree-link"><span>Все товары</span></Link>}</details>)}</div>
        <span className="mobile-nav-heading mobile-nav-heading--secondary">Дополнительная информация</span>
        <div className="mobile-nav-secondary">{secondaryLinks.map((item) => <Link key={item.href} href={item.href} onClick={close}>{item.label}</Link>)}</div>
        <div className="mobile-nav-contact">
          <span className="mobile-nav-address">{settings.address}</span>
          <span className="mobile-nav-hours">{settings.workTime}</span>
          <a {...telegramLinkProps(settings.telegramUsername)}>{settings.telegramUsername}</a>
          <a href={settings.telegramChannelUrl} rel="noreferrer" target="_blank">Telegram-канал</a>
          <a className="mobile-nav-phone" href={`tel:${phone}`}>{phone}</a>
          <a className="button small mobile-call-btn" href={`tel:${phone}`}>Позвонить</a>
        </div>
      </nav>
      <span className="mobile-nav-brand" aria-hidden="true">ФОХСТОР.РФ</span>
    </div>}
  </>
}
