/**
 * Product catalog seed data.
 * Colors use structured objects: { value, englishLabel, russianLabel, primaryHex, secondaryHex? }
 * All product specs follow official Apple specifications.
 */

export type ColorSeed = {
  value: string
  englishLabel: string
  russianLabel: string
  primaryHex: string
  secondaryHex?: string
}

export type VariantSeed = {
  color?: ColorSeed
  memory?: string
  simType?: string
  size?: string
  chip?: string
  ram?: string
  screenSize?: string
  connectivity?: string
  price: number
  oldPrice?: number
  status?: 'in_stock' | 'out_of_stock' | 'preorder'
}

export type ProductSeed = {
  categorySlug: string
  model: string
  name: string
  isFeatured?: boolean
  isNew?: boolean
  shortDescription?: string
  price: number
  color?: string
  memory?: string
  simType?: string
  size?: string
  variants?: VariantSeed[]
}

// ─── Color palette (official Apple names) ───
function c(value: string, en: string, ru: string, hex: string, hex2?: string): ColorSeed {
  return { value, englishLabel: en, russianLabel: ru, primaryHex: hex, secondaryHex: hex2 }
}

// iPhone 16 colors
const BLACK        = c('black', 'Black', 'Чёрный', '#1d1d1f')
const WHITE        = c('white', 'White', 'Белый', '#f5f5f7')
const PINK         = c('pink', 'Pink', 'Розовый', '#f4c2c2')
const TEAL         = c('teal', 'Teal', 'Бирюзовый', '#5ac8c8')
const ULTRAMARINE  = c('ultramarine', 'Ultramarine', 'Ультрамарин', '#3f51b5')

// iPhone 16 Pro colors
const BLACK_TI     = c('black-titanium', 'Black Titanium', 'Чёрный титан', '#3a3a3c')
const WHITE_TI     = c('white-titanium', 'White Titanium', 'Белый титан', '#e8e3de')
const NATURAL_TI   = c('natural-titanium', 'Natural Titanium', 'Натуральный титан', '#a8a39d')
const DESERT_TI    = c('desert-titanium', 'Desert Titanium', 'Пустынный титан', '#c4a882')

// iPad colors
const SILVER       = c('silver', 'Silver', 'Серебристый', '#c0c0c0')
const BLUE         = c('blue', 'Blue', 'Голубой', '#7ec8e3')
const YELLOW       = c('yellow', 'Yellow', 'Жёлтый', '#f9d949')
const SPACE_GRAY   = c('space-gray', 'Space Gray', 'Серый космос', '#8e8e93')
const STARLIGHT    = c('starlight', 'Starlight', 'Сияющая звезда', '#f0e6d3')
const PURPLE       = c('purple', 'Purple', 'Фиолетовый', '#7b5ea7')

// iPad Pro
const SPACE_BLACK  = c('space-black', 'Space Black', 'Чёрный космос', '#2c2c2e')

// MacBook colors
const MIDNIGHT     = c('midnight', 'Midnight', 'Тёмная ночь', '#2c2c2e')
const SKYBLUE      = c('sky-blue', 'Sky Blue', 'Небесно-голубой', '#a1c6ea')

// Apple Watch
const ROSE_GOLD    = c('rose-gold', 'Rose Gold', 'Розовое золото', '#e8b4b8')
const JET_BLACK    = c('jet-black', 'Jet Black', 'Глянцевый чёрный', '#0a0a0a')
const SLATE        = c('slate', 'Slate', 'Грифельный', '#6e6e73')

// AirPods Max (USB-C)
const ORANGE       = c('orange', 'Orange', 'Оранжевый', '#f5845c')

type SimType = 'SIM_ESIM' | 'ESIM'
const IPHONE_SIM_TYPES: SimType[] = ['SIM_ESIM', 'ESIM']

type ModelDef = {
  categorySlug: string
  model: string
  colors: ColorSeed[]
  memories: string[]
  basePrice: number
  priceStep?: number
  simTypes?: SimType[]
  chip?: string
  ram?: string
  screenSize?: string
  connectivity?: string
  isFeatured?: boolean
  isNew?: boolean
  shortDescription?: string
  memoriesAreSize?: boolean
}

