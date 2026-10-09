import payload from 'payload'
import config from '@payload-config'
import { productCanonicalUrl } from '../src/lib/product-url.ts'
import { normalizeProduct } from '../src/lib/normalize.ts'

async function testDirectLookup() {
  await payload.init({ config })

  const categorySlug = 'smart-watches'
  const productSlug = 'chasy-samsung-galaxy-watch-8-classic'

  console.log('=== SIMULATING getProductBySlugs ===')
  console.log('categorySlug:', categorySlug)
  console.log('productSlug:', productSlug)
  console.log('')

  const slugCandidates = [...new Set([productSlug.trim(), productSlug.trim()])]
  console.log('slugCandidates:', slugCandidates)

  const result = await payload.find({
    collection: 'products',
    depth: 2,
    limit: 1,
    where: {
      and: [
        { slug: { in: slugCandidates } },
        { isAvailable: { equals: true } },
      ],
    },
  })

  console.log('Query found:', result.docs.length, 'products')

  if (result.docs[0]) {
    const matched = result.docs[0] as any
    console.log('Matched product:', {
      id: matched.id,
      name: matched.name,
      slug: matched.slug,
      productGroup: matched.productGroup,
    })

    const canonical = productCanonicalUrl(matched)
    console.log('Canonical URL:', canonical)

    const check = canonical?.startsWith(`/catalog/${categorySlug}/`)
    console.log(`Check: canonical starts with "/catalog/${categorySlug}/":`, check)

    if (check) {
      const normalized = normalizeProduct(matched)
      console.log('Would return normalized product:', normalized.id)
    } else {
      console.log('Would return null (canonical check failed)')
    }
  } else {
    console.log('Would return null (no product found)')
  }

  process.exit(0)
}

testDirectLookup().catch(console.error)
