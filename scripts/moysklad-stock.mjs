import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const STOP = /демозона|demo|б\/?у|б\.у|чехол|\bcase\b|стекло|glass|кабель|зарядк|зарядное|ремешок|браслет|keephone|remax|supglass|borofone|folio|spinring|услуга/i

const COLORS = [
  ['space gray', /space\s*gray|серый космос/],
  ['rose gold', /rose\s*gold|розов\w*\s*золот/],
  ['jet black', /jet\s*black/],
  ['edge black', /edge\s*black/],
  ['edge white', /edge\s*white/],
  ['dark bronze', /dark\s*bronze|бронз/],
  ['light gold', /light\s*gold/],
  ['gray camouflage', /gray\s*camouflage|серый\s*камуфляж|камуфляж/],
  ['awesome icyblue', /awesome\s*icy\s*blue|icyblue|icy\s*blue/],
  ['awesome gray', /awesome\s*gray/],
  ['awesome lilac', /awesome\s*lilac|сиренев/],
  ['awesome navy', /awesome\s*navy/],
  ['cobalt violet', /cobalt\s*violet/],
  ['violet shadow', /violet\s*shadow/],
  ['cosmic orange', /cosmic\s*orange|оранж/],
  ['deep blue', /deep\s*blue/],
  ['mist blue', /mist\s*blue/],
  ['sky blue', /sky\s*blue|голубое небо/],
  ['lavender', /lavender|лаванд/],
  ['burgundy', /burgundy|бордов/],
  ['graphite', /graphite|графит/],
  ['creamy', /creamy|кремов/],
  ['pistachio', /pistachio|фисташ/],
  ['blueberry', /blueberry/],
  ['ceramic pink', /ceramic\s*pink/],
  ['coral', /coral|корал/],
  ['mint', /mint|мятн/],
  ['brown', /brown|коричнев/],
  ['cream', /cream(?!y)/],
  ['red', /(?<!volcanic\s)red|красн/],
  ['pink', /pink|розов/],
  ['silver', /silver|серебр/],
  ['blue', /(?<!deep\s)(?<!mist\s)(?<!sky\s)blue|голуб|син(?!ий\s+титан)/],
  ['yellow', /yellow|жёлт|желт/],
  ['black', /black|чёрн|черн/],
  ['white', /white|бел/],
  ['gold', /gold|золот/],
  ['violet', /violet|фиолет/],
  ['purple', /purple|фиолет/],
  ['starlight', /starlight|сияющ/],
  ['midnight', /midnight|тёмн\w*\s*ноч|темн\w*\s*ноч/],
]

export function colorOf(name) {
  const text = String(name || '').toLowerCase()
  for (const [key, pattern] of COLORS) if (pattern.test(text)) return key
  return ''
}

export function simOf(name) {
  const text = String(name || '').toLowerCase()
  if (/nano|sim\s*\+|1\s*sim|физическ/.test(text)) return 'SIM_ESIM'
  if (/\besim\b|e-sim|e sim/.test(text)) return 'ESIM'
  return ''
}

export function storageOf(name) {
  const text = String(name || '').toLowerCase()
  const slash = text.match(/\d+\s*\/\s*(\d+)\s*(gb|гб|tb|тб)/)
  const match = slash || text.match(/(\d+)\s*(gb|гб|tb|тб)/)
  if (!match) return ''
  const amount = slash ? match[1] : match[1]
  const unit = slash ? match[2] : match[2]
  return `${amount}${/tb|тб/.test(unit) ? 'tb' : 'gb'}`
}

export function ramOf(name, fromField = false) {
  const text = String(name || '').toLowerCase().replace(/гб/g, 'gb').trim()
  if (fromField) {
    const match = text.match(/(\d+)/)
    return match ? match[1] : ''
  }
  const slash = text.match(/(\d+)\s*\/\s*\d+\s*gb/)
  return slash ? slash[1] : ''
}

export function sizeOf(name) {
  const match = String(name || '').toLowerCase().match(/(\d+)\s*mm/)
  return match ? `${match[1]}mm` : ''
}