function expand(m: ModelDef): ProductSeed {
  const variants: VariantSeed[] = []
  const sims: (string | undefined)[] = m.simTypes || [undefined]
  for (const sim of sims) {
    for (const color of m.colors) {
      for (let i = 0; i < m.memories.length; i++) {
        const val = m.memories[i]
        const price = m.basePrice + (m.priceStep || 0) * i
        variants.push({
          color,
          memory: m.memoriesAreSize ? undefined : (val || undefined),
          size: m.memoriesAreSize ? val : undefined,
          simType: sim,
          chip: m.chip,
          ram: m.ram,
          screenSize: m.screenSize,
          connectivity: m.connectivity,
          price,
        })
      }
    }
  }
  return {
    categorySlug: m.categorySlug,
    model: m.model,
    name: m.model,
    price: m.basePrice,
    isFeatured: m.isFeatured,
    isNew: m.isNew,
    shortDescription: m.shortDescription,
    variants,
  }
}

// ─── iPhone 16 (official: Black, White, Pink, Teal, Ultramarine / 128GB, 256GB, 512GB) ───
const iphone16: ModelDef[] = [
  {
    categorySlug: 'iphone', model: 'iPhone 16',
    colors: [BLACK, WHITE, PINK, TEAL, ULTRAMARINE],
    memories: ['128GB', '256GB', '512GB'], basePrice: 55000, priceStep: 9500,
    simTypes: IPHONE_SIM_TYPES,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Plus',
    colors: [BLACK, WHITE, PINK, TEAL, ULTRAMARINE],
    memories: ['128GB', '256GB', '512GB'], basePrice: 66000, priceStep: 5500,
    simTypes: IPHONE_SIM_TYPES,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Pro',
    colors: [BLACK_TI, WHITE_TI, NATURAL_TI, DESERT_TI],
    memories: ['128GB', '256GB', '512GB', '1TB'], basePrice: 82000, priceStep: 14000,
    simTypes: IPHONE_SIM_TYPES,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Pro Max',
    colors: [BLACK_TI, WHITE_TI, NATURAL_TI, DESERT_TI],
    memories: ['256GB', '512GB', '1TB'], basePrice: 96000, priceStep: 16000,
    simTypes: IPHONE_SIM_TYPES,
  },
]

// ─── iPad (A16) — official: Blue, Pink, Yellow, Silver / 128GB, 256GB ───
const ipads: ModelDef[] = [
  {
    categorySlug: 'ipad', model: 'iPad (A16)',
    colors: [BLUE, PINK, YELLOW, SILVER],
    memories: ['128GB', '256GB'], basePrice: 31000, priceStep: 9500,
    connectivity: 'Wi-Fi', chip: 'A16',
  },
  {
    categorySlug: 'ipad', model: 'iPad Air 11″ M3',
    colors: [SPACE_GRAY, STARLIGHT, PURPLE, BLUE],
    memories: ['128GB', '256GB', '512GB', '1TB'], basePrice: 47500, priceStep: 6500,
    connectivity: 'Wi-Fi', chip: 'M3', screenSize: '11″', isFeatured: true,
  },
  {
    categorySlug: 'ipad', model: 'iPad Air 13″ M3',
    colors: [SPACE_GRAY, STARLIGHT, PURPLE, BLUE],
    memories: ['128GB', '256GB', '512GB', '1TB'], basePrice: 60500, priceStep: 9500,
    connectivity: 'Wi-Fi', chip: 'M3', screenSize: '13″',
  },
  {
    categorySlug: 'ipad', model: 'iPad Pro 11″ M4',
    colors: [SPACE_BLACK, SILVER],
    memories: ['256GB', '512GB', '1TB', '2TB'], basePrice: 75000, priceStep: 15000,
    connectivity: 'Wi-Fi', chip: 'M4', screenSize: '11″',
  },
  {
    categorySlug: 'ipad', model: 'iPad Pro 13″ M4',
    colors: [SPACE_BLACK, SILVER],
    memories: ['256GB', '512GB', '1TB', '2TB'], basePrice: 90000, priceStep: 18000,
    connectivity: 'Wi-Fi', chip: 'M4', screenSize: '13″',
  },
]

