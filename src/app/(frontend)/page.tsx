import { HomepageMediaShowcase } from '@/components/HomepageMediaShowcase'
import { ScrollReveal } from '@/components/ScrollReveal'
import Link from 'next/link'

import { ProductGrid } from '@/components/ProductGrid'
import { getCategories, getProducts, getSiteSettings } from '@/lib/cms'
import {
  mapEmbedUrl,
  normalizePhone,
  telegramLinkProps,
} from '@/lib/format'
import { getMediaUrl, isVideoMedia } from '@/lib/media'
import type { Media } from '@/lib/types'

export const dynamic = 'force-dynamic'

const benefits = [
  { label: 'Оригинальная техника', desc: 'Только новые устройства из официальных каналов поставки' },
  { label: 'Гарантия 12 месяцев', desc: 'Полная гарантийная поддержка после покупки' },
  { label: 'Trade-In', desc: 'Обменяйте старое устройство на новое с доплатой' },
  { label: 'Рассрочка', desc: 'Забирайте технику сегодня — платите частями' },
  { label: 'Оплата картой', desc: 'Принимаем карты, переводы и наличные' },
  { label: 'Доставка по Самаре', desc: 'Самовывоз из магазина или доставка курьером' },
]

export default async function HomePage() {
  const [settings, categories, products] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getProducts({ featuredOnly: true, limit: 6 }),
  ])

  const phone = settings.phone || '+7 (917) 954-64-64'
  const homepageMedia = (settings.homepageMedia || []).filter(
    (item): item is Media => Boolean(item) && typeof item === 'object' && 'id' in item,
  )
  const heroMedia = homepageMedia[0]
  const heroMediaUrl = getMediaUrl(heroMedia, 'detail')

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        {heroMediaUrl ? (
          isVideoMedia(heroMedia) ? (
            <video autoPlay className="hero-bg-video" loop muted playsInline preload="auto" src={heroMediaUrl} />
          ) : (
            <img
              alt={heroMedia?.alt || 'FOX APPLE'}
              className="hero-bg-video"
              loading="eager"
              src={heroMediaUrl}
            />
          )
        ) : null}
        <div className="hero-bg-overlay" />
        <div className="container hero-content">
          <p className="eyebrow">Самара · техника Apple · бронь онлайн</p>
          <h1>{settings.heroTitle}</h1>
          <p className="hero-subtitle">{settings.heroSubtitle}</p>
          <div className="hero-actions">
            <Link className="button hero-primary" href="/catalog">
              Каталог
            </Link>
            <Link className="button hero-secondary" href="/contacts">
              Связаться
            </Link>
          </div>
        </div>
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
            Смотреть все →
          </Link>
        </div>
        <div className="container category-grid">
          {categories.map((category) => (
            <Link className="category-card" data-slug={category.slug} href={`/catalog/${category.slug}`} key={category.id}>
              <span>{category.name}</span>
              <small>Смотреть</small>
            </Link>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ── ПОПУЛЯРНЫЕ ТОВАРЫ ── */}
      <ScrollReveal>
      <section className="section section-muted">
        <div className="container section-head">
          <div>
            <p className="eyebrow">Популярное</p>
            <h2>Часто спрашивают</h2>
          </div>
          <Link className="ghost-link" href="/catalog">
            Весь каталог →
          </Link>
        </div>
        <div className="container">
          <ProductGrid products={products} settings={settings} />
        </div>
      </section>
      </ScrollReveal>

      {/* ── ПРЕИМУЩЕСТВА ── */}
      <ScrollReveal>
      <section className="section">
        <div className="container section-head">
          <div>
            <p className="eyebrow">Почему мы</p>
            <h2>Преимущества FOX APPLE</h2>
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
      <HomepageMediaShowcase
        items={homepageMedia}
        text={settings.homepageMediaText}
        title={settings.homepageMediaTitle}
      />

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
                title="Карта FOX APPLE"
              />
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>
    </>
  )
}
