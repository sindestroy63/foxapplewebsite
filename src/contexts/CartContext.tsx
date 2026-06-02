'use client'

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CartItem, CartItemVariant } from '@/lib/types'
import {
  addToCart as addToCartUtil,
  clearCart as clearCartUtil,
  getCart,
  getCartTotal as getCartTotalUtil,
  getCartItemCount as getCartItemCountUtil,
  removeFromCart as removeFromCartUtil,
  updateQuantity as updateQuantityUtil,
} from '@/lib/cart'

type CartContextValue = {
  items: CartItem[]
  itemCount: number
  total: number
  addItem: (
    productId: string | number,
    productName: string,
    productSlug: string,
    categorySlug: string,
    price: number,
    variant?: CartItemVariant,
    image?: string,
    quantity?: number,
  ) => void
  removeItem: (itemId: string) => void
  changeQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Hydrate from localStorage on client side
  useEffect(() => {
    setItems(getCart())
  }, [])

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

  const addItem = useCallback(
    (
      productId: string | number,
      productName: string,
      productSlug: string,
      categorySlug: string,
      price: number,
      variant?: CartItemVariant,
      image?: string,
      quantity = 1,
    ) => {
      const updated = addToCartUtil(productId, productName, productSlug, categorySlug, price, variant, image, quantity)
      setItems(updated)
    },
    [],
  )

  const removeItem = useCallback((itemId: string) => {
    const updated = removeFromCartUtil(itemId)
    setItems(updated)
  }, [])

  const changeQuantity = useCallback((itemId: string, quantity: number) => {
    const updated = updateQuantityUtil(itemId, quantity)
    setItems(updated)
  }, [])

  const clearCart = useCallback(() => {
    clearCartUtil()
    setItems([])
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      total,
      addItem,
      removeItem,
      changeQuantity,
      clearCart,
    }),
    [items, itemCount, total, addItem, removeItem, changeQuantity, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}