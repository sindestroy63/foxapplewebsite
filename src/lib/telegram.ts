import https from 'https'

export type TelegramResult = {
  ok: boolean
  status: number
  body: string
}

/**
 * Определяет базовый URL для Telegram API.
 * Если задана TELEGRAM_API_BASE — использует её,
 * иначе использует https://api.telegram.org/bot
 */
function getTelegramBaseUrl(): string {
  const envBase = process.env.TELEGRAM_API_BASE
  if (envBase) {
    return envBase.replace(/\/+$/, '')
  }
  return 'https://api.telegram.org/bot'
}

/**
 * Отправляет сообщение в Telegram через Bot API.
 *
 * Если задана TELEGRAM_API_BASE — использует fetch() (работает с Docker proxy).
 * Если не задана — использует https.request() с принудительным IPv4 (для production api.telegram.org).
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<TelegramResult> {
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  })

  const baseUrl = getTelegramBaseUrl()
  const fullUrl = `${baseUrl}${botToken}/sendMessage`

  console.log(`[Telegram] Using API base: ${baseUrl}`)

  // Если задан TELEGRAM_API_BASE — используем fetch (Docker proxy / кастомный endpoint)
  if (process.env.TELEGRAM_API_BASE) {
    try {
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      const responseBody = await res.text()
      console.log(`[Telegram] Response status: ${res.status}`)
      console.log(`[Telegram] Response body: ${responseBody.slice(0, 200)}`)

      return {
        ok: res.ok,
        status: res.status,
        body: responseBody,
      }
    } catch (error) {
      console.error(`[Telegram] Fetch error: ${error}`)
      throw error
    }
  }

  // Без TELEGRAM_API_BASE — используем https.request() с принудительным IPv4
  return new Promise((resolve, reject) => {
    const url = new URL(fullUrl)

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      family: 4,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString()
        console.log(`[Telegram] Response status: ${res.statusCode}`)
        console.log(`[Telegram] Response body: ${responseBody.slice(0, 200)}`)
        resolve({
          ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode || 500,
          body: responseBody,
        })
      })
    })

    req.on('error', (error) => {
      console.error(`[Telegram] Request error: ${error.message}`)
      reject(error)
    })

    req.on('timeout', () => {
      console.error(`[Telegram] Request timeout after 15000ms`)
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.write(body)
    req.end()
  })
}