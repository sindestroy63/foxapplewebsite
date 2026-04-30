export type Category = {
  id: string | number
  name: string
  slug: string
  sortOrder?: number
  isActive?: boolean
  coverImage?: Media | string | number
}

export type Media = {
  id: string | number
  alt?: string
  url?: string
  filename?: string
  mimeType?: string
  sizes?: {
    thumbnail?: { url?: string; filename?: string; mimeType?: string }
    card?: { url?: string; filename?: string; mimeType?: string }
    detail?: { url?: string; filename?: string; mimeType?: string }
  }
}

export type ProductStatus = 'in_stock' | 'preorder' | 'out_of_stock'

export type CatalogSort = 'price_asc' | 'price_desc'

export type CatalogFilters = {
  query?: string
  sort?: CatalogSort
}

export type ProductVariant = {
  id?: string
  color?: string
  colorHex?: string
  colorSecondaryHex?: string
  memory?: string
  simType?: string
  size?: string
  chip?: string
  ram?: string
  screenSize?: string
  connectivity?: string
  price: number
  oldPrice?: number
  status?: ProductStatus
  isAvailable?: boolean
  images?: Array<Media | string | number>
}

export type Product = {
  id: string | number
  category?: Category | string | number
  name: string
  slug: string
  model?: string
  memory?: string
  color?: string
  simType?: string
  size?: string
  price: number
  oldPrice?: number
  currency?: string
  status?: ProductStatus
  isAvailable?: boolean
  isFeatured?: boolean
  isNew?: boolean
  sortOrder?: number
  shortDescription?: string
  description?: unknown
  images?: Array<Media | string | number>
  variants?: ProductVariant[]
  seoTitle?: string
  seoDescription?: string
}

export type SiteSettings = {
  shopName?: string
  phone?: string
  telegramUsername?: string
  telegramChannelUrl?: string
  whatsappUrl?: string
  address?: string
  workTime?: string
  mapUrl?: string
  mainDomain?: string
  secondaryDomain?: string
  heroTitle?: string
  heroSubtitle?: string
  aboutText?: string
  homepageMediaTitle?: string
  homepageMediaText?: string
  homepageMedia?: Array<Media | string | number>
}

export type SiteAppearance = {
  heroVideo?: Media | string | number
  mediaBlockTitle?: string
  mediaBlockText?: string
  mediaBlockItems?: Array<Media | string | number>
}

export type PageDoc = {
  id: string | number
  title: string
  slug: string
  content?: unknown
  seoTitle?: string
  seoDescription?: string
}
