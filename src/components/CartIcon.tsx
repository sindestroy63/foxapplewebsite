'use client'

import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'

export function CartIcon() {
  const { itemCount } = useCart()

  return (
    <Link href="/cart" className="cart-icon-link" aria-label={`Корзина, ${itemCount} товаров`}>
      <svg
        className="cart-icon-svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {itemCount > 0 && (
        <span className="cart-icon-badge">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}