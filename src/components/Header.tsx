import Link from 'next/link'

import { BrandWordmark } from '@/components/BrandWordmark'
import { CartIcon } from '@/components/CartIcon'
import { MobileMenu } from '@/components/MobileMenu'
import { DesktopCatalogMenu } from '@/components/DesktopCatalogMenu'
import { normalizePhone } from '@/lib/format'
import { HeaderSearch } from '@/components/HeaderSearch'
import type { CatalogNavNode, NavCategory, NavGroup } from '@/lib/cms'
import type { SiteSettings } from '@/lib/types'
import type { BrandMenu } from '@/lib/brand-catalog-menu'
import { catalogNavigationHref } from '@/lib/catalog-navigation-url'

const secondaryNav = [
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/contacts', label: 'Контакты' },
]

function DesktopNode({ node }: { node: CatalogNavNode }) {
  return <div className="nav-dropdown nav-tree-node">
    <Link href={node.href} className="nav-dropdown-trigger">{node.title}{node.isNew && <small className="nav-new-badge">{node.badgeText || 'Новинка'}</small>}{node.children.length > 0 && <span className="nav-arrow">›</span>}</Link>
    {node.children.length > 0 && <div className="nav-dropdown-menu nav-tree-menu">{node.children.map((child) => <DesktopNode key={child.id} node={child} />)}</div>}
  </div>
}

 export function Header({ settings, navData, groupNavData, brandNavigation }: { settings: SiteSettings; navData?: NavCategory[]; groupNavData?: NavGroup[]; brandNavigation?: Array<{ title: string; key: string; href?: string; isVisible?: boolean; isNew?: boolean; sortOrder?: number; coverImage?: import('@/lib/types').Media | null; children?: Array<{ title: string; key: string; href?: string; isVisible?: boolean; isNew?: boolean; sortOrder?: number; coverImage?: import('@/lib/types').Media | null; products?: Array<{ id: string | number; name: string; href: string; isNew?: boolean }> }> }> }) {
  const phone = settings.phone || '+7 (917) 954-64-64'
  const brandMenu: BrandMenu[] = (brandNavigation || []).map((group) => ({
    label: group.title, key: group.key, href: catalogNavigationHref(group), filter: (group as any).filter, isVisible: group.isVisible, isNew: group.isNew, sortOrder: group.sortOrder, coverImage: group.coverImage,
    items: (group.children || []).map((child) => ({ label: child.title, key: child.key, href: catalogNavigationHref(child), filter: (child as any).filter, isVisible: child.isVisible, isNew: child.isNew, sortOrder: child.sortOrder, coverImage: child.coverImage, products: child.products })),
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
          {/* className="header-search" action="/catalog" method="get" */}
          <HeaderSearch />
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
