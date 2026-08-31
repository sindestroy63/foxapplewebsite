'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function PriceUpdateNavLink() {
  const pathname = usePathname()
  const active = pathname === '/admin/price-updates'

  return (
    <div className="price-update-nav-link">
      <Link className={active ? 'active' : ''} href="/admin/price-updates">
        Обновление цен
      </Link>
    </div>
  )
}
