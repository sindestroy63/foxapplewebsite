import { HeroSlideshow, type HeroSlide } from '@/components/HeroSlideshow'
import { ScrollReveal } from '@/components/ScrollReveal'
import Link from 'next/link'

import { ProductGrid } from '@/components/ProductGrid'
import { normalizeProducts } from '@/lib/normalize'
import { getBestOffers, getBrandCatalogNavigation, getSiteSettings } from '@/lib/cms'
import { CatalogGroupCard } from '@/components/CatalogGroupCard'
import { StoreAbout } from '@/components/StoreAbout'
import { CONTACTS } from '@/lib/constants'
import {
  mapEmbedUrl,
  normalizePhone,
  telegramLinkProps,
} from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [settings, featuredProducts, brandNavigation] = await Promise.all([
    getSiteSettings(),
    getBestOffers(),
    getBrandCatalogNavigation(),
  ])
  const bestOffers = featuredProducts

  const phone = settings.phone || '+7 (917) 954-64-64'

  const heroSlides: HeroSlide[] = [
    {
      id: 'iphone-18-pro',
      alt: 'iPhone 18 Pro',
      video: '/hero/iphone-18-pro-max.mp4',
      poster: '/hero/iphone-18-pro-max.jpg',
      href: '/catalog/smartphones/iphone-18-pro-c866og',
      title: 'iPhone 18 Pro',
      subtitle: 'Прорыв в технологиях.',
    },
    {
      id: 'duo',
      alt: 'iPhone Duo',
      video: '/hero/duo.mp4',
      poster: '/hero/duo.jpg',
      href: '/catalog/smartphones/iphone-duo-ad90cd',
      title: 'iPhone Duo',
      subtitle: 'Будущее в ваших руках.',
    },
    {
      id: 'airpods-5',
      alt: 'AirPods 5',
      video: '/hero/airpods-5.mp4',
      poster: '/hero/airpods-5.jpg',
      href: '/catalog/audio/airpods-5-mysjt0',
      title: 'AirPods 5',
      subtitle: 'Звук нового поколения.',
    },
    {
      id: 'watch-12',
      alt: 'Apple Watch Series 12',
      video: '/hero/watch-12.mp4',
      poster: '/hero/watch-12.jpg',
      href: '/catalog/smart-watches/apple-watch-series-12-mdag95',
      title: 'Apple Watch Series 12',
      subtitle: 'Безупречный контроль здоровья.',
    },
    {
      id: 'watch-ultra-4',
      alt: 'Apple Watch Ultra 4',
      video: '/hero/watch-ultra-4.mp4',
      poster: '/hero/watch-ultra-4.jpg',
      href: '/catalog/smart-watches/apple-watch-ultra-4-08l1wr',
      title: 'Apple Watch Ultra 4',
      subtitle: 'Максимум автономности. Экстремальная прочность.',
    },
    {
      id: 'galaxy',
      alt: 'Samsung Galaxy',
      video: '/hero/galaxy.mp4',
      poster: '/hero/galaxy.jpg',
      href: '/catalog/smartphones/samsung-galaxy-z-fold8-ultra',
      title: 'Samsung Galaxy',
      subtitle: 'Инновации для каждого.',
    },
    {
      id: 'playstation',
      alt: 'PlayStation 5 Pro',
      video: '/hero/playstation.mp4',
      poster: '/hero/playstation.jpg',
      href: '/catalog/gaming-consoles/playstation-5-pro',
      title: 'PlayStation 5 Pro',
      subtitle: 'Абсолютная мощность гейминга.',
    },
    {
      id: 'dyson',
      alt: 'Dyson Airstrait',
      video: '/hero/dyson.mp4',
      poster: '/hero/dyson.jpg',
      href: '/catalog/home-appliances/vypryamitel-dyson-ht01',
      title: 'Dyson',
      subtitle: 'Совершенство в деталях.',
    },
    {
      id: 'macbook-neo',
      alt: 'MacBook Neo',
      video: '/hero/macbook-neo.mp4',
      poster: '/hero/macbook-neo.jpg',
      href: '/catalog/laptops/Apple%20MacBook%20Neo%20%28A18%20Pro%2C%202026%29',
      title: 'MacBook Neo',
      subtitle: 'Яркий. Доступный. Твой.',
    },
    {
      id: 'macbook-air',
      alt: 'MacBook Air M5',
      video: '/hero/macbook-air.mp4',
      poster: '/hero/macbook-air.jpg',
      href: '/catalog/laptops/Apple%20MacBook%20Air%20%28M5%2C%202026%29',
      title: 'MacBook Air M5',
      subtitle: 'Невероятная сила технологий.',
    },
    {
      id: 'iphone-17',
      alt: 'iPhone 17',
      video: '/hero/iphone-17.mp4',
      poster: '/hero/iphone-17.jpg',
      href: '/catalog/smartphones/iphone-17',
      title: 'iPhone 17',
      subtitle: 'Магия ярких цветов.',
    },
    {
      id: 'iphone-air',
      alt: 'iPhone Air',
      video: '/hero/iphone-air.mp4',
      poster: '/hero/iphone-air.jpg',
      href: '/catalog/smartphones/iphone-air',
      title: 'iPhone Air',
      subtitle: 'Невероятная легкость стиля.',
    },
    {
      id: 'airpods-max-2',
      alt: 'AirPods Max 2 (2026)',
      video: '/hero/airpods-max-2.mp4',
      poster: '/hero/airpods-max-2.jpg',
      href: '/catalog/audio/Apple%20AirPods%20Max%202%20%282026%29',
      title: 'AirPods Max 2 (2026)',
      subtitle: 'Звук премиального класса.',
    },
  ]

  return (
    <>
      <section className="hero">
        <HeroSlideshow slides={heroSlides} />
      </section>

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

      <ScrollReveal>
      <StoreAbout />
      </ScrollReveal>

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
