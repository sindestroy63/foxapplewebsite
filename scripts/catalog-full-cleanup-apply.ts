import pg from 'pg'

async function main() {
  if (process.env.CATALOG_FULL_CLEANUP_APPLY_CONFIRM !== 'YES') throw new Error('Refusing to apply without CATALOG_FULL_CLEANUP_APPLY_CONFIRM=YES')
  throw new Error('Apply is intentionally disabled until an approved plan explicitly lists data changes; no automatic Product/variant/Media operation is implemented.')
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
