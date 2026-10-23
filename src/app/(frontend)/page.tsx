import { HeroSlideshow, type HeroSlide } from '@/components/HeroSlideshow'
import { ScrollReveal } from '@/components/ScrollReveal'
import Link from 'next/link'

import { ProductGrid } from '@/components/ProductGrid'
import { normalizeProducts } from '@/lib/normalize'
import { getBestOffers, getBrandCatalogNavigation, getSiteSettings } from '@/lib/cms'
import { heroMedia } from '@/lib/catalog-group-assets'
import { getMediaUrl } from '@/lib/media'
import { CatalogGroupCard } from '@/components/CatalogGroupCard'
import { CONTACTS } from '@/lib/constants'
import {
  mapEmbedUrl,
  normalizePhone,
  telegramLinkProps,
} from '@/lib/format'

export const dynamic = 'force-dynamic'

const benefits = [
  { label: 'Оригинальная техника', desc: 'Только новые устройства из официальных каналов поставки' },
  { label: 'Гарантия 12 месяцев', desc: 'Полная гарантийная поддержка после покупки' },
  { label: 'Trade-In', desc: 'Обменяйте старое устройство на новое с доплатой' },
  { label: 'Рассрочка', desc: 'Забирайте технику сегодня — платите частями' },
  { label: 'Оплата картой', desc: 'Принимаем карты и наличные' },
  { label: 'Доставка по Самаре', desc: 'Самовывоз из магазина или доставка курьером' },
]