// ─── MacBook (official specs) ───
const macbooks: ModelDef[] = [
  {
    categorySlug: 'macbook', model: 'MacBook Air 13″ M4',
    colors: [SKYBLUE, MIDNIGHT, STARLIGHT, SILVER],
    memories: ['256GB', '512GB', '1TB', '2TB'], basePrice: 85000, priceStep: 18500,
    chip: 'M4', ram: '16 ГБ', screenSize: '13.6″',
    isFeatured: true,
  },
  {
    categorySlug: 'macbook', model: 'MacBook Air 15″ M4',
    colors: [SKYBLUE, MIDNIGHT, STARLIGHT, SILVER],
    memories: ['256GB', '512GB', '1TB', '2TB'], basePrice: 94500, priceStep: 21500,
    chip: 'M4', ram: '16 ГБ', screenSize: '15.3″',
  },
  {
    categorySlug: 'macbook', model: 'MacBook Pro 14″ M4',
    colors: [SPACE_BLACK, SILVER],
    memories: ['512GB', '1TB', '2TB'], basePrice: 120000, priceStep: 12000,
    chip: 'M4', ram: '24 ГБ', screenSize: '14.2″',
  },
  {
    categorySlug: 'macbook', model: 'MacBook Pro 14″ M4 Pro',
    colors: [SPACE_BLACK, SILVER],
    memories: ['512GB', '1TB', '2TB'], basePrice: 160000, priceStep: 15000,
    chip: 'M4 Pro', ram: '24 ГБ', screenSize: '14.2″', isNew: true,
  },
  {
    categorySlug: 'macbook', model: 'MacBook Pro 16″ M4 Pro',
    colors: [SPACE_BLACK, SILVER],
    memories: ['512GB', '1TB', '2TB'], basePrice: 200000, priceStep: 18000,
    chip: 'M4 Pro', ram: '24 ГБ', screenSize: '16.2″', isNew: true,
  },
]

// ─── Apple Watch (official specs) ───
// SE 2: Midnight, Starlight, Silver — 40mm, 44mm
// Series 10 (aluminium): Jet Black, Rose Gold, Silver — 42mm, 46mm
// Series 11 will likely mirror S10 plus Slate — 42mm, 46mm
const watches: ModelDef[] = [
  {
    categorySlug: 'apple-watch', model: 'Apple Watch SE (2-го поколения)',
    colors: [MIDNIGHT, STARLIGHT, SILVER],
    memories: ['40mm', '44mm'], basePrice: 18000, priceStep: 1000,
    memoriesAreSize: true,
  },
  {
    categorySlug: 'apple-watch', model: 'Apple Watch Series 10',
    colors: [JET_BLACK, ROSE_GOLD, SILVER],
    memories: ['42mm', '46mm'], basePrice: 25000, priceStep: 3000,
    isFeatured: true, memoriesAreSize: true,
  },
  {
    categorySlug: 'apple-watch', model: 'Apple Watch Series 11', isNew: true,
    colors: [JET_BLACK, ROSE_GOLD, SILVER, SLATE],
    memories: ['42mm', '46mm'], basePrice: 28000, priceStep: 3000,
    memoriesAreSize: true,
  },
  {
    categorySlug: 'apple-watch', model: 'Apple Watch Ultra 2',
    colors: [c('natural-titanium', 'Natural Titanium', 'Натуральный титан', '#a8a39d'), c('black-titanium', 'Black Titanium', 'Чёрный титан', '#3a3a3c')],
    memories: ['49mm'], basePrice: 58000, priceStep: 0,
    memoriesAreSize: true,
  },
]

