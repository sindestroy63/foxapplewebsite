import Link from 'next/link'

import { BrandWordmark } from '@/components/BrandWordmark'
import { SELLER } from '@/lib/constants'
import { normalizePhone, telegramLinkProps } from '@/lib/format'
import type { SiteSettings } from '@/lib/types'

export function Footer({ settings }: { settings: SiteSettings }) {
  const phone = settings.phone || '+7 (917) 954-64-64'

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <BrandWordmark className="footer-wordmark" />
          <p>{settings.aboutText}</p>
        </div>
        <div>
          <h2>Разделы</h2>
          <Link href="/catalog">Каталог</Link>
          <Link href="/installment">Рассрочка</Link>
          <Link href="/trade-in">Trade-In</Link>
          <Link href="/warranty">Гарантия</Link>
          <Link href="/contacts">Контакты</Link>
        </div>
        <div>
          <h2>Контакты</h2>
          <a href={`tel:${normalizePhone(phone)}`}>{phone}</a>
          <a {...telegramLinkProps(settings.telegramUsername)}>{settings.telegramUsername}</a>
          <span>{settings.address}</span>
          <span>{settings.workTime}</span>
        </div>
      </div>
      <div className="container footer-disclaimer">
        <div className="footer-legal-links">
          <Link href="/privacy">Политика конфиденциальности</Link>
          <Link href="/personal-data-consent">Согласие на обработку персональных данных</Link>
          <Link href="/offer">Публичная оферта</Link>
          <Link href="/purchase-return">Условия покупки и возврата</Link>
        </div>
        <p>
          Сайт foxapple.ru не является официальным сайтом Apple Inc. и не аффилирован с компанией
          Apple. Все товарные знаки принадлежат их правообладателям.
        </p>
        <p>Информация на сайте не является публичной офертой.</p>
        <p>Instagram принадлежит компании Meta, признанной экстремистской организацией и запрещенной в РФ.</p>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} FOX APPLE</span>
        <span className="footer-seller">
          {SELLER.typeAndName} · ИНН {SELLER.inn} · ОГРНИП {SELLER.ogrnip}
        </span>
        <a href="https://intellexgroup.ru" target="_blank" rel="noreferrer" className="footer-dev">
          Разработка intellexgroup.ru
        </a>
      </div>
    </footer>
  )
}
