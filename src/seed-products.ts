/**
 * Product catalog seed data.
 * Each entry in `variants` array produces one product per color × memory combo.
 */

type Variant = {
  categorySlug: string
  model: string
  colors: string[]
  memories: string[]
  basePrice: number
  /** price step per memory tier (added for each tier after first) */
  priceStep?: number
  simType?: string
  isFeatured?: boolean
  isNew?: boolean
  shortDescription?: string
}

export type ProductSeed = {
  categorySlug: string
  color: string
  isFeatured?: boolean
  isNew?: boolean
  memory?: string
  model: string
  name: string
  oldPrice?: number
  price: number
  shortDescription?: string
  simType?: string
  slug?: string
  status?: 'in_stock' | 'out_of_stock' | 'preorder'
}

function expand(v: Variant): ProductSeed[] {
  const out: ProductSeed[] = []
  for (const color of v.colors) {
    for (let i = 0; i < v.memories.length; i++) {
      const mem = v.memories[i]
      const price = v.basePrice + (v.priceStep || 0) * i
      const memLabel = mem ? ` ${mem}` : ''
      out.push({
        categorySlug: v.categorySlug,
        model: v.model,
        name: `${v.model} ${color}${memLabel}`,
        color,
        memory: mem || undefined,
        price,
        simType: v.simType,
        isFeatured: v.isFeatured && i === 0 ? true : undefined,
        isNew: v.isNew,
        shortDescription: v.shortDescription,
      })
    }
  }
  return out
}