// ─── AirPods ───
const airpods: ProductSeed[] = [
  { categorySlug: 'airpods', model: 'EarPods USB-C', name: 'EarPods USB-C', color: 'White', price: 2990,
    shortDescription: 'Проводные EarPods с разъёмом USB-C для iPhone, iPad и MacBook.' },
  { categorySlug: 'airpods', model: 'EarPods Lightning', name: 'EarPods Lightning', color: 'White', price: 2490,
    shortDescription: 'Проводные EarPods с Lightning для совместимых iPhone.' },
  { categorySlug: 'airpods', model: 'AirPods 4', name: 'AirPods 4', color: 'White', price: 11000,
    shortDescription: 'Базовые беспроводные AirPods четвёртого поколения.' },
  { categorySlug: 'airpods', model: 'AirPods 4 ANC', name: 'AirPods 4 с шумоподавлением', color: 'White', price: 14600,
    shortDescription: 'AirPods 4 с активным шумоподавлением и компактным кейсом.' },
  { categorySlug: 'airpods', model: 'AirPods Pro 2', name: 'AirPods Pro 2 USB-C', color: 'White', price: 16000,
    shortDescription: 'AirPods Pro 2 с USB-C, шумоподавлением и режимом прозрачности.', isFeatured: true },
  { categorySlug: 'airpods', model: 'AirPods Max USB-C', name: 'AirPods Max USB-C', price: 42500, variants: [
    { color: MIDNIGHT, price: 42500 },
    { color: STARLIGHT, price: 42500 },
    { color: ORANGE, price: 42500 },
    { color: PURPLE, price: 42500 },
    { color: BLUE, price: 42500 },
  ] },
]

// ─── PlayStation ───
const playstation: ProductSeed[] = [
  { categorySlug: 'playstation', model: 'PlayStation 5 Pro', name: 'PlayStation 5 Pro', color: 'White', memory: '2TB', price: 78000, isFeatured: true,
    shortDescription: 'Флагманская консоль PlayStation с SSD 2 ТБ.' },
  { categorySlug: 'playstation', model: 'PlayStation 5 Slim Disc', name: 'PlayStation 5 Slim с дисководом', color: 'White', price: 49000 },
  { categorySlug: 'playstation', model: 'PlayStation 5 Slim Digital', name: 'PlayStation 5 Slim Цифровая', color: 'White', price: 45500 },
]

// ─── Accessories ───
const accessories: ProductSeed[] = [
  { categorySlug: 'accessories', model: 'Кабель USB-C — Lightning 1м', name: 'Кабель USB-C — Lightning 1м', color: 'White', price: 1990 },
  { categorySlug: 'accessories', model: 'Кабель USB-C — Lightning 2м', name: 'Кабель USB-C — Lightning 2м', color: 'White', price: 2590 },
  { categorySlug: 'accessories', model: 'Кабель USB-C — USB-C в оплётке 1м', name: 'Кабель USB-C — USB-C в оплётке 1м', color: 'White', price: 2490 },
  { categorySlug: 'accessories', model: 'Кабель USB-C — USB-C в оплётке 2м', name: 'Кабель USB-C — USB-C в оплётке 2м', color: 'White', price: 2990 },
  { categorySlug: 'accessories', model: 'Зарядка USB-C 20W', name: 'Зарядка USB-C 20W', color: 'White', price: 2800 },
  { categorySlug: 'accessories', model: 'Защитное стекло Remax Premium', name: 'Защитное стекло Remax Premium', price: 1500 },
  { categorySlug: 'accessories', model: 'Защитное стекло Remax антишпион', name: 'Защитное стекло Remax антишпион', price: 1800 },
  { categorySlug: 'accessories', model: 'Защитное стекло Supglass', name: 'Защитное стекло Supglass (без рамок)', price: 2490 },
]

// ─── Combine all ───
const allVariants: ModelDef[] = [
  ...iphone16, ...ipads, ...macbooks, ...watches,
]

export const ALL_PRODUCTS: ProductSeed[] = [
  ...allVariants.map(expand),
  ...airpods,
  ...playstation,
  ...accessories,
]
