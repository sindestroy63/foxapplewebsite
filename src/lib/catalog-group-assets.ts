import type { Media } from './types'
import { getMediaUrl } from './media'

type GroupAsset = { mediaId: number; filename: string; alt: string }

export const CATALOG_GROUP_ASSETS: Record<string, GroupAsset> = {
  smartphones: { mediaId: 626, filename: 'black-18.jpg', alt: 'Смартфоны' },
  tablets: { mediaId: 443, filename: 'silver-11.jpg', alt: 'Планшеты' },
  laptops: { mediaId: 503, filename: 'IMG_20260502_115800.png', alt: 'Ноутбуки' },
  'smart-watches': { mediaId: 689, filename: 'IMG_20260502_130843-4.png', alt: 'Смарт-часы' },
  audio: { mediaId: 647, filename: 'IMG_20260502_150133.png', alt: 'Наушники и аудио' },
  'gaming-consoles': { mediaId: 666, filename: 'IMG_20260502_152340.png', alt: 'Игровые консоли' },
  'home-appliances': { mediaId: 767, filename: '51151349_762_q70.webp', alt: 'Бытовая техника' },
  'smart-devices': { mediaId: 1642, filename: 'vz30zu2ozr48712gsu31zzea6ie6itkg.jpg', alt: 'Умные устройства' },
  other: { mediaId: 686, filename: 'ремах.jpg', alt: 'Другое' },
}

export const heroMedia = { mediaId: 1410, filename: 'video_2026-08-02_13-19-21.mp4', type: 'video' as const }

export function catalogGroupAssetUrl(slug: string): string | null {
  const asset = CATALOG_GROUP_ASSETS[slug]
  return asset ? getMediaUrl({ id: asset.mediaId, filename: asset.filename } as Media, 'card') : null
}
