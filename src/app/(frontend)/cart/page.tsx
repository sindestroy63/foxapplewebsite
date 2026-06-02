import type { Metadata } from 'next'

import { getSiteSettings } from '@/lib/cms'
import { CartPageClient } from '@/components/CartPageClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Корзина',
  description: 'Оформление заказа в FOX APPLE. Проверьте состав корзины и отправьте заявку.',
}

export default async function CartPage() {
  const settings = await getSiteSettings()

  return <CartPageClient settings={settings} />
}