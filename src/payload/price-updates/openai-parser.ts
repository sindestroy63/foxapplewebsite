import OpenAI from 'openai'
import { z } from 'zod'
import { aiPriceUpdateSchema, normalizeAIPriceUpdateResponse } from './ai-response'

export { aiPriceUpdateSchema, normalizeAIPriceUpdateResponse } from './ai-response'
export type { AICatalogItem, AIPriceUpdate } from './ai-response'

export const PRICE_UPDATE_SYSTEM_PROMPT = `Ты помощник менеджера каталога. Твоя единственная задача - разделить прайс на позиции и извлечь явно указанные признаки. Ты не видишь каталог, не выбираешь товары, не придумываешь SKU и не изменяешь CMS.
Для каждой позиции верни исходный фрагмент sourceLine, пустой contextHeading, исходное обозначение модели modelText, целую цену за наличные price, storage, ram, color, sim, region, revision, manufacturerModelNumber и notes. Не придумывай отсутствующие признаки: используй null для неизвестных storage, ram, color, sim, revision и manufacturerModelNumber, пустую строку для contextHeading и region, пустой массив notes.
Разделяй несколько товаров в одной строке на отдельные items. Строки-заголовки разделов (iPhone, Mac, iPad, Watch, AirPods, PLAYSTATION, NINTENDO, META QUEST, XBOX, ASUS/LENOVO/MSI, STEAMDECK, «Приставки:», «Аксессуары:», «Наушники:» и любые аналогичные) не являются товарами и должны быть полностью проигнорированы. Не используй заголовки для исправления modelText и никогда не заполняй ими contextHeading. Если модель без заголовка неоднозначна, сохрани её как есть для ручной обработки.
Цена может содержать пробелы, точку как разделитель тысяч, знак рубля или флаг страны. Флаг сохрани в region. Количество (1шт, 2шт, 9шт и варианты в скобках) игнорируй и не умножай цену. Нормализуй 1Sim+eSim как SIM + eSIM, eSim как eSIM. Сохраняй 2 рев как revision и обозначения вроде SM-S948B как manufacturerModelNumber только для аудита.
Коды производителя (MHFF4, MDHE4, Z1KH1, SM-S948B и похожие) не являются обязательным признаком товара. Специальные пометки «Актив», «уценка», «мятая коробка», «по запросу», «с игрой», «без игры», «Nano Texture», «OB», «Original», «Копия 1к1» сохраняй в notes и не используй как обязательные признаки. «с игрой» и «без игры» могут оставить несколько кандидатов для выбора менеджером.
Не обрабатывай скидки, остатки, названия, описания и другие поля. Если цена по карте указана вместо цены за наличные или данных недостаточно для выделения позиции, добавь вопрос и не придумывай item.`
const PRICE_UPDATE_NONE_MODE_INSTRUCTION = ` Верхний уровень JSON обязательно является объектом, не массивом. Обязательны оба поля items и questions; при отсутствии данных верни пустые массивы. Верни только валидный JSON без Markdown, комментариев, пояснений до или после JSON. Пример: {"items":[{"sourceLine":"17 Max 256GB Blue eSim 104000","contextHeading":"","modelText":"17 Max","price":104000,"storage":"256GB","ram":null,"color":"Blue","sim":"eSIM","region":"","revision":null,"manufacturerModelNumber":null,"notes":[]}],"questions":[]}.`
const responseSchema = { type: 'object', additionalProperties: false, properties: { items: { type: 'array', maxItems: 1000, items: { type: 'object', additionalProperties: false, properties: { sourceLine: { type: 'string' }, contextHeading: { type: 'string' }, modelText: { type: 'string' }, price: { type: 'integer', minimum: 1, maximum: 10000000 }, storage: { type: ['string', 'null'] }, ram: { type: ['string', 'null'] }, color: { type: ['string', 'null'] }, sim: { type: ['string', 'null'] }, region: { type: 'string' }, revision: { type: ['string', 'null'] }, manufacturerModelNumber: { type: ['string', 'null'] }, notes: { type: 'array', items: { type: 'string' } } }, required: ['sourceLine', 'contextHeading', 'modelText', 'price', 'storage', 'ram', 'color', 'sim', 'region', 'revision', 'manufacturerModelNumber', 'notes'] } }, questions: { type: 'array', items: { type: 'string' } } }, required: ['items', 'questions'] } as const
type ResponseMode = 'json_schema' | 'json_object' | 'none'

