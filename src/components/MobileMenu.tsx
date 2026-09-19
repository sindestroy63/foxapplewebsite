'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { CatalogNavNode, NavGroup } from '@/lib/cms'
import type { BrandMenu } from '@/lib/brand-catalog-menu'
import { telegramLinkProps } from '@/lib/format'
import type { SiteSettings } from '@/lib/types'

type NavCategory = { slug: string; name: string; products: { model: string; slug: string; badge?: string | null }[] }

const secondaryLinks = [
  { href: '/installment', label: 'Рассрочка' },
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/repair', label: 'Ремонт' },
  { href: '/contacts', label: 'Контакты' },
]

function MobileNode({ node, close, level = 0 }: { node: CatalogNavNode; close: () => void; level?: number }) {
  const badge = node.isNew && <small className="nav-new-badge">{node.badgeText || 'Новинка'}</small>

  if (!node.children.length) {
    return <div className={`mobile-tree-leaf mobile-tree-level-${level}`}><Link href={node.href} onClick={close} className="mobile-tree-link"><span>{node.title}</span>{badge}</Link></div>
  }

  return <details className={`mobile-tree-level mobile-tree-level-${level}`}><summary><span>{node.title}</span>{badge}</summary><Link href={node.href} onClick={close} className="mobile-tree-open-link">Открыть раздел</Link>{node.children.map((child) => <MobileNode key={child.id} node={child} close={close} level={level + 1} />)}</details>
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
        <button className="mobile-nav-close" aria-label="Закрыть меню" onClick={close}>×</button>
        <form className="catalog-search mobile-catalog-search" action="/catalog" method="get">
          <label className="sr-only" htmlFor="mobile-search-input">Поиск товаров</label>
          <input id="mobile-search-input" name="q" placeholder="Найти товар" type="search" />
          <button className="button" type="submit">Найти</button>
        </form>
        <div className="mobile-catalog-tree">{menu.map((brand) => brand.key === 'trade-in' ? <Link key={brand.key} href="/trade-in/catalog" onClick={close} className="mobile-nav-cat">TRADE-IN</Link> : <details key={brand.key} className="mobile-nav-group"><summary>{brand.label}{brand.isNew && <small className="nav-new-badge">Новинка</small>}</summary>{brand.items.map((item) => item.products?.length ? <details key={item.key} className="mobile-tree-level mobile-tree-level-1"><summary><span>{item.label}</span>{item.isNew && <small className="nav-new-badge">Новинка</small>}</summary><Link href={item.href} onClick={close} className="mobile-tree-open-link">Открыть раздел</Link>{item.products.map((product) => <Link key={product.id} href={product.href} onClick={close} className="mobile-tree-link mobile-tree-level-2"><span>{product.name}</span>{product.isNew && <small className="nav-new-badge">Новинка</small>}</Link>)}</details> : <Link key={item.key} href={item.href} onClick={close} className="mobile-tree-link"><span>{item.label}</span>{item.isNew && <small className="nav-new-badge">Новинка</small>}</Link>)}</details>)}</div>
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
    </div>}
  </>
}
