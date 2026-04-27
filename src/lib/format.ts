import { CONTACTS } from './constants'
import type { Product, ProductStatus } from './types'

export function formatPrice(price?: number | null): string {
  if (typeof price !== 'number') {
    return 'Цена по запросу'
  }

  return `${Math.round(price).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ₽`
}

export function cardPrice(cashPrice?: number | null): number | null {
  if (typeof cashPrice !== 'number') return null
  return Math.round(cashPrice * 1.16)
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export function telegramUrl(username?: string): string {
  const normalized = (username || CONTACTS.telegramUsername).replace('@', '')
  return `https://t.me/${normalized}`
}

export function telegramLinkProps(username?: string) {
  return {
    href: telegramUrl(username),
    rel: 'noreferrer',
    target: '_blank',
  } as const
}

export function productDisplayTitle(product: Pick<Product, 'model' | 'name'>): string {
  return product.model || product.name
}

export function mapEmbedUrl(address?: string, mapUrl?: string): string {
  if (mapUrl && mapUrl.includes('yandex.ru/map-widget')) {
    return mapUrl
  }

  const { lat, lon } = CONTACTS.mapCoordinates
  return `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=17&l=map&pt=${lon}%2C${lat}%2Cpm2rdm&lang=ru_RU`
}

export function mapLinkUrl(address?: string, mapUrl?: string): string {
  if (mapUrl && !mapUrl.includes('google.com/maps')) {
    return mapUrl
  }

  const addr = address || CONTACTS.address
  const query = encodeURIComponent(addr)
  const { lat, lon } = CONTACTS.mapCoordinates
  return `https://yandex.ru/maps/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}%2Cpm2rdm&text=${query}&mode=search`
}

export function statusLabel(status?: ProductStatus): string {
  switch (status) {
    case 'preorder':
      return 'Под заказ'
    case 'out_of_stock':
      return 'Нет в наличии'
    case 'in_stock':
    default:
      return 'В наличии'
  }
}

export function statusTone(status?: ProductStatus): 'green' | 'orange' | 'gray' {
  switch (status) {
    case 'preorder':
      return 'orange'
    case 'out_of_stock':
      return 'gray'
    case 'in_stock':
    default:
      return 'green'
  }
}
