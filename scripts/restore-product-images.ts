import payload from 'payload'
import config from '@payload-config'

async function restoreImages() {
  await payload.init({ config })

  console.log('=== Restore Product Images ===')

  // Product 51 - Dyson HT01: replace missing media with existing
  const dyson = await payload.findByID({ collection: 'products', id: 51, depth: 0 })
  console.log('\nProduct 51 (Dyson) current images:', dyson.images)

  const dysonMediaIds = [788, 789] // amber ht01 existing files
  await payload.update({
    collection: 'products',
    id: 51,
    data: { images: dysonMediaIds }
  })
  console.log('✅ Updated Product 51 with media IDs:', dysonMediaIds)

  // Verify
  const dysonUpdated = await payload.findByID({ collection: 'products', id: 51, depth: 1 })
  console.log('Verified images:', dysonUpdated.images?.map((img: any) => img.filename))

  process.exit(0)
}

restoreImages().catch(console.error)
