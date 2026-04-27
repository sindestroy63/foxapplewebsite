import Link from 'next/link'

import { normalizePhone, telegramLinkProps } from '@/lib/format'
import type { SiteSettings } from '@/lib/types'

export function MobileStickyBar({ settings }: { settings: SiteSettings }) {
  const phone = settings.phone || '+7 (917) 954-64-64'

  return (
    <nav className="mobile-sticky" aria-label="Быстрые действия">
      <a href={`tel:${normalizePhone(phone)}`}>Позвонить</a>
      <a {...telegramLinkProps(settings.telegramUsername)}>Telegram</a>
      <Link href="/catalog">Каталог</Link>
    </nav>
  )
}
