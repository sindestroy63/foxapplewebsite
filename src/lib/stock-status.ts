import type { ProductStatus } from './types'

export const IN_STOCK_LABEL = 'В наличии'
export const PREORDER_LABEL = 'Под заказ'
export const OUT_OF_STOCK_LABEL = 'Под заказ 1 рабочий день'

export function statusLabel(status?: ProductStatus): string {
  switch (status) {
    case 'preorder':
      return PREORDER_LABEL
    case 'out_of_stock':
      return OUT_OF_STOCK_LABEL
    case 'in_stock':
    default:
      return IN_STOCK_LABEL
  }
}

export function statusTone(status?: ProductStatus): 'green' | 'orange' | 'gray' {
  switch (status) {
    case 'preorder':
    case 'out_of_stock':
      return 'orange'
    case 'in_stock':
    default:
      return 'green'
  }
}
