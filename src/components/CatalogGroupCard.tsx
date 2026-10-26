import Link from 'next/link'
import { catalogGroupAssetUrl } from '@/lib/catalog-group-assets'
import { getMediaUrl } from '@/lib/media'
import type { Media } from '@/lib/types'
import { catalogNavigationHref, type CatalogNavigationLink } from '@/lib/catalog-navigation-url'

export function CatalogGroupCard({ slug, label, compact = false, coverImage, href, navigationNode }: { slug: string; label: string; compact?: boolean; coverImage?: Media | null; href?: string; navigationNode?: CatalogNavigationLink }) {
  const image = getMediaUrl(coverImage, 'card') || catalogGroupAssetUrl(slug)
  const destination = navigationNode ? catalogNavigationHref(navigationNode) : href || `/catalog?group=${slug}`
  return <Link className={compact ? 'catalog-group-card catalog-group-card--compact' : 'catalog-group-card'} href={destination} aria-label={label}>
    {image ? <img className="catalog-group-card-image" src={image} alt="" loading="lazy" /> : <span className="catalog-group-card-image catalog-group-card-image--placeholder" aria-hidden="true" />}
  </Link>
}