export function strapsOf(name) {
  const text = String(name || '').toLowerCase().replace(/\\/g, '/')
  const found = []
  if (/s\s*\/\s*m/.test(text)) found.push('s/m')
  if (/m\s*\/\s*l/.test(text)) found.push('m/l')
  if (/s\s*\/\s*l/.test(text)) found.push('s/l')
  return found
}

function normScreen(value) {
  const raw = String(value).toLowerCase()
  if (/gb|гб|tb|тб|mm/.test(raw)) return ''
  const number = parseFloat(raw.replace(',', '.'))
  if (Number.isNaN(number) || number < 10 || number > 17) return ''
  if (number >= 13 && number < 14) return '13'
  return String(Math.round(number))
}

export function screenOf(name, fromField = false) {
  const text = String(name || '').toLowerCase().replace(/[″”]/g, '"')
  if (fromField) return normScreen(text)
  if (!/macbook|ipad/.test(text)) return ''
  const quoted = text.match(/(\d+(?:\.\d+)?)\s*"/)
  if (quoted) return normScreen(quoted[1])
  const loose = text.match(/\b(13\.6|16|15|14|13|11)\b/)
  return loose ? normScreen(loose[1]) : ''
}

export function peelSuffix(name) {
  const source = String(name || '')
  const tails = [/\s+imei\s+\S+$/i, /\s+serial\s+\S+$/i, /\s+[A-Z0-9]{10,}$/, /\s+\d{12,16}$/]
  let end = source.length
  for (let guard = 0; guard < 6; guard += 1) {
    const slice = source.slice(0, end)
    let peeled = false
    for (const pattern of tails) {
      const match = slice.match(pattern)
      if (match && match.index + match[0].length === slice.length) {
        end = match.index
        peeled = true
        break
      }
    }
    if (!peeled) break
  }
  return { body: source.slice(0, end).trimEnd(), suffix: source.slice(end) }
}

export function modelKey(name) {
  const text = String(name || '').toLowerCase().replace(/[^a-zа-я0-9+]+/gi, ' ')
  if (/iphone\s*duo/.test(text)) return ''
  const rules = [
    [/iphone\s*17\s*pro\s*max/, 'iphone 17 pro max'],
    [/iphone\s*17\s*pro/, 'iphone 17 pro'],
    [/iphone\s*17e/, 'iphone 17e'],
    [/iphone\s*17/, 'iphone 17'],
    [/iphone\s*air/, 'iphone air'],
    [/iphone\s*18\s*pro\s*max/, 'iphone 18 pro max'],
    [/iphone\s*18\s*pro/, 'iphone 18 pro'],
    [/ipad\s*pro/, 'ipad pro'],
    [/ipad\s*air/, 'ipad air'],
    [/ipad\s*11/, 'ipad 11'],
    [/airpods\s*pro\s*3/, 'airpods pro 3'],
    [/airpods\s*4\s*anc|airpods\s*4\s*с\s*шум/, 'airpods 4 anc'],
    [/airpods\s*5\s*wcc/, 'airpods 5 wcc'],
    [/airpods\s*5/, 'airpods 5'],
    [/airpods\s*4/, 'airpods 4'],
    [/airpods\s*max/, 'airpods max'],
    [/macbook\s*air/, 'macbook air'],
    [/macbook\s*pro/, 'macbook pro'],
    [/macbook\s*neo/, 'macbook neo'],
    [/magic\s*mouse/, 'magic mouse'],
    [/airtag/, 'airtag'],
    [/apple\s*tv/, 'apple tv'],
    [/galaxy\s*s26\s*ultra|samsung\s*s26\s*ultra/, 'galaxy s26 ultra'],
    [/galaxy\s*s26\s*fe|samsung\s*s26\s*fe/, 'galaxy s26 fe'],
    [/galaxy\s*s26\s*plus|samsung\s*s26\s*plus|samsung\s*s26\s*\+|galaxy\s*s26\s*\+/, 'galaxy s26 plus'],
    [/galaxy\s*s26|samsung\s*s26/, 'galaxy s26'],
    [/galaxy\s*s25\s*ultra|samsung\s*s25\s*ultra/, 'galaxy s25 ultra'],
    [/galaxy\s*a57|samsung\s*a57/, 'galaxy a57'],
    [/galaxy\s*z\s*fold\s*8\s*ultra|z\s*fold\s*8\s*ultra/, 'galaxy z fold8 ultra'],
    [/galaxy\s*z\s*fold|z\s*fold\s*8/, 'galaxy z fold8'],
    [/galaxy\s*z\s*flip|z\s*flip\s*8/, 'galaxy z flip8'],
    [/dyson\s*hs\s*0?8|\bhs08\b/, 'dyson hs08'],
    [/dyson\s*hs\s*0?9|\bhs09\b/, 'dyson hs09'],
    [/hd16|supersonic/, 'dyson hd16'],
    [/sv23/, 'dyson sv23'],
    [/sv50/, 'dyson sv50'],
    [/\bht01\b/, 'dyson ht01'],
    [/fitbit\s*air/, 'fitbit air'],
    [/earpods\s*usb/, 'earpods usb-c'],
    [/earpods\s*lightning/, 'earpods lightning'],
    [/pencil/, 'apple pencil'],
    [/marshall/, 'marshall'],
    [/vertical\s*stand/, 'ps5 stand'],
    [/disc\s*drive|дисковод/, 'ps5 disc'],
  ]
  for (const [pattern, key] of rules) if (pattern.test(text)) return key
  if (/galaxy|samsung/.test(text)) return ''
  const apple = [
    [/yotei|ghost\s*of/, 'ps5 slim ghost'],
    [/playstation\s*5\s*pro|ps5\s*pro/, 'ps5 pro'],
    [/playstation\s*5\s*slim\s*disk|ps5\s*slim\s*disk/, 'ps5 slim disk'],
    [/playstation\s*5\s*slim\s*digital|ps5\s*slim\s*digital/, 'ps5 slim digital'],
    [/playstation\s*5\s*slim|ps5\s*slim/, 'ps5 slim'],
    [/зарядная\s+станция/, 'dualsense dock'],
    [/dualsense|геймпад/, 'dualsense'],
    [/watch\s*series\s*12|watch\s*12|series\s*12/, 'watch 12'],
    [/watch\s*series\s*11|watch\s*s11|series\s*11/, 'watch 11'],
    [/watch\s*se\s*3|watch\s*se3/, 'watch se 3'],
    [/watch\s*ultra\s*4|ultra\s*4/, 'watch ultra 4'],
    [/watch\s*ultra\s*3|ultra\s*3/, 'watch ultra 3'],
    [/watch\s*ultra/, 'watch ultra'],
  ]
  for (const [pattern, key] of apple) if (pattern.test(text)) return key
  return ''
}

export function parseMs(name, qty) {
  const { body } = peelSuffix(name)
  const model = modelKey(body)
  if (!model) return null
  let size = sizeOf(body)
  const color = colorOf(body)
  const straps = strapsOf(body)
  if (model === 'watch 12' && color === 'space gray' && !size && straps.includes('s/m')) size = '42mm'
  return {
    model,
    color,
    storage: storageOf(body),
    size,
    screen: screenOf(body),
    ram: ramOf(body),
    straps,
    sim: simOf(body),
    qty: Number(qty || 0),
    name,
  }
}

export function parseSite(row) {
  const rawHead = String(row.english_label || '').split('|')[0].trim()
  const head = rawHead.split('/')[0].trim()
  const color = colorOf(head) || colorOf(rawHead) || colorOf(`${rawHead} ${row.russian_label || ''}`)
  return {
    id: row.id,
    productId: row.product_id,
    name: String(row.name || '').trim(),
    model: modelKey(row.name),
    color,
    colorLabel: head,
    storage: storageOf(row.storage || ''),
    size: sizeOf(row.size || row.size_label || ''),
    screen: screenOf(row.screen_size || row.screen_label || '', true),
    ram: ramOf(row.ram || row.ram_label || '', true),
    straps: strapsOf(row.strap_size || ''),
    sim: String(row.sim || ''),
  }
}

function baseFit(ms, site) {
  if (!site.model || ms.model !== site.model) return false
  if (site.color) {
    if (ms.color !== site.color) return false
  } else if (ms.color) return false
  if (site.sim && ms.sim !== site.sim) return false
  if (site.storage && ms.storage !== site.storage) return false
  if (site.size && ms.size !== site.size) return false
  if (site.screen && ms.screen !== site.screen) return false
  if (site.ram && ms.ram && ms.ram !== site.ram) return false
  return true
}

export function qtyFor(site, items, sites) {
  if (!site.model) return null
  if (site.colorLabel && !site.color) return 0
  let hits = items.filter((item) => baseFit(item, site))
  if (site.straps.length) {
    const strapped = hits.filter((item) => !item.straps.length || item.straps.some((strap) => site.straps.includes(strap)))
    if (strapped.length) hits = strapped
    else {
      const siblingTakes = sites.some((other) => other.id !== site.id && other.model === site.model && other.color === site.color && other.size === site.size && other.straps.some((strap) => hits.some((item) => item.straps.includes(strap))))
      if (siblingTakes) hits = []
    }
  }
  return hits.reduce((sum, item) => sum + item.qty, 0)
}

function loadEnv() {
  const envText = readFileSync('/app/.env', 'utf8')
  for (const line of envText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1)
  }
}

