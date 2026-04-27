'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/catalog', label: 'Каталог' },
  { href: '/installment', label: 'Рассрочка' },
  { href: '/trade-in', label: 'Trade-In' },
  { href: '/warranty', label: 'Гарантия и возврат' },
  { href: '/repair', label: 'Ремонт' },
  { href: '/contacts', label: 'Контакты' },
]

export function MobileMenu({ phone }: { phone: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

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
        <div className="mobile-overlay" onClick={() => setOpen(false)}>
          <nav
            className="mobile-nav"
            onClick={(e) => e.stopPropagation()}
            aria-label="Мобильная навигация"
          >
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <a className="button small mobile-call-btn" href={`tel:${phone}`}>
              Позвонить
            </a>
          </nav>
        </div>
      )}
    </>
  )
}
