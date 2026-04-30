/**
 * Product catalog seed data.
 * Each entry produces one product with a variants array.
 */

export type VariantSeed = {
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

type SimType = 'SIM_ESIM' | 'ESIM' | 'SIM_SIM'

const IPHONE_SIM_TYPES: SimType[] = ['SIM_ESIM', 'ESIM', 'SIM_SIM']

/** Color name → [primaryHex, secondaryHex?] */
const COLOR_HEX: Record<string, [string, string?]> = {
  'Чёрный': ['#1d1d1f'],
  'Белый': ['#f5f5f7'],
  'Розовый': ['#f4c2c2'],
  'Бирюзовый': ['#5ac8c8'],
  'Ультрамарин': ['#3f51b5'],
  'Чёрный титан': ['#3a3a3c'],
  'Белый титан': ['#e8e3de'],
  'Натуральный титан': ['#a8a39d'],
  'Пустынный титан': ['#c4a882'],
  'Лавандовый': ['#b8a9c9'],
  'Голубой': ['#7ec8e3'],
  'Шалфей': ['#b2c9ab'],
  'Серебристый': ['#c0c0c0'],
  'Тёмно-синий': ['#1d3557'],
  'Космический оранжевый': ['#e07c4f'],
  'Светло-голубой': ['#aed9e0'],
  'Золотой': ['#d4af37'],
  'Серый': ['#8e8e93'],
  'Сияющая звезда': ['#f0e6d3'],
  'Фиолетовый': ['#7b5ea7'],
  'Жёлтый': ['#f9d949'],
  'Небесно-голубой': ['#a1c6ea'],
  'Тёмная ночь': ['#2c2c2e'],
  'Розовое золото': ['#e8b4b8'],
  'Оранжевый': ['#f5845c'],
  'Прозрачный': ['#e0e0e0'],
}

type ModelDef = {
  categorySlug: string
  model: string
  colors: string[]
  memories: string[]
  basePrice: number
  priceStep?: number
  simType?: string
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
      const [hex, hex2] = COLOR_HEX[color] || []
      for (let i = 0; i < m.memories.length; i++) {
        const val = m.memories[i]
        const price = m.basePrice + (m.priceStep || 0) * i
        variants.push({
          color,
          colorHex: hex,
          colorSecondaryHex: hex2,
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

// ─── iPhone 16 ───
const iphone16: ModelDef[] = [
  {
    categorySlug: 'iphone', model: 'iPhone 16',
    colors: ['Чёрный', 'Белый', 'Розовый', 'Бирюзовый', 'Ультрамарин'],
    memories: ['128GB', '256GB'], basePrice: 55000, priceStep: 9500,
    simTypes: IPHONE_SIM_TYPES,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Plus',
    colors: ['Чёрный', 'Белый', 'Розовый', 'Бирюзовый', 'Ультрамарин'],
    memories: ['128GB', '256GB'], basePrice: 66000, priceStep: 5500,
    simTypes: IPHONE_SIM_TYPES,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Pro',
    colors: ['Чёрный титан', 'Белый титан', 'Натуральный титан', 'Пустынный титан'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 82000, priceStep: 16000,
    simTypes: IPHONE_SIM_TYPES,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Pro Max',
    colors: ['Чёрный титан', 'Белый титан', 'Натуральный титан', 'Пустынный титан'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 96000, priceStep: 16000,
    simTypes: IPHONE_SIM_TYPES,
  },
]

// ─── iPhone 17 ───
const iphone17: ModelDef[] = [
  {
    categorySlug: 'iphone', model: 'iPhone 17', isNew: true,
    colors: ['Чёрный', 'Белый', 'Лавандовый', 'Голубой', 'Шалфей'],
    memories: ['256GB', '512GB'], basePrice: 62500, priceStep: 18500,
    simTypes: IPHONE_SIM_TYPES, isFeatured: true,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 17 Pro', isNew: true,
    colors: ['Серебристый', 'Тёмно-синий', 'Космический оранжевый'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 98500, priceStep: 16000,
    simTypes: IPHONE_SIM_TYPES, isFeatured: true,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 17 Pro Max', isNew: true,
    colors: ['Серебристый', 'Тёмно-синий', 'Космический оранжевый'],
    memories: ['256GB', '512GB', '1TB', '2TB'], basePrice: 108000, priceStep: 15000,
    simTypes: IPHONE_SIM_TYPES, isFeatured: true,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 17 Air', isNew: true,
    colors: ['Чёрный', 'Светло-голубой', 'Белый', 'Золотой'],
    memories: ['256GB', '512GB'], basePrice: 70500, priceStep: 10000,
    simTypes: IPHONE_SIM_TYPES,
  },
]

// ─── iPad ───
const ipads: ModelDef[] = [
  {
    categorySlug: 'ipad', model: 'iPad 11 A16',
    colors: ['Серебристый', 'Голубой', 'Розовый', 'Жёлтый'],
    memories: ['128GB', '256GB'], basePrice: 31000, priceStep: 9500,
    connectivity: 'Wi-Fi', chip: 'A16',
  },
  {
    categorySlug: 'ipad', model: 'iPad Air 11 M3',
    colors: ['Серый', 'Сияющая звезда', 'Фиолетовый', 'Голубой'],
    memories: ['128GB', '256GB'], basePrice: 47500, priceStep: 6500,
    connectivity: 'Wi-Fi', chip: 'M3', screenSize: '11"', isFeatured: true,
  },
  {
    categorySlug: 'ipad', model: 'iPad Air 13 M3',
    colors: ['Серый', 'Голубой', 'Сияющая звезда', 'Фиолетовый'],
    memories: ['128GB', '256GB'], basePrice: 60500, priceStep: 9500,
    connectivity: 'Wi-Fi', chip: 'M3', screenSize: '13"',
  },
  {
    categorySlug: 'ipad', model: 'iPad Pro 11 M4',
    colors: ['Чёрный', 'Серебристый'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 75000, priceStep: 15000,
    connectivity: 'Wi-Fi', chip: 'M4', screenSize: '11"',
  },
  {
    categorySlug: 'ipad', model: 'iPad Pro 13 M4',
    colors: ['Чёрный', 'Серебристый'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 90000, priceStep: 18000,
    connectivity: 'Wi-Fi', chip: 'M4', screenSize: '13"',
  },
]

// ─── MacBook ───
const macbooks: ModelDef[] = [
  {
    categorySlug: 'macbook', model: 'MacBook Air 13 M4',
    colors: ['Небесно-голубой', 'Тёмная ночь', 'Сияющая звезда', 'Серебристый'],
    memories: ['256GB', '512GB'], basePrice: 85000, priceStep: 18500,
    chip: 'M4', ram: '16 ГБ', screenSize: '13"',
    isFeatured: true,
  },
  {
    categorySlug: 'macbook', model: 'MacBook Air 15 M4',
    colors: ['Небесно-голубой', 'Тёмная ночь', 'Сияющая звезда', 'Серебристый'],
    memories: ['256GB', '512GB'], basePrice: 94500, priceStep: 21500,
    chip: 'M4', ram: '16 ГБ', screenSize: '15"',
  },
  {
    categorySlug: 'macbook', model: 'MacBook Pro 14 M5', isNew: true,
    colors: ['Чёрный', 'Серебристый'],
    memories: ['512GB', '1TB'], basePrice: 130000, priceStep: 9000,
    chip: 'M5', ram: '24 ГБ', screenSize: '14"',
  },
  {
    categorySlug: 'macbook', model: 'MacBook Pro 16 M5 Pro', isNew: true,
    colors: ['Чёрный', 'Серебристый'],
    memories: ['512GB', '1TB'], basePrice: 220000, priceStep: 15000,
    chip: 'M5 Pro', ram: '36 ГБ', screenSize: '16"',
  },
]

// ─── Apple Watch ───
const watches: ModelDef[] = [
  {
    categorySlug: 'apple-watch', model: 'Apple Watch SE 2',
    colors: ['Тёмная ночь', 'Сияющая звезда', 'Серебристый'],
    memories: ['40mm', '44mm'], basePrice: 18000, priceStep: 1000,
    memoriesAreSize: true,
  },
  {
    categorySlug: 'apple-watch', model: 'Apple Watch Series 10',
    colors: ['Чёрный', 'Розовое золото'],
    memories: ['42mm', '46mm'], basePrice: 25000, priceStep: 3000,
    isFeatured: true, memoriesAreSize: true,
  },
  {
    categorySlug: 'apple-watch', model: 'Apple Watch Series 11', isNew: true,
    colors: ['Чёрный', 'Розовое золото', 'Серебристый'],
    memories: ['42mm', '46mm'], basePrice: 28000, priceStep: 3000,
    memoriesAreSize: true,
  },
]

// ─── AirPods (single-color items) ───
const airpods: ProductSeed[] = [
  { categorySlug: 'airpods', model: 'EarPods USB-C', name: 'EarPods USB-C', color: 'Белый', price: 2990,
    shortDescription: 'Проводные EarPods с разъёмом USB-C для iPhone, iPad и MacBook.' },
  { categorySlug: 'airpods', model: 'EarPods Lightning', name: 'EarPods Lightning', color: 'Белый', price: 2490,
    shortDescription: 'Проводные EarPods с Lightning для совместимых iPhone.' },
  { categorySlug: 'airpods', model: 'AirPods 4', name: 'AirPods 4', color: 'Белый', price: 11000,
    shortDescription: 'Базовые беспроводные AirPods четвёртого поколения.' },
  { categorySlug: 'airpods', model: 'AirPods 4 ANC', name: 'AirPods 4 с шумоподавлением', color: 'Белый', price: 14600,
    shortDescription: 'AirPods 4 с активным шумоподавлением и компактным кейсом.' },
  { categorySlug: 'airpods', model: 'AirPods Pro 2', name: 'AirPods Pro 2 USB-C', color: 'Белый', price: 16000,
    shortDescription: 'AirPods Pro 2 с USB-C, шумоподавлением и режимом прозрачности.', isFeatured: true },
  { categorySlug: 'airpods', model: 'AirPods Pro 3', name: 'AirPods Pro 3', color: 'Белый', price: 19800,
    shortDescription: 'Новое поколение Pro-наушников.', isNew: true },
  { categorySlug: 'airpods', model: 'AirPods Max', name: 'AirPods Max', price: 42500, variants: [
    { color: 'Тёмная ночь', colorHex: '#2c2c2e', price: 42500 },
    { color: 'Сияющая звезда', colorHex: '#f0e6d3', price: 42500 },
    { color: 'Оранжевый', colorHex: '#f5845c', price: 42500 },
    { color: 'Фиолетовый', colorHex: '#7b5ea7', price: 42500 },
    { color: 'Голубой', colorHex: '#7ec8e3', price: 42500 },
  ] },
]

// ─── PlayStation ───
const playstation: ProductSeed[] = [
  { categorySlug: 'playstation', model: 'PlayStation 5 Pro', name: 'PlayStation 5 Pro', color: 'Белый', memory: '2TB', price: 78000, isFeatured: true,
    shortDescription: 'Флагманская консоль PlayStation с SSD 2 ТБ.' },
  { categorySlug: 'playstation', model: 'PlayStation 5 Slim Disc', name: 'PlayStation 5 Slim с дисководом', color: 'Белый', price: 49000 },
  { categorySlug: 'playstation', model: 'PlayStation 5 Slim Digital', name: 'PlayStation 5 Slim Цифровая', color: 'Белый', price: 45500 },
]

// ─── Accessories ───
const accessories: ProductSeed[] = [
  { categorySlug: 'accessories', model: 'Кабель USB-C — Lightning 1м', name: 'Кабель USB-C — Lightning 1м', color: 'Белый', price: 1990 },
  { categorySlug: 'accessories', model: 'Кабель USB-C — Lightning 2м', name: 'Кабель USB-C — Lightning 2м', color: 'Белый', price: 2590 },
  { categorySlug: 'accessories', model: 'Кабель USB-C — USB-C в оплётке 1м', name: 'Кабель USB-C — USB-C в оплётке 1м', color: 'Белый', price: 2490 },
  { categorySlug: 'accessories', model: 'Кабель USB-C — USB-C в оплётке 2м', name: 'Кабель USB-C — USB-C в оплётке 2м', color: 'Белый', price: 2990 },
  { categorySlug: 'accessories', model: 'Зарядка USB-C 20W', name: 'Зарядка USB-C 20W', color: 'Белый', price: 2800 },
  { categorySlug: 'accessories', model: 'Защитное стекло Remax Premium', name: 'Защитное стекло Remax Premium', color: 'Прозрачный', price: 1500 },
  { categorySlug: 'accessories', model: 'Защитное стекло Remax антишпион', name: 'Защитное стекло Remax антишпион', color: 'Прозрачный', price: 1800 },
  { categorySlug: 'accessories', model: 'Защитное стекло Supglass', name: 'Защитное стекло Supglass (без рамок)', color: 'Прозрачный', price: 2490 },
]

// ─── Combine all ───
const allVariants: ModelDef[] = [
  ...iphone16, ...iphone17, ...ipads, ...macbooks, ...watches,
]

export const ALL_PRODUCTS: ProductSeed[] = [
  ...allVariants.map(expand),
  ...airpods,
  ...playstation,
  ...accessories,
]
