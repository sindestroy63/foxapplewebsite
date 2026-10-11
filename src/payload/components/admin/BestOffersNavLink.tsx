'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BestOffersNavLink() {
  const pathname = usePathname()
  const active = pathname === '/admin/globals/site-appearance'

  return (
    <div className="best-offers-nav-link">
      <Link className={active ? 'active' : ''} href="/admin/globals/site-appearance">
        Лучшие предложения
      </Link>
    </div>
  )
}
