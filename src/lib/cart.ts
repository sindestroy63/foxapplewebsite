import type { CartItem, CartItemVariant } from './types'

const STORAGE_KEY = 'foxapple-cart'

function generateItemId(
  productId: string | number,
  variant?: CartItemVariant,
): string {
  if (!variant) return String(productId)
  const parts = [String(productId)]
  if (variant.color?.value) parts.push(`c:${variant.color.value}`)
  if (variant.memory) parts.push(`m:${variant.memory}`)
  if (variant.simType) parts.push(`s:${variant.simType}`)
  if (variant.size) parts.push(`sz:${variant.size}`)
  if (variant.chip) parts.push(`ch:${variant.chip}`)
  if (variant.screenSize) parts.push(`sc:${variant.screenSize}`)
  return parts.join('|')
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage may be unavailable (Safari incognito, etc.)
  }
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  return loadCart()
}

export function getCartItemCount(): number {
  const items = getCart()
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function getCartTotal(): number {
  const items = getCart()
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function addToCart(
  productId: string | number,
  productName: string,
  productSlug: string,
  categorySlug: string,
  price: number,
  variant?: CartItemVariant,
  image?: string,
  quantity = 1,
): CartItem[] {
  const items = loadCart()
  const id = generateItemId(productId, variant)
  const existingIndex = items.findIndex((item) => item.id === id)

  if (existingIndex >= 0) {
    items[existingIndex].quantity += quantity
  } else {
    items.push({
      id,
      productId,
      productName,
      productSlug,
      categorySlug,
      variant,
      quantity,
      price,
      image,
    })
  }

  saveCart(items)
  return items
}

export function removeFromCart(itemId: string): CartItem[] {
  const items = loadCart().filter((item) => item.id !== itemId)
  saveCart(items)
  return items
}

export function updateQuantity(itemId: string, quantity: number): CartItem[] {
  const items = loadCart()
  const item = items.find((i) => i.id === itemId)
  if (!item) return items
  item.quantity = Math.max(1, quantity)
  saveCart(items)
  return items
}

export function clearCart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage may be unavailable
  }
}