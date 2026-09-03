'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CatalogNavNode } from '@/lib/cms'
import type { BrandMenu } from '@/lib/brand-catalog-menu'

const PANEL_WIDTH = 252
const PRODUCT_PANEL_WIDTH = 320
const SAFE_GUTTER = 20
const CLOSE_DELAY = 220

const Badge = ({ node }: { node: CatalogNavNode }) => node.isNew
  ? <small className="nav-new-badge">{node.badgeText || 'Новинка'}</small>
  : null

type Direction = 'right' | 'left'

export function DesktopCatalogMenu({ nodes, trailingLink, brandMenu }: { nodes: CatalogNavNode[]; trailingLink?: { href: string; label: string }; brandMenu?: BrandMenu[] }) {
  const groups = nodes.filter((node) => node.kind === 'group')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeGroup, setActiveGroup] = useState<CatalogNavNode | null>(null)
  const [activeBrand, setActiveBrand] = useState<CatalogNavNode | null>(null)
  const [activeGroupLine, setActiveGroupLine] = useState<CatalogNavNode | null>(null)
  const [activeLine, setActiveLine] = useState<CatalogNavNode | null>(null)
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 })
  const [direction, setDirection] = useState<Direction>('right')

  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const closeMenu = () => { cancelClose(); setActiveGroup(null); setActiveBrand(null); setActiveGroupLine(null); setActiveLine(null) }
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(closeMenu, CLOSE_DELAY) }
  useEffect(() => () => cancelClose(), [])

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !flyoutRef.current?.contains(target)) closeMenu()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])

  const positionRoot = (target: HTMLElement) => {
    const triggerRect = target.getBoundingClientRect()
    const chainWidth = PANEL_WIDTH + PANEL_WIDTH + PRODUCT_PANEL_WIDTH
    const viewportRight = window.innerWidth - SAFE_GUTTER
    const viewportLeft = SAFE_GUTTER
    const rightFits = triggerRect.left + chainWidth <= viewportRight
    const leftFits = triggerRect.right - chainWidth >= viewportLeft
    const nextDirection: Direction = rightFits || !leftFits ? 'right' : 'left'
    const desired = nextDirection === 'left' ? triggerRect.right - PANEL_WIDTH : triggerRect.left
    const min = viewportLeft
    const max = viewportRight - PANEL_WIDTH
    setDirection(nextDirection)
    setPanelPosition({ top: triggerRect.bottom, left: Math.max(min, Math.min(desired, max)) })
  }

  const openGroup = (group: CatalogNavNode, target: HTMLElement) => { cancelClose(); triggerRef.current = target; setActiveGroup(group); setActiveBrand(null); setActiveGroupLine(null); setActiveLine(null); positionRoot(target) }
  const openBrand = (brand: CatalogNavNode) => { cancelClose(); setActiveBrand(brand); setActiveGroupLine(null); setActiveLine(null) }
  const openGroupLine = (line: CatalogNavNode) => { cancelClose(); setActiveGroupLine(line); setActiveBrand(null); setActiveLine(null) }
  const openLine = (line: CatalogNavNode) => { cancelClose(); setActiveLine(line) }

  useLayoutEffect(() => {
    if (!activeGroup || !rootRef.current) return
    const trigger = triggerRef.current || rootRef.current.querySelector<HTMLElement>(`[data-group-id="${activeGroup.id}"]`)
    if (trigger) positionRoot(trigger)
  }, [activeGroup])

  useEffect(() => {
    if (!activeGroup) return
    const reposition = () => { const trigger = triggerRef.current || rootRef.current?.querySelector<HTMLElement>(`[data-group-id="${activeGroup.id}"]`); if (trigger) positionRoot(trigger) }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => { window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true) }
  }, [activeGroup])

  const brands = activeGroup?.children.filter((node) => node.kind === 'brand') || []
  const directLines = activeGroup?.children.filter((node) => node.kind === 'line') || []
  const directProducts = activeGroup?.children.filter((node) => node.kind === 'product') || []
  const secondLevel = activeBrand || activeGroupLine
  const lines = activeBrand?.children.filter((node) => node.kind === 'line') || []
  const brandProducts = activeBrand?.children.filter((node) => node.kind === 'product') || []
  const lineProducts = activeGroupLine?.children.filter((node) => node.kind === 'product') || []
  const products = activeLine?.children.filter((node) => node.kind === 'product') || []

  const renderItem = (item: CatalogNavNode, onOpen?: () => void, active = false) => (
    <Link key={item.id} href={item.href} role="menuitem" className={`catalog-flyout-link${active ? ' is-active' : ''}`} aria-haspopup={item.children.length ? 'menu' : undefined} aria-expanded={item.children.length ? active : undefined} onPointerEnter={onOpen} onFocus={onOpen}>
      <span>{item.title}</span><Badge node={item}/>{item.children.length > 0 && <span className="flyout-chevron" aria-hidden="true">›</span>}
    </Link>
  )

  const flyout = activeGroup && <div ref={flyoutRef} className={`catalog-flyout catalog-flyout--level-1 catalog-flyout--portal desktop-catalog-nav--${direction}`} style={{ top: panelPosition.top, left: panelPosition.left }} role="menu" aria-label={activeGroup.title} onPointerEnter={cancelClose} onPointerLeave={(event) => { const next = event.relatedTarget as Node | null; if (!next || (!flyoutRef.current?.contains(next) && !triggerRef.current?.contains(next))) scheduleClose() }}>
    <div className="catalog-flyout-list">{[...brands, ...directLines, ...directProducts].map((item) => renderItem(item, item.kind === 'brand' ? () => openBrand(item) : item.kind === 'line' ? () => openGroupLine(item) : cancelClose, activeBrand?.id === item.id || activeGroupLine?.id === item.id))}</div>
    {secondLevel && (lines.length || brandProducts.length || lineProducts.length) > 0 && <div className="catalog-flyout catalog-flyout--child catalog-flyout--level-2" role="menu" aria-label={secondLevel.title}>
      <div className="catalog-flyout-list">{(activeGroupLine ? lineProducts : (lines.length ? lines : brandProducts)).map((item) => renderItem(item, item.kind === 'line' ? () => openLine(item) : cancelClose, activeLine?.id === item.id))}</div>
      {activeLine && products.length > 0 && <div className="catalog-flyout catalog-flyout--child catalog-flyout--level-3" role="menu" aria-label={activeLine.title}><div className="catalog-flyout-list">{products.map((item) => renderItem(item, cancelClose))}</div></div>}
    </div>}
  </div>

  return <div ref={rootRef} className={`desktop-catalog-nav desktop-catalog-nav--${direction}`} onPointerEnter={cancelClose} onPointerLeave={(event) => { const next = event.relatedTarget as Node | null; if (!next || (!rootRef.current?.contains(next) && !flyoutRef.current?.contains(next))) scheduleClose() }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closeMenu() } }}>
    <div className="desktop-catalog-groups">{brandMenu ? brandMenu.map((brand) => <div key={brand.label} className="nav-dropdown"><Link href={brand.href} className="nav-dropdown-trigger">{brand.label}{brand.items.length > 0 && <span className="nav-arrow" aria-hidden="true">›</span>}</Link>{brand.items.length > 0 && <div className="nav-dropdown-menu">{brand.items.map((item) => <Link key={item.href + item.label} href={item.href}>{item.label}</Link>)}</div>}</div>) : groups.map((group) => <Link key={group.id} data-group-id={group.id} href={group.href} className="nav-dropdown-trigger" aria-haspopup={group.children.length ? 'menu' : undefined} aria-expanded={activeGroup?.id === group.id} onPointerEnter={(event) => openGroup(group, event.currentTarget)} onFocus={(event) => openGroup(group, event.currentTarget)}><span>{group.title}</span><Badge node={group}/>{group.children.length > 0 && <span className="nav-arrow" aria-hidden="true">›</span>}</Link>)}{trailingLink && <Link href={trailingLink.href} className="nav-dropdown-trigger">{trailingLink.label}</Link>}</div>
    {typeof document !== 'undefined' && flyout ? createPortal(flyout, document.body) : null}
  </div>
}
