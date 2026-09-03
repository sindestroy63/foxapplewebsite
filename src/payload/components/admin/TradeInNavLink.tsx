'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { hasFullAdminAccess } from '../../access'

export default function TradeInNavLink() {
  const { user } = useAuth()
  const pathname = usePathname()
  if (!hasFullAdminAccess(user)) return null

  return <div className="price-update-nav-link"><Link className={pathname === '/admin/trade-in' ? 'active' : ''} href="/admin/trade-in">Trade-in</Link></div>
}
