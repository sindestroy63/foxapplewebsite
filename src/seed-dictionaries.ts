import type { Payload } from 'payload'

const COLORS = [
  { value: 'black', englishLabel: 'Black', russianLabel: 'Чёрный', primaryHex: '#1d1d1f', deviceTypes: ['iphone'], sortOrder: 1 },
  { value: 'white', englishLabel: 'White', russianLabel: 'Белый', primaryHex: '#f5f5f7', deviceTypes: ['iphone'], sortOrder: 2 },
  { value: 'pink', englishLabel: 'Pink', russianLabel: 'Розовый', primaryHex: '#f4c2c2', deviceTypes: ['iphone', 'ipad'], sortOrder: 3 },
  { value: 'teal', englishLabel: 'Teal', russianLabel: 'Бирюзовый', primaryHex: '#5ac8c8', deviceTypes: ['iphone'], sortOrder: 4 },
  { value: 'ultramarine', englishLabel: 'Ultramarine', russianLabel: 'Ультрамарин', primaryHex: '#3f51b5', deviceTypes: ['iphone'], sortOrder: 5 },
  { value: 'black-titanium', englishLabel: 'Black Titanium', russianLabel: 'Чёрный титан', primaryHex: '#3a3a3c', deviceTypes: ['iphone', 'apple-watch'], sortOrder: 6 },
  { value: 'white-titanium', englishLabel: 'White Titanium', russianLabel: 'Белый титан', primaryHex: '#e8e3de', deviceTypes: ['iphone'], sortOrder: 7 },
  { value: 'natural-titanium', englishLabel: 'Natural Titanium', russianLabel: 'Натуральный титан', primaryHex: '#a8a39d', deviceTypes: ['iphone', 'apple-watch'], sortOrder: 8 },
  { value: 'desert-titanium', englishLabel: 'Desert Titanium', russianLabel: 'Пустынный титан', primaryHex: '#c4a882', deviceTypes: ['iphone'], sortOrder: 9 },
  { value: 'silver', englishLabel: 'Silver', russianLabel: 'Серебристый', primaryHex: '#c0c0c0', deviceTypes: ['ipad', 'macbook', 'apple-watch'], sortOrder: 10 },
  { value: 'blue', englishLabel: 'Blue', russianLabel: 'Голубой', primaryHex: '#7ec8e3', deviceTypes: ['ipad', 'airpods'], sortOrder: 11 },
  { value: 'yellow', englishLabel: 'Yellow', russianLabel: 'Жёлтый', primaryHex: '#f9d949', deviceTypes: ['ipad'], sortOrder: 12 },
  { value: 'space-gray', englishLabel: 'Space Gray', russianLabel: 'Серый космос', primaryHex: '#8e8e93', deviceTypes: ['ipad', 'apple-watch'], sortOrder: 13 },
  { value: 'starlight', englishLabel: 'Starlight', russianLabel: 'Сияющая звезда', primaryHex: '#f0e6d3', deviceTypes: ['macbook', 'apple-watch', 'airpods'], sortOrder: 14 },
  { value: 'purple', englishLabel: 'Purple', russianLabel: 'Фиолетовый', primaryHex: '#7b5ea7', deviceTypes: ['ipad', 'airpods'], sortOrder: 15 },
  { value: 'space-black', englishLabel: 'Space Black', russianLabel: 'Чёрный космос', primaryHex: '#2c2c2e', deviceTypes: ['ipad', 'macbook'], sortOrder: 16 },
  { value: 'midnight', englishLabel: 'Midnight', russianLabel: 'Тёмная ночь', primaryHex: '#2c2c2e', deviceTypes: ['macbook', 'apple-watch', 'airpods'], sortOrder: 17 },
  { value: 'sky-blue', englishLabel: 'Sky Blue', russianLabel: 'Небесно-голубой', primaryHex: '#a1c6ea', deviceTypes: ['macbook'], sortOrder: 18 },
  { value: 'rose-gold', englishLabel: 'Rose Gold', russianLabel: 'Розовое золото', primaryHex: '#e8b4b8', deviceTypes: ['apple-watch'], sortOrder: 19 },
  { value: 'jet-black', englishLabel: 'Jet Black', russianLabel: 'Глянцевый чёрный', primaryHex: '#0a0a0a', deviceTypes: ['apple-watch'], sortOrder: 20 },
  { value: 'orange', englishLabel: 'Orange', russianLabel: 'Оранжевый', primaryHex: '#f5845c', deviceTypes: ['airpods'], sortOrder: 21 },
  { value: 'mist-blue', englishLabel: 'Mist Blue', russianLabel: 'Дымчато-голубой', primaryHex: '#a3c4d9', deviceTypes: ['iphone'], sortOrder: 22 },
  { value: 'sage', englishLabel: 'Sage', russianLabel: 'Шалфей', primaryHex: '#9caf88', deviceTypes: ['iphone'], sortOrder: 23 },
  { value: 'lavender', englishLabel: 'Lavender', russianLabel: 'Лавандовый', primaryHex: '#c9b8d9', deviceTypes: ['iphone'], sortOrder: 24 },
  { value: 'soft-pink', englishLabel: 'Soft Pink', russianLabel: 'Нежно-розовый', primaryHex: '#f5c6c6', deviceTypes: ['iphone'], sortOrder: 25 },
  { value: 'cosmic-orange', englishLabel: 'Cosmic Orange', russianLabel: 'Космический оранжевый', primaryHex: '#e06030', deviceTypes: ['iphone'], sortOrder: 26 },
  { value: 'deep-blue', englishLabel: 'Deep Blue', russianLabel: 'Глубокий синий', primaryHex: '#1a3a5c', deviceTypes: ['iphone'], sortOrder: 27 },
  { value: 'light-gold', englishLabel: 'Light Gold', russianLabel: 'Светлое золото', primaryHex: '#e8d5b7', deviceTypes: ['iphone'], sortOrder: 28 },
  { value: 'cloud-white', englishLabel: 'Cloud White', russianLabel: 'Облачно-белый', primaryHex: '#f0ede8', deviceTypes: ['iphone'], sortOrder: 29 },
]

