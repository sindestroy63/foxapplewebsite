import { CONTACTS } from './constants'
import type { Product, ProductStatus } from './types'

export { cardPrice } from './pricing'

export function formatPrice(price?: number | null): string {
  if (typeof price !== 'number') {
    return 'Цена по запросу'
  }

  return `${Math.round(price).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ₽`
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

function yandexMapQuery(address?: string): string {
  return encodeURIComponent(`Самара, ${address || CONTACTS.address}`)
}

export function mapEmbedUrl(address?: string, _mapUrl?: string): string {
  return `https://yandex.ru/map-widget/v1/?mode=search&text=${yandexMapQuery(address)}&z=17&lang=ru_RU`
}

export function mapLinkUrl(address?: string, _mapUrl?: string): string {
  return `https://yandex.ru/maps/?mode=search&text=${yandexMapQuery(address)}&z=17`
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
