import payload from 'payload'
import config from '@payload-config'

async function fixCatalogData() {
  const APPLY = process.env.CATALOG_FIX_APPLY === '1'

  await payload.init({ config })

  const fixes = [
    { id: 51, field: 'slug', from: 'Выпрямитель-Dyson-HT01 ', to: 'Выпрямитель-Dyson-HT01', reason: 'trailing space' },
    { id: 101, field: 'productGroup', from: 'gaming-consoles', to: 'smart-devices', reason: 'Ray-Ban smart glasses' },
    { id: 173, field: 'productGroup', from: 'gaming-consoles', to: 'smart-devices', reason: 'Ray-Ban smart glasses' },
    { id: 174, field: 'productGroup', from: 'gaming-consoles', to: 'smart-devices', reason: 'Ray-Ban smart glasses' },
    { id: 175, field: 'productGroup', from: 'gaming-consoles', to: 'smart-devices', reason: 'Ray-Ban smart glasses' },
    { id: 185, field: 'productGroup', from: null, to: 'smartphones', reason: 'Pixel 10 is a smartphone' },
  ]

  console.log('=== Catalog Data Fix ===')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  for (const fix of fixes) {
    const product = await payload.findByID({
      collection: 'products',
      id: fix.id,
    })

    const productData = product as any
    console.log(`Product ${fix.id}: ${product.name}`)
    console.log(`  ${fix.field}: ${JSON.stringify(productData[fix.field])} → ${JSON.stringify(fix.to)}`)
    console.log(`  Reason: ${fix.reason}`)

    if (APPLY) {
      const data: any = {}
      data[fix.field] = fix.to

      await payload.update({
        collection: 'products',
        id: fix.id,
        data,
      })
      console.log('  ✓ Applied')
    } else {
      console.log('  [DRY-RUN]')
    }
    console.log()
  }

  console.log(APPLY ? '\n✓ All fixes applied' : '\nDRY-RUN complete. Set CATALOG_FIX_APPLY=1 to apply.')
  process.exit(0)
}

fixCatalogData().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
