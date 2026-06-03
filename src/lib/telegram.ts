import https from 'https'

export type TelegramResult = {
  ok: boolean
  status: number
  body: string
}

/**
 * Отправляет сообщение в Telegram через Bot API с принудительным IPv4.
 * Использует встроенный https.request() вместо глобального fetch()
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

    const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`)

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      family: 4, // принудительный IPv4
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