import payload from 'payload'
import config from '@payload-config'

async function checkConflict() {
  await payload.init({ config })

  const result = await payload.find({
    collection: 'products',
    where: {
      or: [
        { id: { equals: 69 } },
        { slug: { equals: 'chasy-samsung' } }
      ]
    },
    limit: 10
  })

  console.log(JSON.stringify(result.docs.map(d => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    isAvailable: d.isAvailable,
    productGroup: d.productGroup
  })), null, 2))

  process.exit(0)
}

checkConflict().catch(err => {
  console.error(err)
  process.exit(1)
})
