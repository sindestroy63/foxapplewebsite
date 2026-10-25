import payload from 'payload'
import config from '@payload-config'

async function restoreImages() {
  await payload.init({ config })

  console.log('=== Restore Product Images ===')

  
  const dyson = await payload.findByID({ collection: 'products', id: 51, depth: 0 })
  console.log('\nProduct 51 (Dyson) current images:', dyson.images)

  const dysonMediaIds = [788, 789]  
  await payload.update({
    collection: 'products',
    id: 51,
    data: { images: dysonMediaIds }
  })
  console.log('✅ Updated Product 51 with media IDs:', dysonMediaIds)

  
  const dysonUpdated = await payload.findByID({ collection: 'products', id: 51, depth: 1 })
  console.log('Verified images:', dysonUpdated.images?.map((img: any) => img.filename))

  process.exit(0)
}

restoreImages().catch(console.error)
