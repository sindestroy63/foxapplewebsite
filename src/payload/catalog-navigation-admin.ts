import type { Endpoint } from 'payload'
import { commitTransaction, initTransaction, killTransaction } from 'payload'

const isAdmin = (req: any) => req.user?.role === 'admin' || req.user?.role === 'superadmin'
const isSuperadmin = (req: any) => req.user?.role === 'superadmin'
const parents: Record<string, string[]> = { brand: ['group'], line: ['group', 'brand'], product: ['group', 'brand', 'line'], custom_link: ['group', 'brand', 'line'] }
const idOf = (value: any) => typeof value === 'object' ? value?.id : value
const isPlacementKind = (kind: unknown) => kind === 'group' || kind === 'brand' || kind === 'line'
const isAllowedUser = (req: any) => ['manager', 'admin', 'superadmin'].includes(req.user?.role)
const placementLabel = (doc: any) => String(doc.title || '').toLowerCase()

async function resolvePlacement(req: any, placementId: string | number) {
  const docs: any[] = []
  let current = await req.payload.findByID({ collection: 'catalog-navigation', id: placementId, depth: 0, req }) as any
  const seen = new Set<string>()
  while (current) {
    const key = String(current.id)
    if (seen.has(key)) throw new Error('Navigation cycle detected')
    seen.add(key)
    docs.unshift(current)
    const parentId = idOf(current.parent)
    if (!parentId) break
    current = await req.payload.findByID({ collection: 'catalog-navigation', id: parentId, depth: 0, req }) as any
  }
  const selected = docs[docs.length - 1]
  if (!selected || !isPlacementKind(selected.kind) || selected.isVisible === false) throw new Error('Placement node is not selectable')
  if (docs.some((doc) => !isPlacementKind(doc.kind) || doc.isVisible === false)) throw new Error('Placement path is not selectable')
  if (docs.some((doc) => /trade[ -]?in|б\/у|used/i.test(placementLabel(doc)))) throw new Error('Service and used nodes are not selectable')
  const group = docs.find((doc) => doc.kind === 'group')
  const brand = [...docs].reverse().find((doc) => doc.kind === 'brand')
  const line = [...docs].reverse().find((doc) => doc.kind === 'line')
  if (!group) throw new Error('Placement group is missing')
  return { selected, docs, productGroup: group.productGroup || group.stableKey?.replace(/^group:/, '') || null, brand: brand?.brand || brand?.title || null, productLine: line?.productLine || line?.title || null }
}

