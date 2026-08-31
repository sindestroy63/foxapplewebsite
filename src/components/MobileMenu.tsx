'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CatalogNavNode, NavGroup } from '@/lib/cms'
type NavCategory = { slug: string; name: string; products: { model: string; slug: string; badge?: string | null }[] }
const secondaryLinks = [{ href: '/installment', label: 'Рассрочка' }, { href: '/trade-in', label: 'Trade-In' }, { href: '/warranty', label: 'Гарантия и возврат' }, { href: '/repair', label: 'Ремонт' }, { href: '/contacts', label: 'Контакты' }]
function MobileNode({ node, close, level = 0 }: { node: CatalogNavNode; close: () => void; level?: number }) {
  const badge = node.isNew && <small className="nav-new-badge">{node.badgeText || 'Новинка'}</small>
  if (!node.children.length) return <div className={`mobile-tree-leaf mobile-tree-level-${level}`}><Link href={node.href} onClick={close} className="mobile-tree-link"><span>{node.title}</span>{badge}</Link></div>
  return <details className={`mobile-tree-level mobile-tree-level-${level}`}><summary><span>{node.title}</span>{badge}</summary><Link href={node.href} onClick={close} className="mobile-tree-open-link">Открыть раздел</Link>{node.children.map((child) => <MobileNode key={child.id} node={child} close={close} level={level + 1} />)}</details>
}
export function MobileMenu({ phone, navData: _navData, groupNavData, catalogNavigation }: { phone: string; navData?: NavCategory[]; groupNavData?: NavGroup[]; catalogNavigation?: CatalogNavNode[] }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])
  const close = () => setOpen(false)
  return <><button className="burger-btn" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} onClick={() => setOpen(!open)}><span className={`burger-icon ${open ? 'open' : ''}`} /></button>{open && <div className="mobile-overlay" onClick={close}><nav className="mobile-nav" onClick={(e) => e.stopPropagation()} aria-label="Мобильная навигация"><button className="mobile-nav-close" aria-label="Закрыть меню" onClick={close}>×</button>{catalogNavigation?.length ? <div className="mobile-catalog-tree">{catalogNavigation.map((node) => <MobileNode key={node.id} node={node} close={close} />)}</div> : groupNavData?.map((group) => <div key={group.slug} className="mobile-nav-group"><Link href={`/catalog?group=${group.slug}`} onClick={close} className="mobile-nav-cat">{group.name}</Link></div>)}<span className="mobile-nav-heading mobile-nav-heading--secondary">Дополнительная информация</span><div className="mobile-nav-secondary">{secondaryLinks.map((item) => <Link key={item.href} href={item.href} onClick={close}>{item.label}</Link>)}</div><div className="mobile-nav-contact"><a className="mobile-nav-phone" href={`tel:${phone}`}>{phone}</a><a className="button small mobile-call-btn" href={`tel:${phone}`}>Позвонить</a></div></nav></div>}</>
}
