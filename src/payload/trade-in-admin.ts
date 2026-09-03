import type { Endpoint } from 'payload'
import { hasFullAdminAccess } from './access'

const canManageTradeIn = (req: any) => hasFullAdminAccess(req.user)

const parseTradeInData = (body: any, { creating }: { creating: boolean }) => {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const price = Number(body?.price)
  const images = Array.isArray(body?.images) ? body.images.map(Number).filter(Number.isInteger) : []
  const data: Record<string, unknown> = {
    productGroup: 'trade-in',
    condition: 'used',
    name,
    price,
    shortDescription: typeof body?.shortDescription === 'string' ? body.shortDescription : '',
    images,
    isAvailable: body?.isAvailable !== false,
    status: ['in_stock', 'preorder', 'out_of_stock'].includes(body?.status) ? body.status : 'in_stock',
  }

  if (!name) throw new Error('Название товара обязательно.')
  if (!Number.isFinite(price) || price < 0) throw new Error('Укажите корректную цену.')
  if (creating && typeof body?.slug === 'string') data.slug = body.slug
  return data
}

export const tradeInAdminEndpoints: Endpoint[] = [{
  path: '/trade-in-products',
  method: 'get',
  handler: async (req) => {
    if (!canManageTradeIn(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const result = await req.payload.find({
      collection: 'products',
      where: { productGroup: { equals: 'trade-in' } },
      depth: 1,
      limit: 100,
      sort: '-updatedAt',
      req,
    })
    return Response.json({ docs: result.docs })
  },
}, {
  path: '/trade-in-products',
  method: 'post',
  handler: async (req) => {
    if (!canManageTradeIn(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    try {
      const body = await req.json?.()
      const product = await req.payload.create({ collection: 'products', data: parseTradeInData(body, { creating: true }) as any, depth: 1, req })
      return Response.json({ product }, { status: 201 })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Не удалось создать Trade-in товар.' }, { status: 400 })
    }
  },
}, {
  path: '/trade-in-products',
  method: 'patch',
  handler: async (req) => {
    if (!canManageTradeIn(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    try {
      const body = await req.json?.()
      const id = Number(body?.id)
      if (!Number.isInteger(id)) return Response.json({ error: 'ID товара обязателен.' }, { status: 400 })
      const existing = await req.payload.findByID({ collection: 'products', id, depth: 0, req }) as any
      if (!existing || existing.productGroup !== 'trade-in') return Response.json({ error: 'Trade-in товар не найден.' }, { status: 404 })
      const product = await req.payload.update({ collection: 'products', id, data: parseTradeInData(body, { creating: false }) as any, depth: 1, req })
      return Response.json({ product })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Не удалось сохранить Trade-in товар.' }, { status: 400 })
    }
  },
}, {
  path: '/trade-in-products',
  method: 'delete',
  handler: async (req) => {
    if (!canManageTradeIn(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    try {
      const body = await req.json?.()
      const id = Number(body?.id)
      if (!Number.isInteger(id)) return Response.json({ error: 'ID товара обязателен.' }, { status: 400 })
      const existing = await req.payload.findByID({ collection: 'products', id, depth: 0, req }) as any
      if (!existing || existing.productGroup !== 'trade-in') return Response.json({ error: 'Trade-in товар не найден.' }, { status: 404 })
      await req.payload.delete({ collection: 'products', id, req })
      return Response.json({ ok: true })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Не удалось удалить Trade-in товар.' }, { status: 400 })
    }
  },
}]
