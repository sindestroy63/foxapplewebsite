import Link from 'next/link'

import { BrandWordmark } from '@/components/BrandWordmark'
import { CartIcon } from '@/components/CartIcon'
import { MobileMenu } from '@/components/MobileMenu'
import { DesktopCatalogMenu } from '@/components/DesktopCatalogMenu'
import { normalizePhone } from '@/lib/format'
import type { CatalogNavNode, NavCategory, NavGroup } from '@/lib/cms'
import type { SiteSettings } from '@/lib/types'
import type { BrandMenu } from '@/lib/brand-catalog-menu'

const secondaryNav = [
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/repair', label: 'Ремонт' },
  { href: '/contacts', label: 'Контакты' },
]

function DesktopNode({ node }: { node: CatalogNavNode }) {
  return <div className="nav-dropdown nav-tree-node">
    <Link href={node.href} className="nav-dropdown-trigger">{node.title}{node.isNew && <small className="nav-new-badge">{node.badgeText || 'Новинка'}</small>}{node.children.length > 0 && <span className="nav-arrow">›</span>}</Link>
    {node.children.length > 0 && <div className="nav-dropdown-menu nav-tree-menu">{node.children.map((child) => <DesktopNode key={child.id} node={child} />)}</div>}
  </div>
}

export function Header({ settings, navData, groupNavData, brandNavigation }: { settings: SiteSettings; navData?: NavCategory[]; groupNavData?: NavGroup[]; brandNavigation?: Array<{ title: string; key: string; href?: string; isVisible?: boolean; sortOrder?: number; coverImage?: import('@/lib/types').Media | null; children?: Array<{ title: string; key: string; href?: string; isVisible?: boolean; sortOrder?: number; coverImage?: import('@/lib/types').Media | null }> }> }) {
  const phone = settings.phone || '+7 (917) 954-64-64'
  const brandMenu: BrandMenu[] = (brandNavigation || []).map((group) => ({
    label: group.title, key: group.key, href: group.href || '/catalog', isVisible: group.isVisible, sortOrder: group.sortOrder, coverImage: group.coverImage,
    items: (group.children || []).map((child) => ({ label: child.title, key: child.key, href: child.href || '/catalog', isVisible: child.isVisible, sortOrder: child.sortOrder, coverImage: child.coverImage })),
  }))

  return (
    <header className="site-header">
      <div className="container header-topbar">
        <nav className="topbar-nav" aria-label="Дополнительная навигация">
          {secondaryNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="topbar-details">
          <span>{settings.address}</span>
          <span>{settings.workTime}</span>
        </div>
        <a className="topbar-phone" href={`tel:${normalizePhone(phone)}`}>{phone}</a>
      </div>

      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="ФОХСТОР">
          <BrandWordmark subtitle="Apple техника в Самаре" />
        </Link>

        <nav className="desktop-nav" aria-label="Основная навигация">
          <DesktopCatalogMenu nodes={[]} brandMenu={brandMenu} />
        </nav>

        <div className="header-actions">
          <CartIcon />
          <a className="button small" href={`tel:${normalizePhone(phone)}`}>
            Позвонить
          </a>
          <MobileMenu phone={normalizePhone(phone)} settings={settings} navData={navData} groupNavData={groupNavData} brandNavigation={brandMenu} />
        </div>
      </div>
    </header>
  )
}
