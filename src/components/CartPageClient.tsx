'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useCart } from '@/contexts/CartContext'
import { formatPrice } from '@/lib/format'
import type { SiteSettings } from '@/lib/types'
import { CheckoutForm } from './CheckoutForm'
import Link from 'next/link'

const FREE_DELIVERY_THRESHOLD = 9900

type Props = {
  settings: SiteSettings
}

export function CartPageClient({ settings }: Props) {
  const { items, itemCount, total, removeItem, changeQuantity, clearCart } = useCart()
  const router = useRouter()

  const [orderSuccess, setOrderSuccess] = useState(false)
  const [countdown, setCountdown] = useState(5)

  const hasItems = items.length > 0
  const isFreeDelivery = total >= FREE_DELIVERY_THRESHOLD

  const handleOrderSuccess = () => {
    clearCart()
    setOrderSuccess(true)
    setCountdown(5)
  }

  useEffect(() => {
    if (!orderSuccess) return
    if (countdown <= 0) {
      router.push('/')
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [orderSuccess, countdown, router])

  if (orderSuccess) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="form-success-block">
            <div className="form-success-icon">✓</div>
            <h3>Заказ успешно отправлен</h3>
            <p className="form-success-text">
              Спасибо за обращение. Наш менеджер свяжется с вами в ближайшее время
              для подтверждения заказа и уточнения деталей доставки.
            </p>
            <p className="form-success-redirect">
              Через {countdown} сек. вы будете автоматически перенаправлены на главную страницу.
            </p>
            <div className="form-success-actions">
              <Link className="button" href="/catalog">
                Перейти в каталог
              </Link>
              <Link className="button secondary" href="/">
                На главную
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!hasItems) {
    return (
      <section className="cart-empty-section">
        <div className="cart-empty">
          <h1>Корзина пуста</h1>
          <p>Добавьте товары из каталога, чтобы оформить заявку.</p>
          <Link className="button" href="/catalog">
            Перейти в каталог
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Навигация">
          <a href="/">Главная</a>
          <span className="breadcrumbs-sep">›</span>
          <span>Корзина</span>
        </nav>

        <h1 className="cart-page-title">Корзина ({itemCount} {itemCount === 1 ? 'товар' : itemCount >= 2 && itemCount <= 4 ? 'товара' : 'товаров'})</h1>

        <div className="cart-layout">
          <div className="cart-items-col">
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    <Link
                      href={`/catalog/${item.categorySlug}/${item.productSlug}`}
                      className="cart-item-name"
                    >
                      {item.productName}
                    </Link>
                    {item.variant && (
                      <div className="cart-item-variant">
                        {item.variant.color && (
                          <span className="cart-item-attr">
                            {item.variant.color.russianLabel || item.variant.color.englishLabel}
                          </span>
                        )}
                        {item.variant.memory && (
                          <span className="cart-item-attr">{item.variant.memory}</span>
                        )}
                        {item.variant.simType && (
                          <span className="cart-item-attr">
                            {item.variant.simType === 'SIM_ESIM' ? 'SIM + eSIM' : item.variant.simType === 'ESIM' ? 'eSIM' : item.variant.simType}
                          </span>
                        )}
                        {item.variant.size && (
                          <span className="cart-item-attr">{item.variant.size}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="cart-item-price">{formatPrice(item.price)}</div>

                  <div className="cart-item-qty">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changeQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Уменьшить количество"
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changeQuantity(item.id, item.quantity + 1)}
                      aria-label="Увеличить количество"
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-subtotal">
                    {formatPrice(item.price * item.quantity)}
                  </div>

                  <button
                    type="button"
                    className="cart-item-remove"
                    onClick={() => removeItem(item.id)}
                    aria-label="Удалить товар"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Товаров на сумму</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              {!isFreeDelivery && (
                <p className="cart-delivery-note">
                  Бесплатная доставка от {formatPrice(FREE_DELIVERY_THRESHOLD)}. Стоимость доставки уточнит менеджер.
                </p>
              )}
              {isFreeDelivery && (
                <p className="cart-delivery-free">Бесплатная доставка по Самаре</p>
              )}
            </div>
          </div>

          <div className="cart-form-col">
            <CheckoutForm settings={settings} total={total} onSuccess={handleOrderSuccess} />
          </div>
        </div>
      </div>
    </section>
  )
}