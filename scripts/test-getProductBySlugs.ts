import payload from 'payload'
import config from '@payload-config'
import { productCanonicalUrl } from '../src/lib/product-url.ts'

async function test() {
  await payload.init({ config })

  console.log('=== TESTING getProductBySlugs LOGIC ===\n')

  // Test Product 78
  const p78 = await payload.find({
    collection: 'products',
    depth: 2,
    limit: 1,
    where: {
      and: [
        { slug: { equals: 'chasy-samsung-galaxy-watch-8-classic' } },
        { isAvailable: { equals: true } },
      ],
    },
  })

  console.log('Product 78 query result:', {
    found: p78.docs.length,
    product: p78.docs[0] ? {
      id: p78.docs[0].id,
      name: p78.docs[0].name,
      slug: p78.docs[0].slug,
      productGroup: p78.docs[0].productGroup,
      isAvailable: p78.docs[0].isAvailable,
    } : null
  })

  if (p78.docs[0]) {
    const canonical = productCanonicalUrl(p78.docs[0])
    console.log('Canonical URL:', canonical)
    console.log('Check against categorySlug "smart-watches":', canonical?.startsWith('/catalog/smart-watches/'))
  }

  console.log('\n=== TESTING iPhone ===\n')

  // Test working iPhone
  const iphone = await payload.find({
    collection: 'products',
    depth: 2,
    limit: 1,
    where: {
      and: [
        { slug: { equals: 'iphone-duo-ad90cd' } },
        { isAvailable: { equals: true } },
      ],
    },
  })

  console.log('iPhone query result:', {
    found: iphone.docs.length,
    product: iphone.docs[0] ? {
      id: iphone.docs[0].id,
      name: iphone.docs[0].name,
      slug: iphone.docs[0].slug,
      productGroup: iphone.docs[0].productGroup,
      isAvailable: iphone.docs[0].isAvailable,
    } : null
  })

  if (iphone.docs[0]) {
    const canonical = productCanonicalUrl(iphone.docs[0])
    console.log('Canonical URL:', canonical)
    console.log('Check against categorySlug "smartphones":', canonical?.startsWith('/catalog/smartphones/'))
  }

  process.exit(0)
}

test().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
