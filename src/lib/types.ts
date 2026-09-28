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

export type CatalogSort = 'relevance' | 'price_asc' | 'price_desc' | 'name'

export type ProductGroup =
  | 'smartphones'
  | 'tablets'
  | 'laptops'
  | 'smart-watches'
  | 'audio'
  | 'gaming-consoles'
  | 'home-appliances'
  | 'smart-devices'
  | 'accessories'
  | 'other'
  | 'trade-in'

export type CatalogFilters = {
  query?: string
  sort?: CatalogSort
  productGroup?: ProductGroup
  condition?: 'new' | 'used'
  brand?: string
  line?: string
  appleAccessories?: boolean
  category?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  storage?: string
  color?: string
  sim?: string
  ram?: string
}

export type VariantColor = {
  value?: string
  englishLabel?: string
  russianLabel?: string
  primaryHex?: string
  secondaryHex?: string
}

export type ProductVariant = {
  id?: string
  sku?: string
  color?: VariantColor
  memory?: string
  simType?: string
  size?: string
  hasTouchId?: boolean | null
  storage?: string
  sim?: string
  chip?: string
  ram?: string
  screenSize?: string
  connectivity?: string
  generation?: string
  revision?: string
  packageLabel?: string
  material?: string
  strapSize?: string
  price: number
  oldPrice?: number
  status?: ProductStatus
  isAvailable?: boolean
  images?: Array<Media | string | number>
}

export type ColorImageGroup = {
  color?: VariantColor | string | number
  images?: Array<Media | string | number>
}

export type Product = {
  id: string | number
  category?: Category | string | number
  name: string
  slug: string
  model?: string
  productGroup?: ProductGroup
  brand?: string
  productType?: string
  productLine?: string
  deviceType?: string
  sku?: string
  badge?: string
  memory?: string
  color?: string
  simType?: string
  size?: string
  price: number
  oldPrice?: number
  currency?: string
  status?: ProductStatus
  isAvailable?: boolean
  hideUnavailableColors?: boolean
  isFeatured?: boolean
  isNew?: boolean
  sortOrder?: number
  chip?: string
  ram?: string
  screenSize?: string
  connectivity?: string
  generation?: string
  revision?: string
  packageLabel?: string
  hasTouchId?: boolean | null
  shortDescription?: string
  description?: unknown
  images?: Array<Media | string | number>
  colorImages?: ColorImageGroup[]
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
}

export type SiteAppearance = {
  heroVideo?: Media | string | number
  heroSlides?: Array<Media | string | number>
  bestOffers?: Array<Product | string | number>
}

export type PageDoc = {
  id: string | number
  title: string
  slug: string
  content?: unknown
  seoTitle?: string
  seoDescription?: string
}

export type CartItemVariant = {
  color?: {
    value: string
    englishLabel: string
    russianLabel?: string
    primaryHex?: string
  }
  memory?: string
  simType?: string
  size?: string
  chip?: string
  screenSize?: string
  revision?: string
}

export type CartItem = {
  id: string
  productId: string | number
  productName: string
  productSlug: string
  categorySlug: string
  variant?: CartItemVariant
  quantity: number
  price: number
  image?: string
}

export type CartState = {
  items: CartItem[]
}
