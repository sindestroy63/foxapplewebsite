import Link from 'next/link'

import { BrandWordmark } from '@/components/BrandWordmark'
import { MobileMenu } from '@/components/MobileMenu'
import { normalizePhone } from '@/lib/format'
import type { NavCategory } from '@/lib/cms'
import type { SiteSettings } from '@/lib/types'

const secondaryNav = [
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/repair', label: 'Ремонт' },
  { href: '/contacts', label: 'Контакты' },
]

export function Header({ settings, navData }: { settings: SiteSettings; navData?: NavCategory[] }) {
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
        <Link href="/" className="brand" aria-label="FOX APPLE">
          <BrandWordmark subtitle="Apple техника в Самаре" />
        </Link>

        <nav className="desktop-nav" aria-label="Основная навигация">
          {navData && navData.length > 0 ? (
            navData.map((cat) => (
              <div key={cat.slug} className="nav-dropdown">
                <Link href={`/catalog/${cat.slug}`} className="nav-dropdown-trigger">
                  {cat.name}
                  {cat.products.length > 0 && <span className="nav-arrow">&#9662;</span>}
                </Link>
                {cat.products.length > 0 && (
                  <div className="nav-dropdown-menu">
                    {cat.products.map((p) => (
                      <Link key={p.slug} href={`/catalog/${cat.slug}?model=${p.slug}`}>
                        {p.model}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <Link href="/catalog">Каталог</Link>
          )}
        </nav>

        <div className="header-actions">
          <a className="button small" href={`tel:${normalizePhone(phone)}`}>
            Позвонить
          </a>
          <MobileMenu phone={normalizePhone(phone)} navData={navData} />
        </div>
      </div>
    </header>
  )
}
