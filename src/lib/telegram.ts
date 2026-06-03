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
    // Возвращаем как есть, убирая только конечный слеш
    // Пример: http://host.docker.internal:8089/bot → http://host.docker.internal:8089/bot
    // Итоговый URL: ${baseUrl}${botToken}/sendMessage
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

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port ? parseInt(url.port, 10) : (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      family: 4, // принудительный IPv4
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
        resolve({
          ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode || 500,
          body: responseBody,
        })
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(body)
    req.end()
  })
}