const STORAGES = [
  { value: '128GB', sortOrder: 1 }, { value: '256GB', sortOrder: 2 },
  { value: '512GB', sortOrder: 3 }, { value: '1TB', sortOrder: 4 },
  { value: '2TB', sortOrder: 5 }, { value: '40mm', sortOrder: 10 },
  { value: '42mm', sortOrder: 11 }, { value: '44mm', sortOrder: 12 },
  { value: '46mm', sortOrder: 13 }, { value: '49mm', sortOrder: 14 },
]

const SIMS = [
  { value: 'SIM_ESIM', label: 'SIM + eSIM', sortOrder: 1 },
  { value: 'ESIM', label: 'eSIM', sortOrder: 2 },
]

type DM = { name: string; cat: string; colors: string[]; stor: string[]; sim: string[]; chip?: string; ram?: string; scr?: string; conn?: string; bp: number; ps: number; isSize: boolean; so: number }

const DMS: DM[] = [
  // iPhone 16
  { name: 'iPhone 16', cat: 'iphone', colors: ['black','white','pink','teal','ultramarine'], stor: ['128GB','256GB','512GB'], sim: ['SIM_ESIM','ESIM'], bp: 55000, ps: 9500, isSize: false, so: 1 },
  { name: 'iPhone 16 Plus', cat: 'iphone', colors: ['black','white','pink','teal','ultramarine'], stor: ['128GB','256GB','512GB'], sim: ['SIM_ESIM','ESIM'], bp: 66000, ps: 5500, isSize: false, so: 2 },
  { name: 'iPhone 16 Pro', cat: 'iphone', colors: ['black-titanium','white-titanium','natural-titanium','desert-titanium'], stor: ['128GB','256GB','512GB','1TB'], sim: ['SIM_ESIM','ESIM'], bp: 82000, ps: 14000, isSize: false, so: 3 },
  { name: 'iPhone 16 Pro Max', cat: 'iphone', colors: ['black-titanium','white-titanium','natural-titanium','desert-titanium'], stor: ['256GB','512GB','1TB'], sim: ['SIM_ESIM','ESIM'], bp: 96000, ps: 16000, isSize: false, so: 4 },
  // iPhone 17
  { name: 'iPhone 17', cat: 'iphone', colors: ['black','white','mist-blue','sage','lavender'], stor: ['256GB','512GB'], sim: ['SIM_ESIM','ESIM'], bp: 62000, ps: 10000, isSize: false, so: 19 },
  { name: 'iPhone Air', cat: 'iphone', colors: ['sky-blue','light-gold','cloud-white','space-black'], stor: ['256GB','512GB','1TB'], sim: ['ESIM'], bp: 76000, ps: 14000, isSize: false, so: 20 },
  { name: 'iPhone 17e', cat: 'iphone', colors: ['soft-pink','black','white'], stor: ['256GB','512GB'], sim: ['SIM_ESIM','ESIM'], bp: 50000, ps: 8000, isSize: false, so: 21 },
  { name: 'iPhone 17 Pro', cat: 'iphone', colors: ['silver','cosmic-orange','deep-blue'], stor: ['256GB','512GB','1TB'], sim: ['SIM_ESIM','ESIM'], bp: 98500, ps: 15000, isSize: false, so: 22 },
  { name: 'iPhone 17 Pro Max', cat: 'iphone', colors: ['silver','cosmic-orange','deep-blue'], stor: ['256GB','512GB','1TB','2TB'], sim: ['SIM_ESIM','ESIM'], bp: 115000, ps: 17000, isSize: false, so: 23 },
  // iPad
  { name: 'iPad', cat: 'ipad', colors: ['silver','blue','pink','yellow'], stor: ['128GB','256GB'], sim: [], conn: 'Wi-Fi', chip: 'A16', scr: '11″', bp: 31000, ps: 9500, isSize: false, so: 5 },
  { name: 'iPad Air M3', cat: 'ipad', colors: ['space-gray','starlight','purple','blue'], stor: ['128GB','256GB'], sim: [], conn: 'Wi-Fi', chip: 'M3', scr: '11″', bp: 47500, ps: 9500, isSize: false, so: 6 },
  { name: 'iPad Air 13″ M3', cat: 'ipad', colors: ['space-gray','blue','starlight','purple'], stor: ['128GB'], sim: [], conn: 'Wi-Fi', chip: 'M3', scr: '13″', bp: 60500, ps: 0, isSize: false, so: 7 },
  { name: 'iPad Air M4', cat: 'ipad', colors: ['space-gray','purple','starlight','blue'], stor: ['128GB','256GB'], sim: [], conn: 'Wi-Fi', chip: 'M4', scr: '11″', bp: 49500, ps: 13500, isSize: false, so: 8 },
  { name: 'iPad Air 13″ M4', cat: 'ipad', colors: ['space-gray','purple','starlight','blue'], stor: ['128GB'], sim: [], conn: 'Wi-Fi', chip: 'M4', scr: '13″', bp: 71000, ps: 0, isSize: false, so: 9 },
  { name: 'iPad Pro M4', cat: 'ipad', colors: ['space-black','silver'], stor: ['256GB'], sim: [], conn: 'Wi-Fi', chip: 'M4', scr: '11″', bp: 75000, ps: 0, isSize: false, so: 10 },
  { name: 'iPad Pro 13″ M4', cat: 'ipad', colors: ['space-black','silver'], stor: ['256GB'], sim: [], conn: 'Wi-Fi', chip: 'M4', scr: '13″', bp: 90000, ps: 0, isSize: false, so: 11 },
  { name: 'iPad Pro M5', cat: 'ipad', colors: ['space-black','silver'], stor: ['256GB','512GB'], sim: [], conn: 'Wi-Fi', chip: 'M5', scr: '11″', bp: 80000, ps: 15000, isSize: false, so: 12 },
  { name: 'iPad Pro 13″ M5', cat: 'ipad', colors: ['space-black','silver'], stor: ['256GB','512GB'], sim: [], conn: 'Wi-Fi', chip: 'M5', scr: '13″', bp: 100000, ps: 15000, isSize: false, so: 13 },
  { name: 'iPad mini', cat: 'ipad', colors: ['space-gray','blue','purple','starlight'], stor: ['128GB','256GB','512GB'], sim: [], conn: 'Wi-Fi', chip: 'A17 Pro', scr: '8.3″', bp: 39000, ps: 8000, isSize: false, so: 14 },
  // MacBook
  { name: 'MacBook Air 13″ M4', cat: 'macbook', colors: ['sky-blue','midnight','starlight','silver'], stor: ['256GB','512GB','1TB','2TB'], sim: [], chip: 'M4', ram: '16 ГБ', scr: '13.6″', bp: 85000, ps: 18500, isSize: false, so: 15 },
  { name: 'MacBook Air 15″ M4', cat: 'macbook', colors: ['sky-blue','midnight','starlight','silver'], stor: ['256GB','512GB','1TB','2TB'], sim: [], chip: 'M4', ram: '16 ГБ', scr: '15.3″', bp: 94500, ps: 21500, isSize: false, so: 16 },
  { name: 'MacBook Pro 14″ M4', cat: 'macbook', colors: ['space-black','silver'], stor: ['512GB','1TB','2TB'], sim: [], chip: 'M4', ram: '24 ГБ', scr: '14.2″', bp: 120000, ps: 12000, isSize: false, so: 17 },
  { name: 'MacBook Pro 14″ M4 Pro', cat: 'macbook', colors: ['space-black','silver'], stor: ['512GB','1TB','2TB'], sim: [], chip: 'M4 Pro', ram: '24 ГБ', scr: '14.2″', bp: 160000, ps: 15000, isSize: false, so: 18 },
  { name: 'MacBook Pro 16″ M4 Pro', cat: 'macbook', colors: ['space-black','silver'], stor: ['512GB','1TB','2TB'], sim: [], chip: 'M4 Pro', ram: '24 ГБ', scr: '16.2″', bp: 200000, ps: 18000, isSize: false, so: 19 },
  // Apple Watch
  { name: 'Apple Watch SE (2-го поколения)', cat: 'apple-watch', colors: ['midnight','starlight','silver'], stor: ['40mm','44mm'], sim: [], bp: 18000, ps: 1000, isSize: true, so: 20 },
  { name: 'Apple Watch Series 10', cat: 'apple-watch', colors: ['jet-black','rose-gold','silver'], stor: ['42mm','46mm'], sim: [], bp: 25000, ps: 3000, isSize: true, so: 21 },
  { name: 'Apple Watch Series 11', cat: 'apple-watch', colors: ['jet-black','rose-gold','silver','space-gray'], stor: ['42mm','46mm'], sim: [], bp: 28000, ps: 3000, isSize: true, so: 22 },
  { name: 'Apple Watch Ultra 2', cat: 'apple-watch', colors: ['natural-titanium','black-titanium'], stor: ['49mm'], sim: [], bp: 58000, ps: 0, isSize: true, so: 23 },
]

