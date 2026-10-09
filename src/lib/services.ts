import { getPayload } from 'payload'
import config from '@/payload.config'

export interface Service {
  id: string | number
  name: string
  slug: string
  description?: string
  images?: any[]
  price?: number
  priceLabel?: string
  isAvailable: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export async function getServices(): Promise<Service[]> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'services' as any,
      depth: 2,
      where: {
        isAvailable: { equals: true },
      },
      sort: 'sortOrder',
      limit: 100,
    })
    return result.docs as Service[]
  } catch (error) {
    console.error('Failed to load services', error)
    return []
  }
}

export async function getService(slug: string): Promise<Service | null> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'services' as any,
      depth: 2,
      where: {
        slug: { equals: slug },
      },
      limit: 1,
    })
    return result.docs[0] as Service || null
  } catch (error) {
    console.error('Failed to load service', error)
    return null
  }
}
