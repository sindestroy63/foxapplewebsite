import pg from 'pg'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve))
}

async function main() {
  const password = await question('Production PostgreSQL password: ')
  rl.close()

  const client = new pg.Client({
    host: '127.0.0.1',
    port: 15433,
    database: 'foxapple',
    user: 'foxstore_reader',
    password,
  })

  await client.connect()

  console.log('\n═══ PRODUCTION CATALOG DIAGNOSTICS ═══\n')

  // 1. Marshall headphones
  console.log('1. Marshall headphones:')
  const marshall = await client.query(`
    SELECT id, name, slug, product_group, is_available
    FROM products
    WHERE name ILIKE '%marshall%'
    ORDER BY id
  `)
  console.table(marshall.rows)

  // 2. GoPro
  console.log('\n2. GoPro:')
  const gopro = await client.query(`
    SELECT id, name, slug, product_group, is_available
    FROM products
    WHERE name ILIKE '%gopro%'
    ORDER BY id
  `)
  console.table(gopro.rows)

  // 3. Dyson products
  console.log('\n3. Dyson products:')
  const dyson = await client.query(`
    SELECT id, name, slug, product_group, is_available
    FROM products
    WHERE name ILIKE '%dyson%'
    ORDER BY id
  `)
  console.table(dyson.rows)

  // 4. Instax cameras
  console.log('\n4. Instax cameras:')
  const instax = await client.query(`
    SELECT id, name, slug, product_group, is_available
    FROM products
    WHERE name ILIKE '%instax%'
    ORDER BY id
  `)
  console.table(instax.rows)

  // 5. Navigation entries for these products
  console.log('\n5. Navigation entries:')
  const nav = await client.query(`
    SELECT cn.id, cn.href, cn.placement, p.id as product_id, p.name, p.slug, p.product_group
    FROM catalog_navigation cn
    JOIN products p ON cn.product = p.id
    WHERE p.name ILIKE '%marshall%'
       OR p.name ILIKE '%gopro%'
       OR p.name ILIKE '%dyson%'
       OR p.name ILIKE '%instax%'
    ORDER BY cn.placement, p.name
  `)
  console.table(nav.rows)

  // 6. Catalog navigation structure
  console.log('\n6. Photo/Video category navigation:')
  const photoNav = await client.query(`
    SELECT id, key, placement, href, product
    FROM catalog_navigation
    WHERE placement LIKE 'drugoe.foto-i-video%'
       OR placement LIKE 'other.photo-video%'
    ORDER BY placement
  `)
  console.table(photoNav.rows)

  await client.end()
  console.log('\n═══ DIAGNOSTICS COMPLETE ═══\n')
}

main().catch(console.error)
