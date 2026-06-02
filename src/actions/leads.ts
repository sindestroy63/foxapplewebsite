'use server'

export type LeadActionState = {
  errors?: {
    consent?: string
    name?: string
    phone?: string
    telegram?: string
    comment?: string
  }
  message?: string
  success: boolean
}

const TG_API = 'https://api.telegram.org/bot'

const SOURCE_EMOJI: Record<string, string> = {
  contact_form: '\uD83D\uDCDE',
  installment_form: '\uD83D\uDCB3',
  product_form: '\uD83D\uDCF1',
  repair_form: '\uD83D\uDD27',
  trade_in_form: '\uD83D\uDD04',
}

const SOURCE_LABEL: Record<string, string> = {
  contact_form: 'Обратный звонок',
  installment_form: 'Рассрочка',
  product_form: 'Заявка по товару',
  repair_form: 'Заявка на ремонт',
  trade_in_form: 'Trade-In',
}

function one(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&' + 'amp;',
    '<': '&' + 'lt;',
    '>': '&' + 'gt;',
    '"': '&' + 'quot;',
  }
  return text.replace(/[&<>"]/g, (ch) => map[ch])
}

function countDigits(s: string): number {
  return s.replace(/\D/g, '').length
}

type UtmParams = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

function parseUtm(utmString: string): UtmParams {
  try {
    return JSON.parse(utmString) as UtmParams
  } catch {
    return {}
  }
}

function formatUtmForTelegram(utm: UtmParams): string {
  const lines: string[] = []
  if (utm.utm_source) lines.push(`   Source: ${utm.utm_source}`)
  if (utm.utm_medium) lines.push(`   Medium: ${utm.utm_medium}`)
  if (utm.utm_campaign) lines.push(`   Campaign: ${utm.utm_campaign}`)
  if (utm.utm_term) lines.push(`   Term: ${utm.utm_term}`)
  if (utm.utm_content) lines.push(`   Content: ${utm.utm_content}`)
  return lines.join('\n')
}

function formatTelegramMessage(data: {
  categoryName?: string
  categorySlug?: string
  comment?: string
  name: string
  pageUrl?: string
  phone: string
  productId?: string
  productName?: string
  productSlug?: string
  source: string
  telegram?: string
  utm: UtmParams
}): string {
  const emoji = SOURCE_EMOJI[data.source] || '\uD83D\uDCE6'
  const label = SOURCE_LABEL[data.source] || 'Новая заявка'

  const lines: string[] = []
  lines.push(`${emoji} <b>${label}</b>`)
  lines.push('')
  lines.push(`\uD83D\uDC64 <b>Имя:</b> ${escapeHtml(data.name)}`)
  lines.push(`\uD83D\uDCDE <b>Телефон:</b> ${escapeHtml(data.phone)}`)

  if (data.telegram) {
    lines.push(`\uD83D\uDCAC <b>Telegram:</b> ${escapeHtml(data.telegram)}`)
  }

  // Product info
  if (data.productName) {
    lines.push('')
    lines.push(`\uD83D\uDCE6 <b>Товар:</b> ${escapeHtml(data.productName)}`)
    if (data.productId) {
      lines.push(`   ID: ${escapeHtml(data.productId)}`)
    }
    if (data.productSlug) {
      lines.push(`   Slug: ${escapeHtml(data.productSlug)}`)
    }
  } else if (data.productId) {
    lines.push('')
    lines.push(`\uD83D\uDCE6 <b>Товар ID:</b> ${escapeHtml(data.productId)}`)
  }

  // Category info
  if (data.categoryName || data.categorySlug) {
    const catParts: string[] = []
    if (data.categoryName) catParts.push(escapeHtml(data.categoryName))
    if (data.categorySlug) catParts.push(`(${escapeHtml(data.categorySlug)})`)
    lines.push(`\uD83D\uDCC1 <b>Категория:</b> ${catParts.join(' ')}`)
  }

  // Page URL
  if (data.pageUrl) {
    const fullUrl = data.pageUrl.startsWith('http') ? data.pageUrl : `https://foxapple.ru${data.pageUrl}`
    lines.push(`\uD83D\uDD17 <b>Страница:</b> <a href="${escapeHtml(fullUrl)}">${escapeHtml(fullUrl)}</a>`)
  }

  // UTM parameters
  const utmLines = formatUtmForTelegram(data.utm)
  if (utmLines) {
    lines.push('')
    lines.push(`\uD83D\uDCCA <b>UTM-метки:</b>`)
    lines.push(utmLines)
  }

  if (data.comment) {
    lines.push('')
    lines.push(`\uD83D\uDCDD <b>Комментарий:</b> ${escapeHtml(data.comment)}`)
  }

  return lines.join('\n')
}

export async function submitLeadAction(
  _prevState: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const timestamp = new Date().toISOString()

  // Honeypot check
  const website = one(formData.get('website'))
  if (website) {
    console.log(`[LeadForm] [${timestamp}] Honeypot triggered - bot detected`)
    return {
      message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.',
      success: true,
    }
  }

  const name = one(formData.get('name'))
  const phone = one(formData.get('phone'))
  const telegram = one(formData.get('telegram'))
  const comment = one(formData.get('comment'))
  const source = one(formData.get('source')) || 'contact_form'
  const productId = one(formData.get('productId'))
  const productName = one(formData.get('productName'))
  const productSlug = one(formData.get('productSlug'))
  const categoryName = one(formData.get('categoryName'))
  const categorySlug = one(formData.get('categorySlug'))
  const pageUrl = one(formData.get('pageUrl'))
  const utmString = one(formData.get('utm'))
  const utm = parseUtm(utmString)
  const consent = formData.get('consent') === 'on'

  console.log(`[LeadForm] [${timestamp}] Processing ${source} from ${pageUrl}`)

  // Validation
  if (!name) {
    return { errors: { name: 'Укажите ваше имя.' }, success: false }
  }
  if (name.length < 2) {
    return { errors: { name: 'Имя: минимум 2 символа.' }, success: false }
  }
  if (name.length > 80) {
    return { errors: { name: 'Имя: не более 80 символов.' }, success: false }
  }

  if (!phone) {
    return { errors: { phone: 'Укажите номер телефона.' }, success: false }
  }
  const digitCount = countDigits(phone)
  if (digitCount < 10 || digitCount > 11) {
    return { errors: { phone: 'Телефон должен содержать 10–11 цифр.' }, success: false }
  }

  if (telegram.length > 32) {
    return { errors: { telegram: 'Telegram: не более 32 символов.' }, success: false }
  }

  if (comment.length > 500) {
    return { errors: { comment: 'Комментарий: не более 500 символов.' }, success: false }
  }

  if (!consent) {
    return { errors: { consent: 'Нужно подтвердить согласие на обработку персональных данных.' }, success: false }
  }

  // Send to Telegram ONLY (no CMS saving)
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.error(`[LeadForm] [${timestamp}] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set`)
    return {
      message: 'Не удалось отправить заявку. Попробуйте позже или свяжитесь с нами по телефону.',
      success: false,
    }
  }

  const messageText = formatTelegramMessage({
    categoryName,
    categorySlug,
    comment,
    name,
    pageUrl,
    phone,
    productId,
    productName,
    productSlug,
    source,
    telegram,
    utm,
  })

  try {
    const res = await fetch(`${TG_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
      }),
    })

    if (res.ok) {
      console.log(`[Telegram] [${timestamp}] LeadForm message sent successfully`)
      return {
        message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.',
        success: true,
      }
    } else {
      const errBody = await res.text()
      console.error(`[Telegram] [${timestamp}] API error:`, res.status, errBody)
      return {
        message: 'Не удалось отправить заявку. Попробуйте позже или свяжитесь с нами по телефону.',
        success: false,
      }
    }
  } catch (error) {
    console.error(`[Telegram] [${timestamp}] Failed to send message:`, error)
    return {
      message: 'Не удалось отправить заявку. Попробуйте позже или свяжитесь с нами по телефону.',
      success: false,
    }
  }
}