async function upsert(payload: Payload, collection: string, field: string, val: string, data: Record<string, unknown>) {
  const existing = await payload.find({ collection: collection as any, limit: 1, depth: 0, where: { [field]: { equals: val } } })
  if (existing.docs[0]) {
    return payload.update({ collection: collection as any, id: existing.docs[0].id, data: data as any })
  }
  return payload.create({ collection: collection as any, data: data as any })
}

export type DictIds = { colorIds: Map<string, number>; storageIds: Map<string, number>; simIds: Map<string, number> }

export async function seedDictionaries(payload: Payload, categoriesBySlug: Map<string, number>): Promise<DictIds> {
  const colorIds = new Map<string, number>()
  for (const c of COLORS) {
    const doc = await upsert(payload, 'colors', 'value', c.value, c)
    colorIds.set(c.value, doc.id as number)
  }

  const storageIds = new Map<string, number>()
  for (const s of STORAGES) {
    const doc = await upsert(payload, 'storage-options', 'value', s.value, s)
    storageIds.set(s.value, doc.id as number)
  }

  const simIds = new Map<string, number>()
  for (const s of SIMS) {
    const doc = await upsert(payload, 'sim-options', 'value', s.value, s)
    simIds.set(s.value, doc.id as number)
  }

  for (const dm of DMS) {
    const categoryId = categoriesBySlug.get(dm.cat)
    if (!categoryId) continue
    await upsert(payload, 'device-models', 'name', dm.name, {
      name: dm.name,
      category: categoryId,
      availableColors: dm.colors.map((v) => colorIds.get(v)).filter(Boolean),
      availableStorage: dm.stor.map((v) => storageIds.get(v)).filter(Boolean),
      availableSim: dm.sim.map((v) => simIds.get(v)).filter(Boolean),
      chip: dm.chip, ram: dm.ram, screenSize: dm.scr, connectivity: dm.conn,
      basePrice: dm.bp, priceStep: dm.ps, storageIsSize: dm.isSize, sortOrder: dm.so,
    })
  }

  payload.logger.info('Dictionaries seeded (colors, storage, sim, device models)')
  return { colorIds, storageIds, simIds }
}
