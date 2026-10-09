// HTTP verification for slug repair
const BASE_URL = 'http://localhost:3000'

const tests = [
  // New canonical URLs should return 200
  { url: '/catalog/smart-watches/chasy-samsung-galaxy-watch-8-classic', expect: 200, desc: 'Product 78 canonical' },
  { url: '/catalog/home-appliances/vypryamitel-dyson-ht01', expect: 200, desc: 'Product 51 canonical' },
  { url: '/catalog/other/ekshn-kamera-gopro', expect: 200, desc: 'Product 72 canonical' },
  { url: '/catalog/gaming-consoles/geympady-ps5', expect: 200, desc: 'Product 55 canonical' },
  { url: '/catalog/audio/naushniki-marshall', expect: 200, desc: 'Product 67 canonical' },

  // Legacy URLs should redirect 308 to canonical
  { url: '/catalog/smart-watches/chasy-samsung-galaxy-watch 8-classic', expect: 308, desc: 'Product 78 legacy redirect' },
  { url: '/catalog/home-appliances/Выпрямитель-Dyson-HT01 ', expect: 308, desc: 'Product 51 legacy redirect' },
  { url: '/catalog/other/Экшн-камера GoPro', expect: 308, desc: 'Product 72 legacy redirect' },
  { url: '/catalog/gaming-consoles/Геймпады-PS5', expect: 308, desc: 'Product 55 legacy redirect' },
  { url: '/catalog/audio/Наушники Marshall', expect: 308, desc: 'Product 67 legacy redirect' },
]

async function verify() {
  const results = { passed: 0, failed: 0, skipped: 0, errors: [] as string[] }

  for (const test of tests) {
    try {
      const response = await fetch(BASE_URL + test.url, { redirect: 'manual' })
      const status = response.status

      if (status === test.expect) {
        console.log(`✓ ${test.desc}: ${status}`)
        results.passed++
      } else {
        console.log(`✗ ${test.desc}: expected ${test.expect}, got ${status}`)
        results.failed++
        results.errors.push(`${test.desc}: expected ${test.expect}, got ${status}`)
      }

      // Check redirect location for 308
      if (test.expect === 308 && status === 308) {
        const location = response.headers.get('location')
        console.log(`  → ${location}`)
      }
    } catch (err) {
      console.log(`✗ ${test.desc}: ${(err as Error).message}`)
      results.failed++
      results.errors.push(`${test.desc}: ${(err as Error).message}`)
    }
  }

  console.log(`\n=== RESULTS ===`)
  console.log(`Passed: ${results.passed}/${tests.length}`)
  console.log(`Failed: ${results.failed}/${tests.length}`)

  if (results.failed > 0) {
    console.log(`\nErrors:`)
    results.errors.forEach(e => console.log(`  - ${e}`))
    process.exitCode = 1
  }
}

verify().catch(console.error)
