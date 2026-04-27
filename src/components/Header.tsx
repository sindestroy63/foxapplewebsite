import Link from 'next/link'

import { BrandWordmark } from '@/components/BrandWordmark'
import { MobileMenu } from '@/components/MobileMenu'
import { normalizePhone } from '@/lib/format'
import type { SiteSettings } from '@/lib/types'

const navItems = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/installment', label: 'Рассрочка' },
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/repair', label: 'Ремонт' },
  { href: '/contacts', label: 'Контакты' },
]

export function Header({ settings }: { settings: SiteSettings }) {
  const phone = settings.phone || '+7 (917) 954-64-64'

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="FOX APPLE">
          <BrandWordmark subtitle="Apple техника в Самаре" />
        </Link>

        <nav className="desktop-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <a className="button small" href={`tel:${normalizePhone(phone)}`}>
            Позвонить
          </a>
          <MobileMenu phone={normalizePhone(phone)} />
        </div>
      </div>
    </header>
  )
}
