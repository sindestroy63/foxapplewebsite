'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type NavCategory = { slug: string; name: string; products: { model: string; slug: string }[] }

const secondaryLinks = [
  { href: '/installment', label: 'Рассрочка' },
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/repair', label: 'Ремонт' },
  { href: '/contacts', label: 'Контакты' },
]

export function MobileMenu({ phone, navData }: { phone: string; navData?: NavCategory[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        className="burger-btn"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={`burger-icon ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="mobile-overlay" onClick={close} onTouchEnd={close}>
          <nav
            className="mobile-nav"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label="Мобильная навигация"
          >
            <button className="mobile-nav-close" aria-label="Закрыть меню" onClick={close}>✕</button>

            {navData && navData.length > 0 ? (
              <>
                <span className="mobile-nav-heading">Выберите категорию</span>
                {navData.map((cat) => (
                  <Link key={cat.slug} href={`/catalog/${cat.slug}`} onClick={close} className="mobile-nav-cat">
                    {cat.name}
                  </Link>
                ))}
              </>
            ) : (
              <Link href="/catalog" onClick={close} className="mobile-nav-cat">Каталог</Link>
            )}

            <span className="mobile-nav-heading mobile-nav-heading--secondary">Дополнительная информация</span>
            <div className="mobile-nav-secondary">
              {secondaryLinks.map((item) => (
                <Link key={item.href} href={item.href} onClick={close}>
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mobile-nav-contact">
              <a className="mobile-nav-phone" href={`tel:${phone}`}>{phone.replace(/[^\d+() -]/g, '')}</a>
              <a className="button small mobile-call-btn" href={`tel:${phone}`}>Позвонить</a>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