async function ms(url, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.MOYSKLAD_API_TOKEN}`,
        Accept: 'application/json;charset=utf-8',
        'Accept-Encoding': 'gzip',
      },
    })
    if (res.ok) return res.json()
    if (res.status === 503 || res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)))
      continue
    }
    throw new Error(`${res.status} ${url}`)
  }
  throw new Error(`failed after retries ${url}`)
}

function caseColor(text) {
  if (/burgundy|бордов/.test(text)) return 'burgundy'
  if (/light-?\s*blue|glacier|голуб/.test(text)) return 'glacier'
  if (/grey|gray|серый/.test(text)) return 'gray'
  if (/black|чёрн|черн/.test(text)) return 'black'
  return ''
}

function accessoryOf(name) {
  const text = String(name || '').toLowerCase()
  if (/демозона|demo|б\/?у|б\.у/.test(text)) return null
  if ((/чехол|case/.test(text)) && /keephone|rosana|aurora/.test(text)) return { key: 'keephone-case', color: caseColor(text) }
  if (/прозрачный чехол/.test(text)) return { key: 'clear-case' }
  if (/camera lens keephone/.test(text)) return { key: 'lens' }
  if (/кабель/.test(text)) return { key: 'cable' }
  if (/brendy|breindy/.test(text)) return { key: /10000/.test(text) ? 'brendy-10000' : 'brendy-5000' }
  if (/speedy|carvolt|powergo|glowon/.test(text)) return { key: 'charger' }
  if (/samsung\s*45w|45w power adapter/.test(text)) return { key: 'samsung-45w' }
  if (/\bimac\b/.test(text)) return { key: 'imac' }
  if (/повербанк apple|apple magsafe battery/.test(text)) return { key: 'apple-pb' }
  if (/xiaomi magsafe|повербанк xiaomi/.test(text)) return { key: 'xiaomi-pb' }
  if (/картхолдер|leather wallet magsafe/.test(text)) return { key: 'wallet' }
  if (/европереходник/.test(text)) return { key: 'euro' }
  if (/merkan/.test(text)) return { key: 'merkan' }
  if (/кейс dyson/.test(text)) return { key: 'dyson-case' }
  if (/crossbody strap/.test(text)) return { key: 'crossbody' }
  if (/повербанк keephone/.test(text)) return { key: 'keephone-pb' }
  return null
}

const ACCESSORY_NAMES = {
  'keephone-case': 'Чехол Keephone',
  cable: 'Кабель зарядки',
  charger: 'Блок Питания',
  'samsung-45w': 'Samsung 45W',
  imac: 'Apple iMac (M1, 8/256)',
  'apple-pb': 'Повербанк Apple MagSafe 5000',
  'xiaomi-pb': 'Повербанк Xiaomi MagSafe',
  wallet: 'Картхолдер MagSafe',
  euro: 'Европереходник',
  merkan: 'Переходник Merkan',
  'dyson-case': 'Кейс Dyson',
  crossbody: 'Ремень Crossbody Strap',
  'keephone-pb': 'Повербанк Keephone 5000',
  'clear-case': 'Прозрачный чехол MagSafe',
  lens: 'Линзы камеры Keephone',
}

const APPLE_CHARGER_PRODUCT = 'Сетевое зарядное устройство'
const APPLE_CHARGER_SKIP = /кабель|cable|чехол|case|magsafe|повербанк|battery|watch|ремешок|стекло|iphone|ipad|macbook|airpods|samsung|galaxy|playstation|ps5/

export function appleChargerOf(name) {
  const text = String(name || '').toLowerCase()
  if (!/apple/.test(text) || APPLE_CHARGER_SKIP.test(text)) return null
  if (/dynamic/.test(text)) return 'dynamic-40-60'
  if (!/сетев|зарядн|adapter|адаптер|usb/.test(text)) return null
  const power = text.match(/(?<![a-z0-9.])(\d+)\s*(?:w|вт)/)
  if (!power) return null
  return ['20', '35', '96'].includes(power[1]) ? `${power[1]}w` : null
}

async function applyAppleChargers(client, rows, changes) {
  const totals = new Map()
  for (const row of rows) {
    const qty = Number(row.stock || 0)
    const key = qty > 0 ? appleChargerOf(row.name) : null
    if (key) totals.set(key, (totals.get(key) || 0) + qty)
  }
  const found = await client.query(
    `SELECT v.id, v.package_label, v.status, v.stock_qty, p.id AS product_id, p.status AS product_status, p.stock_qty AS product_qty
     FROM products_variants v
     JOIN products p ON p.id = v._parent_id
     WHERE btrim(p.name) = $1`,
    [APPLE_CHARGER_PRODUCT],
  )
  const products = new Map()
  for (const row of found.rows) {
    const key = appleChargerOf(row.package_label)
    const qty = key ? totals.get(key) || 0 : null
    let status = row.status
    if (qty !== null) {
      status = qty > 0 ? 'in_stock' : 'preorder'
      if (row.status !== status || Number(row.stock_qty) !== qty) {
        await client.query(
          `UPDATE products_variants SET status = $2::"enum_products_variants_status", stock_qty = $3 WHERE id = $1`,
          [row.id, status, qty],
        )
        changes.push({ id: row.id, name: `${APPLE_CHARGER_PRODUCT} ${String(row.package_label).trim()}`, to: status, qty })
      }
    }
    const entry = products.get(row.product_id) || { row, statuses: [], qty: 0 }
    entry.statuses.push(status)
    entry.qty += qty || 0
    products.set(row.product_id, entry)
  }
  for (const [id, entry] of products) {
    const status = entry.statuses.includes('in_stock') ? 'in_stock' : entry.statuses.includes('preorder') ? 'preorder' : 'out_of_stock'
    if (entry.row.product_status === status && Number(entry.row.product_qty) === entry.qty) continue
    await client.query(
      `UPDATE products SET status = $2::"enum_products_status", stock_qty = $3 WHERE id = $1`,
      [id, status, entry.qty],
    )
    changes.push({ id, name: APPLE_CHARGER_PRODUCT, to: status, qty: entry.qty, product: true })
  }
}

async function applyAccessories(client, rows, changes) {
  const totals = new Map()
  const caseColors = new Map()
  for (const row of rows) {
    const qty = Number(row.stock || 0)
    if (qty <= 0) continue
    const acc = accessoryOf(row.name)
    if (!acc) continue
    totals.set(acc.key, (totals.get(acc.key) || 0) + qty)
    if (acc.color) caseColors.set(acc.color, (caseColors.get(acc.color) || 0) + qty)
  }
  const productQty = new Map()
  const add = (name, qty) => productQty.set(name, (productQty.get(name) || 0) + qty)
  for (const [key, qty] of totals) {
    if (key === 'brendy-5000' || key === 'brendy-10000') add('Внешний аккумулятор Keephone Brendy MagSafe', qty)
    else if (ACCESSORY_NAMES[key]) add(ACCESSORY_NAMES[key], qty)
  }
  for (const [name, qty] of productQty) {
    const status = qty > 0 ? 'in_stock' : 'out_of_stock'
    const updated = await client.query(
      `UPDATE products SET status = $2::"enum_products_status", is_available = true, stock_qty = $3 WHERE btrim(name) = $1`,
      [name, status, qty],
    )
    if (updated.rowCount) changes.push({ name, qty, product: true })
  }
  for (const color of ['black', 'burgundy', 'glacier', 'gray']) {
    const qty = caseColors.get(color) || 0
    await client.query(
      `UPDATE products_variants v
       SET status = $3::"enum_products_variants_status", is_available = $4, stock_qty = $2
       FROM products p, colors c
       WHERE v._parent_id = p.id AND btrim(p.name) = 'Чехол Keephone' AND v.color_id = c.id AND lower(c.english_label) = $1`,
      [color, qty, qty > 0 ? 'in_stock' : 'out_of_stock', qty > 0],
    )
  }
  const brendy5000 = totals.get('brendy-5000') || 0
  const brendy10000 = totals.get('brendy-10000') || 0
  await client.query(
    `UPDATE products_variants v
     SET status = $2::"enum_products_variants_status", is_available = $3, stock_qty = $1
     FROM products p
     WHERE v._parent_id = p.id AND btrim(p.name) = 'Внешний аккумулятор Keephone Brendy MagSafe' AND v.price = 3490`,
    [brendy5000, brendy5000 > 0 ? 'in_stock' : 'out_of_stock', brendy5000 > 0],
  )
  await client.query(
    `UPDATE products_variants v
     SET status = $2::"enum_products_variants_status", is_available = $3, stock_qty = $1
     FROM products p
     WHERE v._parent_id = p.id AND btrim(p.name) = 'Внешний аккумулятор Keephone Brendy MagSafe' AND v.price = 3990`,
    [brendy10000, brendy10000 > 0 ? 'in_stock' : 'out_of_stock', brendy10000 > 0],
  )
  const cableQty = totals.get('cable') || 0
  await client.query(
    `UPDATE products_variants v
     SET status = $2::"enum_products_variants_status", is_available = $3, stock_qty = $1
     FROM products p, colors c
     WHERE v._parent_id = p.id AND btrim(p.name) = 'Кабель зарядки' AND v.color_id = c.id AND c.english_label ILIKE '%USB-C — USB-C%'`,
    [cableQty, cableQty > 0 ? 'in_stock' : 'out_of_stock', cableQty > 0],
  )
  await client.query(
    `UPDATE products_variants v
     SET status = 'out_of_stock'::"enum_products_variants_status", is_available = false, stock_qty = 0
     FROM products p, colors c
     WHERE v._parent_id = p.id AND btrim(p.name) = 'Кабель зарядки' AND v.color_id = c.id AND c.english_label ILIKE '%Lightning%'`,
  )
  const chargerQty = totals.get('charger') || 0
  await client.query(
    `UPDATE products_variants v
     SET status = $2::"enum_products_variants_status", is_available = $3, stock_qty = $1
     FROM products p
     WHERE v._parent_id = p.id AND btrim(p.name) = 'Блок Питания'`,
    [chargerQty, chargerQty > 0 ? 'in_stock' : 'out_of_stock', chargerQty > 0],
  )
}

async function main() {
  loadEnv()
  const dry = process.argv.includes('--dry')
  const rows = []
  for (let offset = 0; offset < 5000; offset += 100) {
    const data = await ms(`https://api.moysklad.ru/api/remap/1.2/report/stock/all?limit=100&offset=${offset}`)
    const chunk = data.rows || []
    rows.push(...chunk)
    if (chunk.length < 100) break
  }
  const items = []
  for (const row of rows) {
    if (Number(row.stock || 0) <= 0) continue
    if (STOP.test(String(row.name || ''))) continue
    const parsed = parseMs(row.name, row.stock)
    if (parsed) items.push(parsed)
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const variants = await client.query(`
      SELECT v.id, v.is_available, v.status, v.stock_qty, p.id AS product_id, p.name,
             c.english_label, c.russian_label, s.value AS storage, sim.value AS sim,
             v.size, v.strap_size, v.screen_size, v.ram,
             ro.label AS ram_label, sso.label AS screen_label, vso.label AS size_label
      FROM products_variants v
      JOIN products p ON p.id = v._parent_id
      LEFT JOIN colors c ON c.id = v.color_id
      LEFT JOIN storage_options s ON s.id = v.storage_id
      LEFT JOIN sim_options sim ON sim.id = v.sim_id
      LEFT JOIN ram_options ro ON ro.id = v.ram_option_id
      LEFT JOIN screen_size_options sso ON sso.id = v.screen_size_option_id
      LEFT JOIN variant_size_options vso ON vso.id = v.size_option_id
      WHERE COALESCE(p.condition::text, 'new') <> 'used'
        AND COALESCE(p.product_group::text, '') <> 'trade-in'
    `)
    const products = await client.query(`
      SELECT p.id, p.name, p.is_available, p.status, p.stock_qty, COUNT(v.id)::int AS variant_count
      FROM products p
      LEFT JOIN products_variants v ON v._parent_id = p.id
      WHERE COALESCE(p.condition::text, 'new') <> 'used'
        AND COALESCE(p.product_group::text, '') <> 'trade-in'
      GROUP BY p.id
    `)
    const sites = variants.rows.map(parseSite)

    const decisions = new Map()
    const qtys = new Map()
    for (const site of sites) {
      const qty = qtyFor(site, items, sites)
      if (qty === null) continue
      decisions.set(site.id, qty > 0)
      qtys.set(site.id, qty)
    }
    const byProduct = new Map()
    for (const row of variants.rows) {
      const list = byProduct.get(row.product_id) || []
      list.push(row)
      byProduct.set(row.product_id, list)
    }
    const productAvail = new Map()
    const productStatus = new Map()
    const productQty = new Map()
    for (const product of products.rows) {
      const own = byProduct.get(product.id) || []
      const managed = own.filter((row) => decisions.has(row.id))
      let available = null
      const model = modelKey(product.name)
      const total = model ? items.filter((item) => item.model === model).reduce((sum, item) => sum + item.qty, 0) : 0
      if (managed.length) available = managed.some((row) => decisions.get(row.id))
      else if (!own.length && model) available = total > 0
      if (available === null) continue
      productAvail.set(product.id, true)
      productStatus.set(product.id, available ? 'in_stock' : 'out_of_stock')
      productQty.set(product.id, total)
    }
    if (!items.length) {
      console.error('MoySklad returned 0 items, aborting to prevent wiping stock')
      process.exitCode = 1
      return
    }
    if (dry) {
      console.log(JSON.stringify({ ok: true, dry, msRows: rows.length, items: items.length, managedVariants: decisions.size }))
      return
    }
    const changes = []
    await client.query('BEGIN')
    for (const row of variants.rows) {
      if (!qtys.has(row.id)) continue
      const qty = qtys.get(row.id)
      const available = qty > 0
      const status = available ? 'in_stock' : 'out_of_stock'
      if (Boolean(row.is_available) === available && row.status === status && Number(row.stock_qty) === qty) continue
      changes.push({ id: row.id, name: String(row.name).trim(), to: status, qty })
      await client.query(
        `UPDATE products_variants SET is_available = $1, status = $2::"enum_products_variants_status", stock_qty = $3 WHERE id = $4`,
        [available, status, qty, row.id],
      )
    }
    for (const product of products.rows) {
      if (!productStatus.has(product.id)) continue
      const available = productAvail.get(product.id)
      const status = productStatus.get(product.id)
      const qty = productQty.get(product.id) || 0
      if (Boolean(product.is_available) === Boolean(available) && product.status === status && Number(product.stock_qty) === qty) continue
      changes.push({ id: product.id, name: String(product.name).trim(), to: status, qty, product: true })
      await client.query(
        `UPDATE products SET is_available = $1, status = $2::"enum_products_status", stock_qty = $3 WHERE id = $4`,
        [available, status, qty, product.id],
      )
    }
    await applyAccessories(client, rows, changes)
    await applyAppleChargers(client, rows, changes)
    await client.query('COMMIT')
    console.log(JSON.stringify({ ok: true, dry, msRows: rows.length, items: items.length, managedVariants: decisions.size, updated: changes.length }))
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    throw error
  } finally {
    await client.end()
  }
}

const here = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === here) await main()
