'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'

export default function TradeInNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()
  if (user?.role !== 'admin' && user?.role !== 'superadmin') return null

  return <div className="price-update-nav-link"><Link className={pathname === '/admin/trade-in' ? 'active' : ''} href="/admin/trade-in">Trade-in</Link></div>
}
