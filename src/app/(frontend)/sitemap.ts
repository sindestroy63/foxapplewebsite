import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/constants'
import { getCategories, getProducts } from '@/lib/cms'
import type { Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

function categorySlug(productCategory: unknown): string | null {
  if (productCategory && typeof productCategory === 'object' && 'slug' in productCategory) {
    return (productCategory as Category).slug
  }

  return null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, '')
  const staticRoutes = [
    '',
    '/catalog',
    '/installment',
    '/trade-in',
    '/warranty',
    '/contacts',
    '/privacy',
    '/personal-data-consent',
    '/offer',
    '/purchase-return',
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }))

  const [categories, products] = await Promise.all([getCategories(), getProducts({ limit: 1000 })])

  const categoryRoutes = categories.map((category) => ({
    url: `${base}/catalog/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const productRoutes = products
    .map((product) => {
      const slug = categorySlug(product.category)
      if (!slug) {
        return null
      }

      return {
        url: `${base}/catalog/${slug}/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.6,
      }
    })
    .filter((route): route is NonNullable<typeof route> => Boolean(route))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
