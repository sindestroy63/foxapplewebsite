export const CONTACTS = {
  shopName: 'FOX APPLE',
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
  mainDomain: 'foxapple.ru',
  secondaryDomain: 'фоксэпл.рф',
  heroTitle: 'FOX APPLE — техника Apple в Самаре',
  heroSubtitle: 'Оригинальная техника Apple, гарантия 1 год, Trade-In, рассрочка и доставка.',
  aboutText:
    'FOX APPLE помогает быстро выбрать актуальную технику Apple, проверить наличие и забронировать товар в Самаре.',
  homepageMediaTitle: 'Загляните к нам',
  homepageMediaText:
    'Новые поставки, живые обзоры и выдача техники — смотрите, что происходит в FOX APPLE прямо сейчас.',
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

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost'
