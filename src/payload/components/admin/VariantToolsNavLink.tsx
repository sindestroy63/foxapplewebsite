'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin/stock-prices', label: 'Цены и наличие' },
  { href: '/admin/variant-builder', label: 'Конструктор вариантов' },
]

export default function VariantToolsNavLink() {
  const pathname = usePathname()

  return (
    <div className="price-update-nav-link">
      {LINKS.map((item) => (
        <Link key={item.href} className={pathname === item.href ? 'active' : ''} href={item.href}>
          {item.label}
        </Link>
      ))}
    </div>
  )
}
