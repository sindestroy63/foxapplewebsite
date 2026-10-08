import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001'

// Expected slug fixes from dry-run plan (exact values from backups/slug-repair-plan-20261008-152648.json)
const EXPECTED_FIXES = [
  { id: 78, oldSlug: 'chasy-samsung-galaxy-watch 8-classic', newSlug: 'chasy-samsung-galaxy-watch-8-classic', group: 'smart-watches' },
  { id: 72, oldSlug: 'Экшн-камера GoPro', newSlug: 'ekshn-kamera-gopro', group: 'other' },
  { id: 70, oldSlug: 'Зарядные устройства', newSlug: 'zaryadnye-ustroystva', group: 'other' },
  { id: 69, oldSlug: 'Часы Samsung', newSlug: 'chasy-samsung-galaxy-watch-8', group: 'smart-watches' },
  { id: 67, oldSlug: 'Наушники Marshall', newSlug: 'naushniki-marshall', group: 'audio' },
  { id: 66, oldSlug: 'Аксессуары Apple', newSlug: 'aksessuary-apple', group: 'other' },
  { id: 63, oldSlug: 'Apple AirPods Max 2 (2026)', newSlug: 'apple-airpods-max-2-2026', group: 'audio' },
  { id: 62, oldSlug: 'Apple MacBook Pro (M5, 2025)', newSlug: 'apple-macbook-pro-m5-2025', group: 'laptops' },
  { id: 60, oldSlug: 'Фены Dyson', newSlug: 'feny-dyson', group: 'home-appliances' },
  { id: 58, oldSlug: 'Apple MacBook Air (M5, 2026)', newSlug: 'apple-macbook-air-m5-2026', group: 'laptops' },
  { id: 57, oldSlug: 'Apple iPad Pro (M5, 2025)', newSlug: 'apple-ipad-pro-m5-2025', group: 'tablets' },
  { id: 56, oldSlug: 'Apple-iPad-Air-(M4, 2026)', newSlug: 'apple-ipad-air-m4-2026', group: 'tablets' },
  { id: 55, oldSlug: 'Геймпады-PS5', newSlug: 'geympady-ps5', group: 'gaming-consoles' },
  { id: 51, oldSlug: 'Выпрямитель-Dyson-HT01 ', newSlug: 'vypryamitel-dyson-ht01', group: 'home-appliances' },
  { id: 20, oldSlug: 'Apple MacBook Neo (A18 Pro, 2026)', newSlug: 'apple-macbook-neo-a18-pro-2026', group: 'laptops' },
]

async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual' // Don't auto-follow redirects
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT')
    }
    throw error
  }
}

