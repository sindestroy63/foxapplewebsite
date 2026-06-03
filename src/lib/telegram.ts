import http from 'http'
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
 * Отправляет сообщение в Telegram через Bot API с принудительным IPv4.
 * Поддерживает TELEGRAM_API_BASE для проксирования (http/https).
 * Использует встроенный http(s).request() вместо глобального fetch()
 * для решения проблем с IPv6 в Docker-контейнерах.
 */
export function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<TelegramResult> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    })

    const baseUrl = getTelegramBaseUrl()
    const fullUrl = `${baseUrl}${botToken}/sendMessage`
    const url = new URL(fullUrl)

    // Выбираем модуль в зависимости от протокола
    const isHttps = url.protocol === 'https:'
    const requestModule = isHttps ? https : http
    const defaultPort = isHttps ? 443 : 80

    console.log(`[Telegram] Using API base: ${baseUrl} (без токена)`)
    console.log(`[Telegram] Request protocol: ${url.protocol}, host: ${url.hostname}, port: ${url.port || defaultPort}`)
    console.log(`[Telegram] Request path: ${url.pathname}${url.search}`)
    console.log(`[Telegram] Body length: ${Buffer.byteLength(body)} bytes`)

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port, 10) : defaultPort,
      path: url.pathname + url.search,
      method: 'POST',
      family: 4,
      timeout: 15000, // 15 секунд таймаут
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = requestModule.request(options, (res) => {
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