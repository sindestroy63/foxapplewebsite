import { revalidateTag } from 'next/cache'

export const BRAND_NAVIGATION_TAG = 'brand-navigation'
export const BRAND_NAVIGATION_REVALIDATE_SECONDS = 30

export function invalidateBrandNavigation(): void {
  try {
    revalidateTag(BRAND_NAVIGATION_TAG, { expire: 0 })
  } catch {
    return
  }
}
