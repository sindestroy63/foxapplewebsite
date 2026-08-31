import { HeroSlideshow } from '@/components/HeroSlideshow'
import { HomepageMediaShowcase } from '@/components/HomepageMediaShowcase'
import { ScrollReveal } from '@/components/ScrollReveal'
import Link from 'next/link'

import { ProductGrid } from '@/components/ProductGrid'
import { normalizeProducts } from '@/lib/normalize'
import { getCatalogRootGroups, getProducts, getSiteSettings } from '@/lib/cms'
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
  const [settings, featuredProducts, rootGroups] = await Promise.all([
    getSiteSettings(),
    getProducts({ featuredOnly: true, limit: 6 }),
    getCatalogRootGroups(),
  ])
  const bestOffers = featuredProducts

  const phone = settings.phone || '+7 (917) 954-64-64'


  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <HeroSlideshow slides={[{ url: getMediaUrl({ id: heroMedia.mediaId, filename: heroMedia.filename, mimeType: 'video/mp4' }, 'detail')!, isVideo: true, alt: 'ФОХСТОР' }]} />
        <div className="hero-bg-overlay" />
        <div className="container hero-content">
          <p className="eyebrow">Самара · техника Apple · бронь онлайн</p>
          <h1>{CONTACTS.heroTitle}</h1>
          <p className="hero-subtitle">{CONTACTS.heroSubtitle}</p>
          <div className="hero-actions">
            <Link className="button hero-primary" href="/catalog/iphone">
              Подобрать технику
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
            Все категории →
          </Link>
        </div>
        <div className="container category-grid">
          {rootGroups.map((group) => <CatalogGroupCard key={group.slug} slug={group.slug} label={group.label} coverImage={group.coverImage} />)}
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
