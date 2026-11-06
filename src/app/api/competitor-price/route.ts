import { NextRequest, NextResponse } from 'next/server'

import { isAllowedCompetitorUrl, parseRepremiumPrice, renderCompetitorPricePage, type CompetitorPrice } from '@/lib/competitor-price'

export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 25000
const cache = new Map<string, { at: number; item: CompetitorPrice }>()

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ru-RU,ru;q=0.9',
}

function plain(status: number, message: string) {
  return new NextResponse(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  const url = isAllowedCompetitorUrl(request.nextUrl.searchParams.get('url') || '')
  if (!url) return plain(400, 'Укажите ссылку на страницу repremium.ru в параметре url')
  const key = url.toString()

  const cached = cache.get(key)
  let item = cached && Date.now() - cached.at < CACHE_TTL_MS ? cached.item : null

  if (!item) {
    try {
      const response = await fetch(key, { headers, redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' })
      if (!response.ok || !isAllowedCompetitorUrl(response.url)) return plain(502, `Страница недоступна (${response.status})`)
      item = parseRepremiumPrice(await response.text())
    } catch {
      return plain(502, 'Не удалось открыть страницу конкурента')
    }
    if (!item) return plain(502, 'Цена «без расширенной гарантии» на странице не найдена')
    cache.set(key, { at: Date.now(), item })
  }

  return new NextResponse(renderCompetitorPricePage(item, key), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
