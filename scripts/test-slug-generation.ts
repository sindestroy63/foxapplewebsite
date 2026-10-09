/**
 * Test slug generation for new products
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { normalizeSlug, generateUniqueSlug, validateSlug } from '../src/lib/slug-generator'

async function testSlugGeneration() {
  console.log('🧪 Testing slug generation for new products...\n')

  const payload = await getPayload({ config })

  const testProducts = [
    { name: 'Наушники' },
    { name: 'Часы Samsung' },
    { name: 'Apple MacBook Pro M5' },
  ]

  for (const product of testProducts) {
    try {
      console.log(`Testing: "${product.name}"`)

      // Step 1: Normalize
      const normalized = normalizeSlug(product.name)
      console.log(`  1️⃣ Normalized: "${normalized}"`)

      // Step 2: Validate
      const validation = validateSlug(normalized)
      console.log(`  2️⃣ Validation: ${validation.valid ? '✅ Valid' : '❌ Invalid - ' + validation.error}`)

      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Step 3: Check uniqueness
      const slug = await generateUniqueSlug(payload, 'products', product.name)
      console.log(`  3️⃣ Final slug: "${slug}"`)

      // Step 4: Verify it's not taken
      const existing = await payload.find({
        collection: 'products',
        where: { slug: { equals: slug } },
        limit: 1,
        overrideAccess: true,
      })

      console.log(`  4️⃣ Uniqueness check: ${existing.totalDocs === 0 ? '✅ Available' : '⚠️  Already exists'}`)
      console.log()
    } catch (error: any) {
      console.error(`  ❌ Error for "${product.name}":`, error.message)
      console.log()
    }
  }

  console.log('═══════════════════════════════════════')
  console.log('✅ Slug generation test complete')
  console.log('═══════════════════════════════════════\n')

  process.exit(0)
}

testSlugGeneration().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
