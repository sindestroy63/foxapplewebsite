import { z } from 'zod'

export const aiCatalogItemSchema = z.object({
  sourceLine: z.string().min(1),
  contextHeading: z.string(),
  modelText: z.string().min(1),
  price: z.number().int().min(1).max(10_000_000),
  storage: z.string().nullable(),
  ram: z.string().nullable(),
  color: z.string().nullable(),
  sim: z.string().nullable(),
  region: z.string(),
  revision: z.string().nullable(),
  manufacturerModelNumber: z.string().nullable(),
  notes: z.array(z.string()),
}).strict()

export const aiPriceUpdateSchema = z.object({
  items: z.array(aiCatalogItemSchema).max(1000),
  questions: z.array(z.string()),
}).strict()

export type AICatalogItem = z.infer<typeof aiCatalogItemSchema>
export type AIPriceUpdate = z.infer<typeof aiPriceUpdateSchema>

export function normalizeAIPriceUpdateResponse(value: unknown): unknown {
  return Array.isArray(value) ? { items: value, questions: [] } : value
}
