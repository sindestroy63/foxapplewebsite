'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { CatalogNavNode, NavGroup } from '@/lib/cms'
import type { BrandMenu } from '@/lib/brand-catalog-menu'

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

export function MobileMenu({ phone, navData: _navData, groupNavData: _groupNavData, catalogNavigation: _catalogNavigation, brandNavigation }: { phone: string; navData?: NavCategory[]; groupNavData?: NavGroup[]; catalogNavigation?: CatalogNavNode[]; brandNavigation?: BrandMenu[] }) {
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
        <div className="mobile-catalog-tree">{menu.map((brand) => brand.key === 'trade-in' ? <Link key={brand.key} href="/trade-in/catalog" onClick={close} className="mobile-nav-cat">TRADE-IN</Link> : <details key={brand.key} className="mobile-nav-group"><summary>{brand.label}</summary><Link href={brand.href} onClick={close} className="mobile-tree-open-link">Открыть раздел</Link>{brand.items.map((item) => <Link key={item.key} href={item.href} onClick={close} className="mobile-tree-link">{item.label}</Link>)}</details>)}</div>
        <span className="mobile-nav-heading mobile-nav-heading--secondary">Дополнительная информация</span>
        <div className="mobile-nav-secondary">{secondaryLinks.map((item) => <Link key={item.href} href={item.href} onClick={close}>{item.label}</Link>)}</div>
        <div className="mobile-nav-contact"><a className="mobile-nav-phone" href={`tel:${phone}`}>{phone}</a><a className="button small mobile-call-btn" href={`tel:${phone}`}>Позвонить</a></div>
      </nav>
    </div>}
  </>
}
