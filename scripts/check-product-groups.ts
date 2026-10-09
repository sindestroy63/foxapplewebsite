import payload from 'payload'
import config from '@payload-config'

async function checkProductGroups() {
  await payload.init({ config })

  const issues = [
    { id: 51, name: 'Dyson', expectedGroup: 'home-appliances', issue: 'trailing space in slug' },
    { id: 101, name: 'Ray Ban Wayfarer Gen 2', expectedGroup: 'smart-devices', issue: 'wrong productGroup' },
    { id: 173, name: 'Ray Ban Display', expectedGroup: 'smart-devices', issue: 'wrong productGroup' },
    { id: 174, name: 'Ray-Ban Skyler Gen 2', expectedGroup: 'smart-devices', issue: 'wrong productGroup' },
    { id: 175, name: 'Ray-Ban Stories Gen 2', expectedGroup: 'smart-devices', issue: 'wrong productGroup' },
    { id: 185, name: 'Pixel 10', expectedGroup: 'smartphones', issue: 'null productGroup' },
  ]

  console.log('=== Product Group Audit ===\n')

  for (const item of issues) {
    const product = await payload.findByID({
      collection: 'products',
      id: item.id,
    })

    console.log(`Product ${item.id}: ${product.name}`)
    console.log(`  Current group: ${product.productGroup || 'null'}`)
    console.log(`  Expected group: ${item.expectedGroup}`)
    console.log(`  Issue: ${item.issue}`)
    console.log(`  isAvailable: ${product.isAvailable}`)
    if (item.id === 51) {
      console.log(`  Slug: "${product.slug || ''}" (has trailing space: ${product.slug ? product.slug !== product.slug.trim() : false})`)
    }
    console.log()
  }

  process.exit(0)
}

checkProductGroups().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
