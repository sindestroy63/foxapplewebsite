import type React from 'react'
import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { CookieBanner } from '@/components/CookieBanner'
import { MobileStickyBar } from '@/components/MobileStickyBar'
import { Particles } from '@/components/Particles'
import { SITE_URL } from '@/lib/constants'
import { getSiteSettings, getNavData } from '@/lib/cms'

import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FOX APPLE — техника Apple в Самаре',
    template: '%s | FOX APPLE',
  },
  description:
    'Каталог техники Apple в Самаре: iPhone, iPad, MacBook, AirPods, Apple Watch, аксессуары, Trade-In и рассрочка.',
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
    siteName: 'FOX APPLE',
    title: 'FOX APPLE — техника Apple в Самаре',
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
        <Particles />
        <div className="site-shell">
          <Header settings={settings} navData={navData} />
          <main className="site-main">{children}</main>
          <Footer settings={settings} />
        </div>
        <MobileStickyBar settings={settings} />
        <CookieBanner />
      </body>
    </html>
  )
}