describe('Slug Repair Integration Tests', () => {
  let planData = null

  before(async () => {
    // Load latest dry-run plan
    const backupsDir = path.resolve(process.cwd(), 'backups')
    const files = await fs.readdir(backupsDir)
    const planFiles = files.filter(f => f.startsWith('slug-repair-plan-'))

    if (planFiles.length > 0) {
      const latestPlan = planFiles.sort().reverse()[0]
      const planPath = path.join(backupsDir, latestPlan)
      const content = await fs.readFile(planPath, 'utf-8')
      planData = JSON.parse(content)
      console.log(`\nLoaded plan: ${latestPlan}`)
      console.log(`Total fixes: ${planData.totalFixes}`)
      console.log(`Critical: ${planData.criticalFixes}, Non-critical: ${planData.nonCriticalFixes}\n`)
    }
  })

  describe('Dry-run plan validation', () => {
    it('should have generated a dry-run plan', () => {
      assert.ok(planData, 'No slug-repair-plan-*.json found in backups/')
    })

    it('should match expected number of fixes', () => {
      assert.ok(planData.totalFixes >= EXPECTED_FIXES.length,
        `Expected at least ${EXPECTED_FIXES.length} fixes, got ${planData.totalFixes}`)
    })

    it('should have no slug conflicts', () => {
      const slugs = planData.fixes.map(f => f.newSlug)
      const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i)
      assert.strictEqual(duplicates.length, 0, `Duplicate slugs found: ${duplicates.join(', ')}`)
    })

    it('should have no circular redirects', () => {
      const oldSlugs = new Set(planData.fixes.map(f => f.oldSlug))
      const circularFixes = planData.fixes.filter(f =>
        oldSlugs.has(f.newSlug) && f.newSlug !== f.oldSlug
      )
      assert.strictEqual(circularFixes.length, 0,
        `Circular redirects detected: ${circularFixes.map(f => `${f.id}: ${f.oldSlug} → ${f.newSlug}`).join(', ')}`)
    })
  })

  describe('Critical products validation', () => {
    EXPECTED_FIXES.forEach(({ id, oldSlug, newSlug, group }) => {
      describe(`Product ${id} (${oldSlug})`, () => {
        const legacyUrl = `${BASE_URL}/catalog/${group}/${oldSlug}`
        const canonicalUrl = `${BASE_URL}/catalog/${group}/${newSlug}`

        it(`should have plan entry for product ${id}`, () => {
          if (!planData) return
          const fix = planData.fixes.find(f => f.id === id)
          assert.ok(fix, `Product ${id} not found in plan`)
          assert.strictEqual(fix.oldSlug, oldSlug, `Old slug mismatch`)
          assert.strictEqual(fix.newSlug, newSlug, `New slug mismatch`)
        })

        it.skip(`[SKIP - requires APPLY] legacy URL should return 308 redirect`, async () => {
          const response = await fetchWithTimeout(legacyUrl)
          assert.strictEqual(response.status, 308,
            `Expected 308 for ${legacyUrl}, got ${response.status}`)
          assert.strictEqual(response.headers.get('location'), canonicalUrl,
            `Expected redirect to ${canonicalUrl}`)
        })

        it.skip(`[SKIP - requires APPLY] canonical URL should return 200 OK`, async () => {
          const response = await fetchWithTimeout(canonicalUrl)
          assert.strictEqual(response.status, 200,
            `Expected 200 for ${canonicalUrl}, got ${response.status}`)
        })
      })
    })
  })

  describe('Special cases', () => {
    it('Product 51 (Dyson) - trailing space + cyrillic', () => {
      if (!planData) return
      const fix = planData.fixes.find(f => f.id === 51)
      assert.ok(fix, 'Product 51 not found')
      assert.ok(fix.reason.includes('cyrillic'), 'Should detect cyrillic')
      assert.ok(fix.reason.includes('trailing_space'), 'Should detect trailing space')
      assert.strictEqual(fix.newSlug, 'vypryamitel-dyson-ht01', 'Should transliterate cyrillic')
    })

    it('Product 78 (Samsung Watch) - internal space', () => {
      if (!planData) return
      const fix = planData.fixes.find(f => f.id === 78)
      assert.ok(fix, 'Product 78 not found')
      assert.ok(fix.reason.includes('internal_space'), 'Should detect internal space')
      assert.strictEqual(fix.newSlug, 'chasy-samsung-galaxy-watch-8-classic',
        'Should replace internal space with hyphen')
    })

    it('Product 28 (Apple Watch Ultra 3) - should NOT be in critical fixes', () => {
      if (!planData) return
      const criticalFix = planData.fixes.find(f => f.id === 28 && f.isAvailable === true)
      assert.strictEqual(criticalFix, undefined,
        'Product 28 has isAvailable=false, should not be in critical fixes')
    })
  })

  describe('Middleware redirect rules', () => {
    it('should generate redirect rules for all critical fixes', () => {
      if (!planData) return
      const criticalFixes = planData.fixes.filter(f => f.isAvailable)

      // Check that all critical fixes have valid URLs
      criticalFixes.forEach(fix => {
        assert.ok(fix.legacyUrl, `Product ${fix.id} missing legacyUrl`)
        assert.ok(fix.canonicalUrl, `Product ${fix.id} missing canonicalUrl`)
        assert.ok(fix.legacyUrl.startsWith('/catalog/'),
          `Product ${fix.id} legacyUrl should start with /catalog/`)
        assert.ok(fix.canonicalUrl.startsWith('/catalog/'),
          `Product ${fix.id} canonicalUrl should start with /catalog/`)
      })
    })
  })
})
