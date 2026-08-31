import Link from 'next/link'

import { BrandWordmark } from '@/components/BrandWordmark'
import { CartIcon } from '@/components/CartIcon'
import { MobileMenu } from '@/components/MobileMenu'
import { DesktopCatalogMenu } from '@/components/DesktopCatalogMenu'
import { normalizePhone } from '@/lib/format'
import type { CatalogNavNode, NavCategory, NavGroup } from '@/lib/cms'
import type { SiteSettings } from '@/lib/types'

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

export function Header({ settings, navData, groupNavData, catalogNavigation }: { settings: SiteSettings; navData?: NavCategory[]; groupNavData?: NavGroup[]; catalogNavigation?: CatalogNavNode[] }) {
  const phone = settings.phone || '+7 (917) 954-64-64'

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
        <a className="topbar-phone" href={`tel:${normalizePhone(phone)}`}>{phone}</a>
      </div>

      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="ФОХСТОР">
          <BrandWordmark subtitle="Apple техника в Самаре" />
        </Link>

        <nav className="desktop-nav" aria-label="Основная навигация">
          {catalogNavigation && catalogNavigation.length > 0 ? <DesktopCatalogMenu nodes={catalogNavigation} /> : groupNavData && groupNavData.length > 0 ? (
            groupNavData.map((group) => (
              <div key={group.slug} className="nav-dropdown">
                <Link href={`/catalog?group=${group.slug}`} className="nav-dropdown-trigger">
                  {group.name}
                  {group.brands.length > 0 && <span className="nav-arrow">&#9662;</span>}
                </Link>
                {group.brands.length > 0 && (
                  <div className="nav-dropdown-menu">
                    {group.brands.map((brand) => <Link key={brand} href={`/catalog?group=${group.slug}&brand=${encodeURIComponent(brand)}`}>{brand}</Link>)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <Link href="/catalog">Каталог</Link>
          )}
        </nav>

        <div className="header-actions">
          <CartIcon />
          <a className="button small" href={`tel:${normalizePhone(phone)}`}>
            Позвонить
          </a>
          <MobileMenu phone={normalizePhone(phone)} navData={navData} groupNavData={groupNavData} catalogNavigation={catalogNavigation} />
        </div>
      </div>
    </header>
  )
}
