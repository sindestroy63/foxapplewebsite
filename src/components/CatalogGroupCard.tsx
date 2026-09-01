import Link from 'next/link'
import { catalogGroupAssetUrl } from '@/lib/catalog-group-assets'
import { getMediaUrl } from '@/lib/media'
import type { Media } from '@/lib/types'

export function CatalogGroupCard({ slug, label, compact = false, coverImage, href }: { slug: string; label: string; compact?: boolean; coverImage?: Media | null; href?: string }) {
  const image = getMediaUrl(coverImage, 'card') || catalogGroupAssetUrl(slug)
  return <Link className={compact ? 'catalog-group-card catalog-group-card--compact' : 'catalog-group-card'} href={href || `/catalog?group=${slug}`}>
    {image ? <img className="catalog-group-card-image" src={image} alt="" loading="lazy" /> : <span className="catalog-group-card-image catalog-group-card-image--placeholder" aria-hidden="true" />}
    <span className="catalog-group-card-overlay" aria-hidden="true" />
    <span className="catalog-group-card-content"><span className="catalog-group-card-name">{label}</span><span className="catalog-group-card-action">Смотреть <span aria-hidden="true">→</span></span></span>
  </Link>
}
