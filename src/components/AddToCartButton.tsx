'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import type { CartItemVariant } from '@/lib/types'

type Props = {
  productId: string | number
  productName: string
  productSlug: string
  categorySlug: string
  price: number
  variant?: CartItemVariant
  image?: string
  disabled?: boolean
}

export function AddToCartButton({
  productId,
  productName,
  productSlug,
  categorySlug,
  price,
  variant,
  image,
  disabled,
}: Props) {
  const { addItem, itemCount } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(productId, productName, productSlug, categorySlug, price, variant, image, quantity)
    setAdded(true)
    setQuantity(1)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="add-to-cart-block">
      <div className="add-to-cart-row">
        <div className="qty-stepper">
          <button
            type="button"
            className="qty-btn"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={disabled || added}
            aria-label="Уменьшить количество"
          >
            −
          </button>
          <span className="qty-value">{quantity}</span>
          <button
            type="button"
            className="qty-btn"
            onClick={() => setQuantity((q) => q + 1)}
            disabled={disabled || added}
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>

        <button
          type="button"
          className={`button add-to-cart-btn${added ? ' added' : ''}`}
          onClick={handleAdd}
          disabled={disabled}
        >
          {added ? '✓ В корзине' : 'В корзину'}
        </button>
      </div>
    </div>
  )
}