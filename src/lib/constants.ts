export const CONTACTS = {
  shopName: 'ФОХСТОР',
  phone: '+7 (917) 954-64-64',
  telegramUsername: '@FoxAppleSeller',
  telegramUrl: 'https://t.me/FoxAppleSeller',
  telegramChannelUrl: 'https://t.me/foxappleru',
  address: 'Самара, ул. Московское шоссе 55',
  mapCoordinates: {
    lat: 53.224309,
    lon: 50.192962,
  },
  workTime: 'с 11:00 до 20:00, ежедневно',
  // Основной публичный домен (кириллица). Технический ASCII/punycode-эквивалент — secondaryDomain.
  mainDomain: 'фохстор.рф',
  secondaryDomain: 'xn--n1aagcfji.xn--p1ai',
  heroTitle: 'ФОХСТОР — техника Apple в Самаре',
  heroSubtitle: 'Оригинальная техника Apple, гарантия 1 год, Trade-In, рассрочка и доставка.',
  aboutText:
    'ФОХСТОР помогает быстро выбрать актуальную технику Apple, проверить наличие и забронировать товар в Самаре.',
  homepageMediaTitle: 'Загляните к нам',
  homepageMediaText:
    'Новые поставки, живые обзоры и выдача техники — смотрите, что происходит в ФОХСТОР прямо сейчас.',
}

export const SELLER = {
  address: 'Самарская область, г. Самара',
  inn: '631934690546',
  ogrnip: '324632700003051',
  typeAndName: 'ИП Молозин Данил Денисович',
}

export const CATEGORY_SEED = [
  { name: 'iPhone', slug: 'iphone' },
  { name: 'iPad', slug: 'ipad' },
  { name: 'MacBook', slug: 'macbook' },
  { name: 'AirPods', slug: 'airpods' },
  { name: 'Apple Watch', slug: 'apple-watch' },
  { name: 'PlayStation', slug: 'playstation' },
  { name: 'Аксессуары', slug: 'accessories' },
  { name: 'Б/У техника', slug: 'used' },
] as const

// Единая точка правды для базового URL сайта. Используется в metadata, canonical,
// sitemap, robots, JSON-LD и абсолютных ссылках (например, в Telegram-заявках),
// чтобы домен не собирался в нескольких местах независимо друг от друга.
// В проде задаётся через NEXT_PUBLIC_SITE_URL (см. .env.example); на localhost работает без ENV.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost').replace(/\/$/, '')

export function absoluteUrl(path = ''): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}
