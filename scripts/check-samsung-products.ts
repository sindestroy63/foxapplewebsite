import payload from 'payload'
import config from '@payload-config'

async function checkSamsungProducts() {
  await payload.init({ config })

  const result = await payload.find({
    collection: 'products',
    where: {
      id: { in: [69, 74, 78] }
    },
    limit: 10
  })

  console.log(JSON.stringify(result.docs.map(d => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    isAvailable: d.isAvailable,
    productGroup: d.productGroup,
    createdAt: d.createdAt
  })), null, 2))

  process.exit(0)
}

checkSamsungProducts().catch(err => {
  console.error(err)
  process.exit(1)
})
