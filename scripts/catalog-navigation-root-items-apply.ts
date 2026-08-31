import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const groups = ['smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles', 'home-appliances', 'smart-devices', 'other']

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const backupDir = path.resolve(process.cwd(), 'backups')
  await fs.mkdir(backupDir, { recursive: true })
  const before = (await client.query('SELECT * FROM catalog_navigation ORDER BY parent_id NULLS FIRST, sort_order NULLS LAST, id')).rows
  const roots = before.filter((row: any) => row.parent_id == null)
  const tradeIn = before.find((row: any) => row.stable_key === 'service:trade-in')
  const report: any = {
    generatedAt: new Date().toISOString(),
    readOnly: process.env.CATALOG_NAVIGATION_ROOT_APPLY_CONFIRM !== 'YES',
    writesPerformed: 0,
    before: { roots, tradeIn: tradeIn || null },
    plan: { createTradeIn: !tradeIn, updateTradeIn: Boolean(tradeIn), allowedGroups: groups, targetSortOrder: Math.max(0, ...roots.map((row: any) => Number(row.sort_order) || 0)) + 1 },
  }
  const planPath = path.join(backupDir, `catalog-navigation-root-items-plan-${stamp()}.json`)
  await fs.writeFile(planPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (process.env.CATALOG_NAVIGATION_ROOT_APPLY_CONFIRM !== 'YES') { console.log(JSON.stringify(report.plan, null, 2)); console.log(planPath); await client.end(); return }
  if (process.env.CATALOG_NAVIGATION_ROOT_BACKUP_CONFIRMED !== 'YES') {
    console.error('Apply остановлен: внешний PostgreSQL backup не подтверждён.')
    console.error('Сначала выполните backup через контейнер postgres, проверьте созданный файл на host, затем повторите apply с CATALOG_NAVIGATION_ROOT_BACKUP_CONFIRMED=YES.')
    await client.end()
    process.exitCode = 2
    return
  }
  const backupFile = process.env.CATALOG_NAVIGATION_ROOT_BACKUP_FILE
  if (backupFile) {
    try {
      const stat = await fs.stat(path.resolve(process.cwd(), backupFile))
      if (!stat.isFile()) throw new Error('not a file')
      console.log(`Backup-файл подтверждён: ${path.basename(backupFile)} (${stat.size} байт).`)
    } catch {
      console.error(`Указанный backup-файл не найден внутри app-контейнера: ${path.basename(backupFile)}`)
      await client.end()
      process.exitCode = 2
      return
    }
  }
  console.log('Внешний PostgreSQL backup подтверждён пользователем.')
  const applyStamp = stamp()
  await client.query('BEGIN')
  try {
    const order = report.plan.targetSortOrder
    if (tradeIn) {
      await client.query("UPDATE catalog_navigation SET title='Trade-in', kind='custom_link', parent_id=NULL, product_id=NULL, href='/trade-in', is_visible=true, is_new=false, sort_order=$1, generated_by='system' WHERE id=$2", [tradeIn.sort_order ?? order, tradeIn.id])
    } else {
      await client.query("INSERT INTO catalog_navigation (title, kind, parent_id, product_id, href, sort_order, is_visible, is_new, stable_key, generated_by) VALUES ('Trade-in','custom_link',NULL,NULL,'/trade-in',$1,true,false,'service:trade-in','system')", [order])
    }
    await client.query('COMMIT')
    const after = (await client.query('SELECT * FROM catalog_navigation ORDER BY parent_id NULLS FIRST, sort_order NULLS LAST, id')).rows
    report.readOnly = false; report.writesPerformed = 1; report.after = { roots: after.filter((row: any) => row.parent_id == null), tradeIn: after.find((row: any) => row.stable_key === 'service:trade-in') || null, externalBackupConfirmed: true }
    const afterPath = path.join(backupDir, `catalog-navigation-root-items-after-${applyStamp}.json`)
    await fs.writeFile(afterPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report.after, null, 2)); console.log(afterPath)
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { await client.end() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
