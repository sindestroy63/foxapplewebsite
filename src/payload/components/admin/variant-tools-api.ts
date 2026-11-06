export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data !== null && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'Не удалось выполнить запрос.'
    throw new Error(message)
  }
  return data as T
}

export function formatPrice(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('ru-RU').replace(/\u00a0|\u202f/g, ' ')} ₽`
}

export const STATUS_LABELS: Record<string, string> = {
  in_stock: 'В наличии',
  preorder: 'Под заказ',
  out_of_stock: 'Нет в наличии',
}
