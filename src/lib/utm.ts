'use client'

export type UtmParams = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

/**
 * Извлекает UTM-метки из URL
 */
export function getUtmParams(): UtmParams {
  if (typeof window === 'undefined') {
    return {}
  }

  const params = new URLSearchParams(window.location.search)
  const utm: UtmParams = {}

  const utmSource = params.get('utm_source')
  const utmMedium = params.get('utm_medium')
  const utmCampaign = params.get('utm_campaign')
  const utmTerm = params.get('utm_term')
  const utmContent = params.get('utm_content')

  if (utmSource) utm.utm_source = utmSource
  if (utmMedium) utm.utm_medium = utmMedium
  if (utmCampaign) utm.utm_campaign = utmCampaign
  if (utmTerm) utm.utm_term = utmTerm
  if (utmContent) utm.utm_content = utmContent

  return utm
}

/**
 * Преобразует UTM-параметры в строку для hidden input
 */
export function utmToString(utm: UtmParams): string {
  return JSON.stringify(utm)
}

/**
 * Форматирует UTM-метки для Telegram-сообщения
 */
export function formatUtmForTelegram(utm: UtmParams): string {
  const lines: string[] = []

  if (utm.utm_source) lines.push(`   Source: ${utm.utm_source}`)
  if (utm.utm_medium) lines.push(`   Medium: ${utm.utm_medium}`)
  if (utm.utm_campaign) lines.push(`   Campaign: ${utm.utm_campaign}`)
  if (utm.utm_term) lines.push(`   Term: ${utm.utm_term}`)
  if (utm.utm_content) lines.push(`   Content: ${utm.utm_content}`)

  return lines.join('\n')
}