export const catalogNavigationAdminEndpoints: Endpoint[] = [{ path: '/catalog-placement-options', method: 'get', handler: async (req) => {
  if (!isAllowedUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const result = await req.payload.find({ collection: 'catalog-navigation', depth: 0, limit: 1000, pagination: false, sort: 'sortOrder', req })
  const docs = result.docs as any[]
  const byId = new Map(docs.map((doc) => [String(doc.id), doc]))
  const pathFor = (doc: any) => {
    const chain: any[] = []
    let current: any = doc
    const seen = new Set<string>()
    while (current && !seen.has(String(current.id))) { seen.add(String(current.id)); chain.unshift(current); current = byId.get(String(idOf(current.parent))) }
    if (chain.some((item) => item.isVisible === false || /б\/у|used/i.test(placementLabel(item)))) return null
    return chain.map((item) => item.title).join(' → ')
  }
  const options = docs.filter((doc) => isPlacementKind(doc.kind) && doc.isVisible !== false && (doc.productGroup !== 'trade-in' || req.user?.role === 'superadmin')).flatMap((doc) => {
    const path = pathFor(doc)
    return path ? [{ id: doc.id, kind: doc.kind, path }] : []
  })
  const current: Record<string, { id: string | number; path: string }> = {}
  for (const doc of docs.filter((item) => item.kind === 'product' && item.product)) {
    const parent = byId.get(String(idOf(doc.parent)))
    const path = parent ? pathFor(parent) : null
    const productId = idOf(doc.product)
    if (productId && path) current[String(productId)] = { id: parent.id, path }
  }
  return Response.json({ options, current })
}}, { path: '/catalog-placement', method: 'post', handler: async (req) => {
  if (!isAllowedUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json?.() as any
  if (!body?.productId || !body?.placementId) return Response.json({ error: 'productId and placementId are required' }, { status: 400 })
  const product = await req.payload.findByID({ collection: 'products', id: body.productId, depth: 0, req }) as any
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 })
  let productUpdated = false
  let generated: any = null
  let previousParent: any = null
  let createdNavigationId: string | number | null = null
  try {
    const placement = await resolvePlacement(req, body.placementId)
    const productGroup = String(placement.productGroup || '')
    if (!productGroup || productGroup === 'used' || productGroup === 'trade-in') throw new Error('Product group is not eligible')
    const updated = await req.payload.update({ collection: 'products', id: product.id, data: { productGroup, brand: placement.brand, productLine: placement.productLine || null } as any, depth: 0, req })
    productUpdated = true
    const nav = await req.payload.find({ collection: 'catalog-navigation', where: { product: { equals: product.id } }, depth: 0, limit: 100, req })
    generated = (nav.docs as any[]).find((item) => String(item.stableKey || '') === `product:${product.id}` || String(item.generatedBy || '').startsWith('generated'))
    if (generated) {
      previousParent = generated.parent
      await req.payload.update({ collection: 'catalog-navigation', id: generated.id, data: { parent: placement.selected.id }, depth: 0, req })
    } else {
      const created = await req.payload.create({ collection: 'catalog-navigation', data: { title: product.name, kind: 'product', parent: placement.selected.id, product: product.id, href: `/catalog/${productGroup}/${product.slug}`, sortOrder: 100, isVisible: true, isNew: false, stableKey: `product:${product.id}`, generatedBy: 'generated:product-placement' } as any, depth: 0, req })
      createdNavigationId = created.id
    }
    return Response.json({ ok: true, product: updated, placement: { path: placement.docs.map((doc) => doc.title).join(' → '), productGroup, brand: placement.brand, productLine: placement.productLine } })
  } catch (error) {
    try {
      if (createdNavigationId) await req.payload.delete({ collection: 'catalog-navigation', id: createdNavigationId, req })
      if (generated?.id && previousParent !== null) await req.payload.update({ collection: 'catalog-navigation', id: generated.id, data: { parent: previousParent }, depth: 0, req })
      if (productUpdated) await req.payload.update({ collection: 'products', id: product.id, data: { productGroup: product.productGroup, brand: product.brand, productLine: product.productLine } as any, depth: 0, req })
    } catch (rollbackError) {
      console.error('Catalog placement rollback failed', rollbackError)
    }
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid placement' }, { status: 400 })
  }
}}, { path: '/catalog-navigation-admin', method: 'get', handler: async (req) => {
  if (!isAdmin(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const result = await req.payload.find({ collection: 'catalog-navigation', depth: 1, limit: 1000, pagination: false, sort: 'sortOrder', req })
  return Response.json({ docs: result.docs, canManageRoots: isSuperadmin(req), canDeleteSubtrees: isAdmin(req) })
}}, { path: '/catalog-navigation-admin', method: 'post', handler: async (req) => {
  if (!isAdmin(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json?.() as any
  if (body.action === 'createRoot') {
    if (!isSuperadmin(req)) return Response.json({ error: 'Only superadmin can add root sections' }, { status: 403 })
    const kind = String(body.kind || '')
    const title = String(body.title || '').trim()
    if (!title || !['group', 'custom_link'].includes(kind)) return Response.json({ error: 'Invalid root section' }, { status: 400 })
    const allowedGroups = ['smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles', 'home-appliances', 'smart-devices', 'other']
    const groupKey = String(body.groupKey || '')
    const href = String(body.href || '')
    if (kind === 'group' && (!allowedGroups.includes(groupKey) || /trade[ -]?in/i.test(title))) return Response.json({ error: 'Unsupported product group' }, { status: 400 })
    if (kind === 'custom_link' && (!/^\/(?!\/)/.test(href) || /^(?:javascript|data|https?):/i.test(href))) return Response.json({ error: 'Only internal paths are allowed' }, { status: 400 })
    const stableKey = kind === 'custom_link' && href === '/trade-in' ? 'service:trade-in' : String(body.stableKey || `manual:root:${Date.now()}`)
    const duplicate = await req.payload.find({ collection: 'catalog-navigation', where: { or: [{ stableKey: { equals: stableKey } }, ...(kind === 'group' ? [{ productGroup: { equals: groupKey } }, { and: [{ kind: { equals: 'group' } }, { title: { equals: title } }] }] : [])] }, limit: 1, depth: 0, req })
    if (duplicate.totalDocs) return Response.json({ error: kind === 'group' ? 'Такая товарная группа уже есть в навигации.' : 'Такая сервисная ссылка уже есть в навигации.' }, { status: 409 })
    const roots = await req.payload.find({ collection: 'catalog-navigation', where: { parent: { equals: null } }, limit: 1000, depth: 0, req })
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : Math.max(0, ...(roots.docs as any[]).map((item) => Number(item.sortOrder) || 0)) + 1
    return Response.json(await req.payload.create({ collection: 'catalog-navigation', data: { title, kind, parent: null, productGroup: kind === 'group' ? groupKey : null, href: kind === 'custom_link' ? href : undefined, sortOrder, isVisible: body.isVisible !== false, isNew: false, stableKey, generatedBy: kind === 'custom_link' && href === '/trade-in' ? 'system' : 'admin' } as any, depth: 0, req }))
  }
  if (body.action === 'create') {
    const parent = body.parentId ? await req.payload.findByID({ collection: 'catalog-navigation', id: body.parentId, depth: 0, req }) as any : null
    if (body.kind === 'group' ? parent : (!parent || !parents[body.kind]?.includes(parent.kind))) return Response.json({ error: 'Invalid parent for kind' }, { status: 400 })
    if (!body.title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 })
    if (body.kind === 'product') {
      if (!body.productId) return Response.json({ error: 'Product is required' }, { status: 400 })
      const product = await req.payload.findByID({ collection: 'products', id: body.productId, depth: 0, req }) as any
      if (!product || product.productGroup === 'used' || product.productGroup === 'trade-in') return Response.json({ error: 'Product is not eligible for catalog navigation' }, { status: 400 })
      const duplicate = await req.payload.find({ collection: 'catalog-navigation', where: { and: [{ parent: { equals: body.parentId } }, { product: { equals: body.productId } }] }, limit: 1, req })
      if (duplicate.totalDocs) return Response.json({ error: 'Product already exists under this parent' }, { status: 409 })
    }
    if (body.kind === 'custom_link' && (!/^\/(?!\/)/.test(String(body.href || '')) || /^(?:javascript|data|https?):/i.test(String(body.href || '')))) return Response.json({ error: 'Only internal paths are allowed' }, { status: 400 })
    if (parent?.kind === 'custom_link') return Response.json({ error: 'Service links cannot have children' }, { status: 400 })
    const stableKey = body.stableKey || `manual:${Date.now()}`
    const existing = await req.payload.find({ collection: 'catalog-navigation', where: { stableKey: { equals: stableKey } }, limit: 1, req }); if (existing.totalDocs) return Response.json({ error: 'stableKey already exists' }, { status: 409 })
    return Response.json(await req.payload.create({ collection: 'catalog-navigation', data: { title: body.title.trim(), kind: body.kind, parent: body.parentId || null, product: body.kind === 'product' ? body.productId : null, href: body.kind === 'custom_link' ? body.href : undefined, sortOrder: Number(body.sortOrder ?? 100), isVisible: true, isNew: false, stableKey, generatedBy: 'admin' } as any, depth: 1, req }))
  }
  const doc = await req.payload.findByID({ collection: 'catalog-navigation', id: body.id, depth: 1, req }) as any
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })
  if (body.action === 'edit') {
    if (!body.title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 })
    return Response.json(await req.payload.update({ collection: 'catalog-navigation', id: doc.id, data: { title: body.title.trim() }, depth: 1, req }))
  }
  if (body.action === 'toggle') return Response.json(await req.payload.update({ collection: 'catalog-navigation', id: doc.id, data: { isVisible: !doc.isVisible }, depth: 1, req }))
  if (body.action === 'coverImage') {
    if (!isSuperadmin(req)) return Response.json({ error: 'Only superadmin can change section covers' }, { status: 403 })
    if (doc.kind !== 'group') return Response.json({ error: 'Only group nodes can have covers' }, { status: 400 })
    const mediaId = body.mediaId === null || body.mediaId === '' ? null : Number(body.mediaId)
    if (mediaId !== null) {
      if (!Number.isInteger(mediaId)) return Response.json({ error: 'Invalid Media ID' }, { status: 400 })
      const media = await req.payload.findByID({ collection: 'media', id: mediaId, depth: 0, req })
      if (!media) return Response.json({ error: 'Media not found' }, { status: 404 })
    }
    return Response.json(await req.payload.update({ collection: 'catalog-navigation', id: doc.id, data: { coverImage: mediaId }, depth: 1, req }))
  }
  if (body.action === 'new') return Response.json(await req.payload.update({ collection: 'catalog-navigation', id: doc.id, data: { isNew: !doc.isNew }, depth: 1, req }))
  if (body.action === 'delete') { const children = await req.payload.find({ collection: 'catalog-navigation', where: { parent: { equals: doc.id } }, limit: 1, req }); if (children.totalDocs) return Response.json({ error: 'Remove or move child items first' }, { status: 409 }); await req.payload.delete({ collection: 'catalog-navigation', id: doc.id, req }); return Response.json({ ok: true }) }
  if (body.action === 'deleteSubtree') {
    if (!isAdmin(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    if (doc.kind === 'custom_link') return Response.json({ error: 'Service links cannot be removed with children' }, { status: 400 })
    if (String(body.confirmTitle || '') !== String(doc.title || '')) return Response.json({ error: 'Exact section title confirmation is required' }, { status: 400 })
    const started = await initTransaction(req as any)
    try {
      const all: any[] = []
      const collect = async (parentId: any) => { const result = await req.payload.find({ collection: 'catalog-navigation', where: { parent: { equals: parentId } }, limit: 1000, depth: 0, req }); for (const child of result.docs as any[]) { all.push(child); await collect(child.id) } }
      await collect(doc.id)
      for (const item of all.reverse()) await req.payload.delete({ collection: 'catalog-navigation', id: item.id, req })
      await req.payload.delete({ collection: 'catalog-navigation', id: doc.id, req })
      if (started) await commitTransaction(req as any)
      return Response.json({ ok: true, deletedNavigationRecords: all.length + 1 })
    } catch (error) {
      if (started) await killTransaction(req as any)
      return Response.json({ error: error instanceof Error ? error.message : 'Subtree deletion failed' }, { status: 500 })
    }
  }
  if (body.action === 'move') { const siblings = (await req.payload.find({ collection: 'catalog-navigation', where: { parent: { equals: idOf(doc.parent) || null } }, sort: 'sortOrder', limit: 100, req })).docs as any[]; const index = siblings.findIndex((x) => x.id === doc.id), next = index + Number(body.direction || 0); if (next < 0 || next >= siblings.length) return Response.json({ ok: true }); const other = siblings[next]; await req.payload.update({ collection: 'catalog-navigation', id: doc.id, data: { sortOrder: other.sortOrder }, req }); await req.payload.update({ collection: 'catalog-navigation', id: other.id, data: { sortOrder: doc.sortOrder }, req }); return Response.json({ ok: true }) }
  return Response.json({ error: 'Unknown action' }, { status: 400 })
}}]
