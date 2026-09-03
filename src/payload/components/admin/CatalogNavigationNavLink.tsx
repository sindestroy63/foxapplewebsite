'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { hasFullAdminAccess } from '../../access'

export default function CatalogNavigationNavLink() {
  const pathname = usePathname()
  const { user } = useAuth()
  if (!hasFullAdminAccess(user)) return null
  return <div className="price-update-nav-link"><Link className={pathname === '/admin/catalog-navigation' ? 'active' : ''} href="/admin/catalog-navigation">Навигация каталога</Link></div>
}