export default async function HomePage() {
  const [settings, featuredProducts, brandNavigation] = await Promise.all([
    getSiteSettings(),
    getBestOffers(),
    getBrandCatalogNavigation(),
  ])
  const bestOffers = featuredProducts

  console.log('[HomePage] bestOffers count:', bestOffers.length)
  console.log('[HomePage] bestOffers names:', bestOffers.map(p => p.name))

  const phone = settings.phone || '+7 (917) 954-64-64'


  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <HeroSlideshow
          slides={[
            {
              id: 'iphone-18-pro-max',
              isVideo: true,
              url: getMediaUrl({ id: heroMedia.mediaId, filename: heroMedia.filename, mimeType: 'video/mp4' }, 'detail') || '/api/media/file/hero-iphone.mp4',
              alt: 'iPhone 18 Pro Max',
              eyebrow: 'Самара · техника Apple · бронь онлайн',
              title: 'iPhone 18 Pro Max',
              subtitle: 'Самый большой дисплей. Максимальная автономность.',
              buyUrl: '/catalog/smartphones/iphone-18-pro-max-14jf1q',
              buyLabel: 'Купить',
              secondaryUrl: '/contacts',
              secondaryLabel: 'Связаться',
              bg: '#000000',
            },
            {
              id: 'iphone-duo',
              url: '/banners/iphone-duo.webp',
              alt: 'iPhone Duo',
              buyUrl: '/catalog/smartphones/iphone-duo-ad90cd',
              buyLabel: 'Купить',
              bg: '#f7f6f9',
            },
            {
              id: 'airpods-5',
              url: '/banners/airpods-5.webp',
              alt: 'AirPods 5',
              buyUrl: '/catalog/audio/airpods-5-mysjt0',
              buyLabel: 'Купить',
              bg: '#f7f6f9',
            },
            {
              id: 'watch-s12',
              url: '/banners/watch-s12.webp',
              alt: 'Apple Watch Series 12',
              buyUrl: '/catalog/smart-watches/apple-watch-series-12-mdag95',
              buyLabel: 'Купить',
              bg: '#f7f6f9',
            },
            {
              id: 'watch-ultra-4',
              url: '/banners/watch-ultra-4.webp',
              alt: 'Apple Watch Ultra 4',
              buyUrl: '/catalog/smart-watches/apple-watch-ultra-4-08l1wr',
              buyLabel: 'Купить',
              bg: '#f7f6f9',
            },
            {
              id: 'macbook-air',
              url: '/banners/macbook-air.webp',
              alt: 'MacBook Air',
              buyUrl: '/catalog/laptops/Apple%20MacBook%20Air%20%28M5%2C%202026%29',
              buyLabel: 'Купить',
              bg: '#f7f6f9',
            },
            {
              id: 'airpods-pro-3',
              url: '/banners/airpods-pro-3.webp',
              alt: 'AirPods Pro 3',
              buyUrl: '/catalog/audio/airpods-pro-3',
              buyLabel: 'Купить',
              darkBtn: true,
              bg: '#000000',
            },
            {
              id: 'iphone-air',
              url: '/banners/iphone-air.webp',
              alt: 'iPhone Air',
              buyUrl: '/catalog/smartphones/iphone-air',
              buyLabel: 'Купить',
              bg: '#f7f6f9',
            },
            {
              id: 'ps5-pro',
              url: '/banners/ps5-pro.webp',
              alt: 'PlayStation 5 Pro',
              buyUrl: '/catalog/gaming-consoles/playstation-5-pro',
              buyLabel: 'Купить',
              darkBtn: true,
              bg: '#000000',
            },
            {
              id: 'macbook-neo',
              url: '/banners/macbook-neo.webp',
              alt: 'MacBook Neo',
              buyUrl: '/catalog/laptops/Apple%20MacBook%20Neo%20%28A18%20Pro%2C%202026%29',
              buyLabel: 'Купить',
              aspectRatio: '1300 / 672',
              bg: '#f7f6f9',
            },
          ]}
        />
      </section>

      {/* ── КАТЕГОРИИ ── */}
      <ScrollReveal>
      <section className="section">
        <div className="container section-head">
          <div>
            <p className="eyebrow">Категории</p>
            <h2>Каталог техники</h2>
          </div>
          <Link className="ghost-link" href="/catalog">
            Все категории →
          </Link>
        </div>
        <div className="container category-grid">
          {brandNavigation.map((group) => <CatalogGroupCard key={group.key} slug={group.key} label={group.title} href={group.href} coverImage={group.coverImage || null} />)}
        </div>
      </section>
      </ScrollReveal>

      {/* ── ПОПУЛЯРНЫЕ ТОВАРЫ ── */}
      <ScrollReveal>
      <section className="section section-muted">
        <div className="container section-head">
          <div>
            <p className="eyebrow">Популярное</p>
            <h2>Лучшие предложения</h2>
          </div>
          <Link className="ghost-link" href="/catalog">
            Все категории →
          </Link>
        </div>
        <div className="container">
          <ProductGrid products={bestOffers} settings={settings} />
        </div>
      </section>
      </ScrollReveal>

      {/* ── ПРЕИМУЩЕСТВА ── */}
      <ScrollReveal>
      <section className="section">
        <div className="container section-head">
          <div>
            <p className="eyebrow">Почему мы</p>
            <h2>Преимущества ФОХСТОР</h2>
          </div>
        </div>
        <div className="container benefit-grid">
          {benefits.map((b, i) => (
            <div className="benefit" key={b.label}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <strong>{b.label}</strong>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ── МЕДИА ── */}

      {/* ── РАССРОЧКА + КОНТАКТЫ ── */}
      <ScrollReveal>
      <section className="section">
        <div className="container split-grid">
          <div className="promo-card">
            <p className="eyebrow">Рассрочка</p>
            <h2>Забирайте технику сегодня — платите частями</h2>
            <p>
              Сотрудник подберёт доступные варианты рассрочки и расскажет условия до оформления.
            </p>
            <Link className="button" href="/installment">
              Подробнее о рассрочке
            </Link>
          </div>
          <div className="contact-card">
            <p className="eyebrow">Контакты</p>
            <h2>{settings.address}</h2>
            <p>{settings.workTime}</p>
            <div className="contact-card-links">
              <a href={`tel:${normalizePhone(phone)}`}>{phone}</a>
              <a {...telegramLinkProps(settings.telegramUsername)}>{settings.telegramUsername}</a>
            </div>
            <div className="contact-map">
              <iframe
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl(settings.address, settings.mapUrl)}
                title="Карта ФОХСТОР"
              />
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>
    </>
  )
}
