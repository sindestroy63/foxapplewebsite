import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const targets = [
  ['Ярослав', 'yaroslav@fohstore.ru', 'manager'], ['Андрей', 'andrey@fohstore.ru', 'manager'], ['Сергей', 'sergey@fohstore.ru', 'manager'],
  ['Виктория', 'victoria@fohstore.ru', 'manager'], ['Данил', 'danil@fohstore.ru', 'manager'], ['IntellexGroup', 'intellexgroup@fohstore.ru', 'superadmin'],
] as const
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const password = () => `${crypto.randomBytes(18).toString('base64url')}!#${crypto.randomBytes(4).toString('hex')}`

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  const payload = await getPayload({ config })
  const before = (await payload.find({ collection: 'users', limit: 1000, pagination: false, depth: 0, overrideAccess: true })).docs as any[]
  const emails = targets.map((x) => x[1]); const match = ([name, email]: readonly [string, string, string]) => before.find((u) => u.email === email) || before.find((u) => String(u.name || '').trim().toLowerCase() === name.toLowerCase())
  const matchedIds = new Set(targets.map((target) => match(target)?.id).filter(Boolean)); const extras = before.filter((u) => !matchedIds.has(u.id) && !emails.includes(u.email))
  const report: any = { generatedAt: new Date().toISOString(), countBefore: before.length, targets: targets.map(([name, email, role]) => ({ name, email, role, existing: Boolean(match([name, email, role])), existingId: match([name, email, role])?.id })), extras: extras.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role })), dependencies: [] }
  for (const extra of extras) {
    const refs = await client.query("select table_name,column_name from information_schema.columns where table_schema='public' and column_name in ('user_id','author_id','created_by','updated_by')")
    for (const ref of refs.rows) { const n = (await client.query(`select count(*)::int as n from \"${ref.table_name}\" where \"${ref.column_name}\"=$1`, [extra.id])).rows[0].n; if (n) report.dependencies.push({ userId: extra.id, ...ref, count: n }) }
  }
  const out = path.resolve(process.cwd(), 'backups', `users-provision-plan-${stamp()}.json`); await fs.mkdir(path.dirname(out), { recursive: true }); await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
  if (process.env.USERS_PROVISION_CONFIRM !== 'YES') { await client.end(); await payload.destroy(); return }
  if (report.dependencies.length) throw new Error(`Cannot delete users with dependencies: ${JSON.stringify(report.dependencies)}`)
  const generated = new Map<string, string>(); for (const [, email] of targets) generated.set(email, password())
  for (const [name, email, role] of targets) {
    const existing = match([name, email, role])
    if (existing) await payload.update({ collection: 'users', id: existing.id, data: { name, email, role, password: generated.get(email) }, overrideAccess: true })
    else await payload.create({ collection: 'users', data: { name, email, role, password: generated.get(email) }, overrideAccess: true })
  }
  for (const extra of extras) await payload.delete({ collection: 'users', id: extra.id, overrideAccess: true })
  const after = (await payload.find({ collection: 'users', limit: 1000, pagination: false, depth: 0, overrideAccess: true })).docs as any[]
  const afterReport = { generatedAt: new Date().toISOString(), countAfter: after.length, users: after.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: 'password set', passwordSet: true })) }
  const afterPath = path.resolve(process.cwd(), 'backups', `users-provision-after-${stamp()}.json`); await fs.writeFile(afterPath, `${JSON.stringify(afterReport, null, 2)}\n`)
  console.log(JSON.stringify({ afterReport, passwords: targets.map(([name, email, role]) => ({ name, email, role, password: generated.get(email) })) }, null, 2))
  await client.end(); await payload.destroy()
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
