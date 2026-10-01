import { catalogPlacementHref, getCatalogPlacementByChildKey } from './product-catalog-placement'

export type CatalogNavigationLink = {
  key?: string
  href?: string
  filter?: Record<string, string>
  preserveKey?: boolean
}

function hrefFromFilter(filter?: Record<string, string>): string | undefined {
  if (!filter) return undefined
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `/catalog?${query}` : undefined
}

/** Resolves a CMS navigation node to its canonical public catalog destination. */
export function catalogNavigationHref(node: CatalogNavigationLink): string {
  const placement = getCatalogPlacementByChildKey(node.key)
  if (placement) {
    const href = catalogPlacementHref(placement)
    return `${href}${href.includes('?') ? '&' : '?'}placement=${encodeURIComponent(String(node.key))}`
  }
  const filtered = hrefFromFilter(node.filter)
  const base = filtered && (!node.href || node.href === '/catalog') ? filtered : node.href?.trim() || filtered || '/catalog'
  if (node.preserveKey && node.key) return `${base}${base.includes('?') ? '&' : '?'}placement=${encodeURIComponent(node.key)}`
  return base
}