// ─── iPhone 16 ───
const iphone16: Variant[] = [
  {
    categorySlug: 'iphone', model: 'iPhone 16',
    colors: ['Чёрный', 'Белый', 'Розовый', 'Бирюзовый', 'Ультрамарин'],
    memories: ['128GB', '256GB'], basePrice: 55000, priceStep: 9500,
    simType: 'SIM + eSIM',
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Plus',
    colors: ['Чёрный', 'Белый', 'Розовый', 'Бирюзовый', 'Ультрамарин'],
    memories: ['128GB', '256GB'], basePrice: 66000, priceStep: 5500,
    simType: 'SIM + eSIM',
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Pro',
    colors: ['Чёрный титан', 'Белый титан', 'Натуральный титан', 'Пустынный титан'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 82000, priceStep: 16000,
    simType: 'eSIM',
  },
  {
    categorySlug: 'iphone', model: 'iPhone 16 Pro Max',
    colors: ['Чёрный титан', 'Белый титан', 'Натуральный титан', 'Пустынный титан'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 96000, priceStep: 16000,
    simType: 'eSIM',
  },
]

// ─── iPhone 17 ───
const iphone17: Variant[] = [
  {
    categorySlug: 'iphone', model: 'iPhone 17', isNew: true,
    colors: ['Чёрный', 'Белый', 'Лавандовый', 'Голубой', 'Шалфей'],
    memories: ['256GB', '512GB'], basePrice: 62500, priceStep: 18500,
    simType: 'eSIM', isFeatured: true,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 17 Pro', isNew: true,
    colors: ['Серебристый', 'Тёмно-синий', 'Космический оранжевый'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 98500, priceStep: 16000,
    simType: 'eSIM', isFeatured: true,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 17 Pro Max', isNew: true,
    colors: ['Серебристый', 'Тёмно-синий', 'Космический оранжевый'],
    memories: ['256GB', '512GB', '1TB', '2TB'], basePrice: 108000, priceStep: 15000,
    simType: 'eSIM', isFeatured: true,
  },
  {
    categorySlug: 'iphone', model: 'iPhone 17 Air', isNew: true,
    colors: ['Чёрный', 'Светло-голубой', 'Белый', 'Золотой'],
    memories: ['256GB', '512GB'], basePrice: 70500, priceStep: 10000,
    simType: 'eSIM',
  },
]

// ─── iPad ───
const ipads: Variant[] = [
  {
    categorySlug: 'ipad', model: 'iPad 11 A16',
    colors: ['Серебристый', 'Голубой', 'Розовый', 'Жёлтый'],
    memories: ['128GB', '256GB'], basePrice: 31000, priceStep: 9500,
    simType: 'Wi-Fi',
  },
  {
    categorySlug: 'ipad', model: 'iPad Air 11 M3',
    colors: ['Серый', 'Сияющая звезда', 'Фиолетовый', 'Голубой'],
    memories: ['128GB', '256GB'], basePrice: 47500, priceStep: 6500,
    simType: 'Wi-Fi', isFeatured: true,
  },
  {
    categorySlug: 'ipad', model: 'iPad Air 13 M3',
    colors: ['Серый', 'Голубой', 'Сияющая звезда', 'Фиолетовый'],
    memories: ['128GB', '256GB'], basePrice: 60500, priceStep: 9500,
    simType: 'Wi-Fi',
  },
  {
    categorySlug: 'ipad', model: 'iPad Pro 11 M4',
    colors: ['Чёрный', 'Серебристый'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 75000, priceStep: 15000,
    simType: 'Wi-Fi',
  },
  {
    categorySlug: 'ipad', model: 'iPad Pro 13 M4',
    colors: ['Чёрный', 'Серебристый'],
    memories: ['256GB', '512GB', '1TB'], basePrice: 90000, priceStep: 18000,
    simType: 'Wi-Fi',
  },
]

// ─── MacBook ───
const macbooks: Variant[] = [
  {
    categorySlug: 'macbook', model: 'MacBook Air 13 M4',
    colors: ['Небесно-голубой', 'Тёмная ночь', 'Сияющая звезда', 'Серебристый'],
    memories: ['256GB', '512GB'], basePrice: 85000, priceStep: 18500,
    isFeatured: true,
  },
  {
    categorySlug: 'macbook', model: 'MacBook Air 15 M4',
    colors: ['Небесно-голубой', 'Тёмная ночь', 'Сияющая звезда', 'Серебристый'],
    memories: ['256GB', '512GB'], basePrice: 94500, priceStep: 21500,
  },
  {
    categorySlug: 'macbook', model: 'MacBook Pro 14 M5', isNew: true,
    colors: ['Чёрный', 'Серебристый'],
    memories: ['512GB', '1TB'], basePrice: 130000, priceStep: 9000,
  },
  {
    categorySlug: 'macbook', model: 'MacBook Pro 16 M5 Pro', isNew: true,
    colors: ['Чёрный', 'Серебристый'],
    memories: ['512GB', '1TB'], basePrice: 220000, priceStep: 15000,
  },
]

// ─── Apple Watch ───
const watches: Variant[] = [
  {
    categorySlug: 'apple-watch', model: 'Apple Watch SE 2',
    colors: ['Тёмная ночь', 'Сияющая звезда', 'Серебристый'],
    memories: ['40mm', '44mm'], basePrice: 18000, priceStep: 1000,
  },
  {
    categorySlug: 'apple-watch', model: 'Apple Watch Series 10',
    colors: ['Чёрный', 'Розовое золото'],
    memories: ['42mm', '46mm'], basePrice: 25000, priceStep: 3000,
    isFeatured: true,
  },
  {
    categorySlug: 'apple-watch', model: 'Apple Watch Series 11', isNew: true,
    colors: ['Чёрный', 'Розовое золото', 'Серебристый'],
    memories: ['42mm', '46mm'], basePrice: 28000, priceStep: 3000,
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
  { categorySlug: 'airpods', model: 'AirPods Max', name: 'AirPods Max Тёмная ночь', color: 'Тёмная ночь', price: 42500 },
  { categorySlug: 'airpods', model: 'AirPods Max', name: 'AirPods Max Сияющая звезда', color: 'Сияющая звезда', price: 42500 },
  { categorySlug: 'airpods', model: 'AirPods Max', name: 'AirPods Max Оранжевый', color: 'Оранжевый', price: 42500 },
  { categorySlug: 'airpods', model: 'AirPods Max', name: 'AirPods Max Фиолетовый', color: 'Фиолетовый', price: 42500 },
  { categorySlug: 'airpods', model: 'AirPods Max', name: 'AirPods Max Голубой', color: 'Голубой', price: 42500 },
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
const allVariants: Variant[] = [
  ...iphone16, ...iphone17, ...ipads, ...macbooks, ...watches,
]

export const ALL_PRODUCTS: ProductSeed[] = [
  ...allVariants.flatMap(expand),
  ...airpods,
  ...playstation,
  ...accessories,
]
