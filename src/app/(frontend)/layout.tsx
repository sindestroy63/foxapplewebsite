import type React from 'react'
import type { Metadata } from 'next'

import { BottomTicker } from '@/components/BottomTicker'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { CookieBanner } from '@/components/CookieBanner'
import { MobileStickyBar } from '@/components/MobileStickyBar'
import { Particles } from '@/components/Particles'
import { SITE_URL } from '@/lib/constants'
import { getSiteSettings, getNavData } from '@/lib/cms'
import { CartProvider } from '@/contexts/CartContext'

import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ФОХСТОР — техника Apple в Самаре',
    template: '%s | ФОХСТОР',
  },
  description:
    'Каталог техники Apple в Самаре: iPhone, iPad, MacBook, AirPods, Apple Watch, аксессуары, Trade-In и рассрочка.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'ФОХСТОР',
    title: 'ФОХСТОР — техника Apple в Самаре',
    description:
      'Актуальные цены, наличие, гарантия 12 месяцев, Trade-In, рассрочка и доставка по Самаре.',
    url: SITE_URL,
  },
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const [settings, navData] = await Promise.all([getSiteSettings(), getNavData()])

  return (
    <html lang="ru">
      <body className="frontend-body">
        <CartProvider>
          <Particles />
          <div className="site-shell">
            <Header settings={settings} navData={navData} />
            <main className="site-main">{children}</main>
            <Footer settings={settings} />
          </div>
          <BottomTicker />
          <MobileStickyBar settings={settings} />
          <CookieBanner />
        </CartProvider>
      </body>
    </html>
  )
}