type ProviderErrorLike = {
  status?: unknown
  code?: unknown
  type?: unknown
  message?: unknown
}

function providerErrorDetails(error: unknown, model: string, baseURL: string, mode: ResponseMode) {
  const providerError = error as ProviderErrorLike
  const status = typeof providerError.status === 'number' ? providerError.status : undefined
  const code = typeof providerError.code === 'string' ? providerError.code : undefined
  const type = typeof providerError.type === 'string' ? providerError.type : undefined
  // Do not include request input, credentials, or response bodies in logs or UI errors.
  const rawMessage = typeof providerError.message === 'string' ? providerError.message : 'Unknown provider error'
  const message = rawMessage
    .replace(/Bearer\s+\S+/giu, 'Bearer [redacted]')
    .replace(/(api[_ -]?key|authorization|cookie)\s*[:=]\s*\S+/giu, '$1=[redacted]')
    .slice(0, 300)

  return { status, code, type, message, model, baseURL, responseFormat: mode !== 'none' }
}

export class AIProviderRequestError extends Error {
  constructor(details: ReturnType<typeof providerErrorDetails>) {
    const status = details.status ? `HTTP ${details.status}` : 'network error'
    super(`VibeCode error (${status}, model ${details.model}): ${details.message}`)
    this.name = 'AIProviderRequestError'
  }
}
function getResponseMode(): ResponseMode { const value = process.env.OPENAI_RESPONSE_FORMAT || 'json_schema'; if (value === 'json_schema' || value === 'json_object' || value === 'none') return value; throw new Error('OPENAI_RESPONSE_FORMAT должен быть json_schema, json_object или none.') }
function stripMarkdownJson(value: string): string { const match = value.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i); return match ? match[1].trim() : value.trim() }
export function validateAIPriceUpdate(value: unknown) { return aiPriceUpdateSchema.parse(value) }
export async function parseManagerMessage(message: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан. Добавьте ключ на сервере.')
  if (message.length > 100_000) throw new Error('Сообщение слишком большое.')
  if (/(password|парол|токен|token|secret|секрет)/iu.test(message)) throw new Error('Сообщение содержит возможные секреты. Удалите пароли и токены.')
  const mode = getResponseMode()
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_PRICE_MODEL || 'gpt-5.5'
  const client = new OpenAI({ apiKey, baseURL })
  const systemPrompt = mode === 'none' ? `${PRICE_UPDATE_SYSTEM_PROMPT}${PRICE_UPDATE_NONE_MODE_INSTRUCTION}` : PRICE_UPDATE_SYSTEM_PROMPT
  const request: any = { model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }] }
  if (mode === 'json_schema') request.response_format = { type: 'json_schema', json_schema: { name: 'price_update', strict: true, schema: responseSchema } }
  if (mode === 'json_object') request.response_format = { type: 'json_object' }
  let completion: any
  try {
    completion = await client.chat.completions.create(request)
  } catch (error) {
    const details = providerErrorDetails(error, model, baseURL, mode)
    throw new AIProviderRequestError(details)
  }
  const choice = completion?.choices?.[0]
  if (choice?.message?.refusal) throw new Error('Модель отказалась обработать сообщение.')
  const content = choice?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new Error('Модель вернула пустой ответ.')
  let parsed: unknown
  try { parsed = JSON.parse(mode === 'none' ? stripMarkdownJson(content) : content) } catch { throw new Error('Модель вернула неверный JSON.') }
  try {
    return validateAIPriceUpdate(normalizeAIPriceUpdateResponse(parsed))
  } catch (error) {
    if (error instanceof z.ZodError) throw new Error('ИИ вернул данные в неверном формате. Попробуйте ещё раз.')
    throw error
  }
}
