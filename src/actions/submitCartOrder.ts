'use server'

export type CartOrderState = {
  errors?: {
    name?: string
    phone?: string
    consent?: string
    contactMethod?: string
    telegramUsername?: string
    deliveryStreet?: string
    deliveryHouse?: string
    deliveryEntrance?: string
    deliveryFloor?: string
    deliveryApartment?: string
    deliveryIntercom?: string
    comment?: string
  }
  message?: string
  success: boolean
}

type CartItemData = {
  name: string
  variant?: string
  quantity: number
  price: number
}

type UtmParams = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

const TG_API = 'https://api.telegram.org/bot'

function one(value: FormDataEntryValue | null): string {
  if (typeof value === 'string') return value.trim()
  return ''
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

function parseUtm(utmString: string): UtmParams {
  try {
    return JSON.parse(utmString) as UtmParams
  } catch {
    return {}
  }
}

function formatUtmForTelegram(utm: UtmParams): string {
  const lines: string[] = []
  if (utm.utm_source) lines.push(`   Source: ${escapeHtml(utm.utm_source)}`)
  if (utm.utm_medium) lines.push(`   Medium: ${escapeHtml(utm.utm_medium)}`)
  if (utm.utm_campaign) lines.push(`   Campaign: ${escapeHtml(utm.utm_campaign)}`)
  if (utm.utm_term) lines.push(`   Term: ${escapeHtml(utm.utm_term)}`)
  if (utm.utm_content) lines.push(`   Content: ${escapeHtml(utm.utm_content)}`)
  return lines.join('\n')
}

function formatTelegramMessage(data: {
  name: string
  phone: string
  contactMethod: string
  telegramUsername?: string
  deliveryMethod: string
  deliveryStreet?: string
  deliveryHouse?: string
  deliveryEntrance?: string
  deliveryFloor?: string
  deliveryApartment?: string
  deliveryIntercom?: string
  comment?: string
  items: CartItemData[]
  total: number
  shopAddress?: string
  utm: UtmParams
}): string {
  const lines: string[] = []
  lines.push('\uD83D\uDCE6 <b>НОВЫЙ ЗАКАЗ ИЗ КОРЗИНЫ</b>')
  lines.push('')
  lines.push('\uD83D\uDC64 <b>ФИО:</b> ' + escapeHtml(data.name))
  lines.push('\uD83D\uDCDE <b>Телефон:</b> ' + escapeHtml(data.phone))
  lines.push('\uD83D\uDCAC <b>Способ связи:</b> ' + escapeHtml(data.contactMethod))
  if (data.contactMethod === 'Telegram' && data.telegramUsername) {
    lines.push('   ' + escapeHtml(data.telegramUsername))
  }
  lines.push('')
  lines.push('\uD83D\uDCCD <b>Получение:</b> ' + escapeHtml(data.deliveryMethod))
  if (data.deliveryMethod === 'Самовывоз' && data.shopAddress) {
    lines.push('   Адрес магазина: ' + escapeHtml(data.shopAddress))
  }
  if (data.deliveryMethod === 'Доставка') {
    if (data.deliveryStreet && data.deliveryHouse) {
      lines.push('   Адрес: ул. ' + escapeHtml(data.deliveryStreet) + ', дом ' + escapeHtml(data.deliveryHouse))
    }
    const extra: string[] = []
    if (data.deliveryEntrance) extra.push('подъезд ' + escapeHtml(data.deliveryEntrance))
    if (data.deliveryFloor) extra.push('этаж ' + escapeHtml(data.deliveryFloor))
    if (data.deliveryApartment) extra.push('квартира ' + escapeHtml(data.deliveryApartment))
    if (data.deliveryIntercom) extra.push('домофон ' + escapeHtml(data.deliveryIntercom))
    if (extra.length > 0) {
      lines.push('   ' + extra.join(', '))
    }
  }
  lines.push('')
  lines.push('\uD83D\uDED2 <b>Товары:</b>')
  for (const item of data.items) {
    const variantStr = item.variant ? ' (' + escapeHtml(item.variant) + ')' : ''
    lines.push('   ' + escapeHtml(item.name) + variantStr)
    lines.push('   \u00D7 ' + item.quantity + ' = ' + escapeHtml(formatPrice(item.price * item.quantity)))
  }
  lines.push('')
  lines.push('\uD83D\uDCB0 <b>Итого: ' + escapeHtml(formatPrice(data.total)) + '</b>')

  const utmLines = formatUtmForTelegram(data.utm)
  if (utmLines) {
    lines.push('')
    lines.push('\uD83D\uDCCA <b>UTM-метки:</b>')
    lines.push(utmLines)
  }

  if (data.comment) {
    lines.push('')
    lines.push('\uD83D\uDCDD <b>Комментарий:</b> ' + escapeHtml(data.comment))
  }

  lines.push('')
  lines.push('\u2139\uFE0F <i>Цена актуальна на момент оформления заявки.</i>')
  lines.push('<i>Наличие и итоговую стоимость подтверждает менеджер.</i>')

  return lines.join('\n')
}

function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ₽`
}

function countDigits(s: string): number {
  return s.replace(/\D/g, '').length
}

export async function submitCartOrder(
  _prevState: CartOrderState,
  formData: FormData,
): Promise<CartOrderState> {
  const timestamp = new Date().toISOString()

  // Honeypot check
  const website = one(formData.get('website'))
  if (website) {
    console.log(`[CheckoutForm] [${timestamp}] Honeypot triggered - bot detected`)
    return {
      message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.',
      success: true,
    }
  }

  const name = one(formData.get('name'))
  const phone = one(formData.get('phone'))
  const contactMethod = one(formData.get('contactMethod'))
  const telegramUsername = one(formData.get('telegramUsername'))
  const deliveryMethod = one(formData.get('deliveryMethod'))
  const deliveryStreet = one(formData.get('deliveryStreet'))
  const deliveryHouse = one(formData.get('deliveryHouse'))
  const deliveryEntrance = one(formData.get('deliveryEntrance'))
  const deliveryFloor = one(formData.get('deliveryFloor'))
  const deliveryApartment = one(formData.get('deliveryApartment'))
  const deliveryIntercom = one(formData.get('deliveryIntercom'))
  const comment = one(formData.get('comment'))
  const consent = formData.get('consent') === 'on'
  const itemsRaw = formData.get('items')
  const totalRaw = formData.get('total')
  const shopAddress = one(formData.get('shopAddress'))
  const utmString = one(formData.get('utm'))
  const utm = parseUtm(utmString)

  const deliveryLabel = deliveryMethod === 'delivery' ? 'Доставка' : 'Самовывоз'

  console.log(`[CheckoutForm] [${timestamp}] Processing cart order`)

  // Validation
  if (!name) {
    return { errors: { name: 'Укажите ваше имя.' }, success: false }
  }
  if (name.length < 2) {
    return { errors: { name: 'ФИО: минимум 2 символа.' }, success: false }
  }
  if (name.length > 80) {
    return { errors: { name: 'ФИО: не более 80 символов.' }, success: false }
  }

  if (!phone) {
    return { errors: { phone: 'Укажите номер телефона.' }, success: false }
  }
  const digitCount = countDigits(phone)
  if (digitCount < 10 || digitCount > 11) {
    return { errors: { phone: 'Телефон должен содержать 10–11 цифр.' }, success: false }
  }

  if (!contactMethod) {
    return { errors: { contactMethod: 'Выберите способ связи.' }, success: false }
  }

  if (contactMethod === 'Telegram') {
    const cleaned = telegramUsername.replace(/^@/, '')
    if (!cleaned) {
      return { errors: { telegramUsername: 'Укажите Telegram username.' }, success: false }
    }
    if (cleaned.length > 32) {
      return { errors: { telegramUsername: 'Telegram username: не более 32 символов.' }, success: false }
    }
  }

  if (deliveryMethod === 'delivery') {
    if (!deliveryStreet) {
      return { errors: { deliveryStreet: 'Укажите улицу.' }, success: false }
    }
    if (deliveryStreet.length > 100) {
      return { errors: { deliveryStreet: 'Улица: не более 100 символов.' }, success: false }
    }
    if (!deliveryHouse) {
      return { errors: { deliveryHouse: 'Укажите номер дома.' }, success: false }
    }
    if (deliveryHouse.length > 20) {
      return { errors: { deliveryHouse: 'Дом: не более 20 символов.' }, success: false }
    }
    if (deliveryEntrance.length > 5) {
      return { errors: { deliveryEntrance: 'Подъезд: не более 5 символов.' }, success: false }
    }
    if (deliveryFloor.length > 3) {
      return { errors: { deliveryFloor: 'Этаж: не более 3 символов.' }, success: false }
    }
    if (deliveryApartment.length > 10) {
      return { errors: { deliveryApartment: 'Квартира: не более 10 символов.' }, success: false }
    }
    if (deliveryIntercom.length > 20) {
      return { errors: { deliveryIntercom: 'Домофон: не более 20 символов.' }, success: false }
    }
  }

  if (comment.length > 500) {
    return { errors: { comment: 'Комментарий: не более 500 символов.' }, success: false }
  }

  if (!consent) {
    return { errors: { consent: 'Нужно подтвердить согласие на обработку персональных данных.' }, success: false }
  }

  let items: CartItemData[] = []
  try {
    items = itemsRaw ? JSON.parse(String(itemsRaw)) : []
  } catch {
    return { message: 'Ошибка данных корзины.', success: false }
  }

  if (items.length === 0) {
    return { message: 'Корзина пуста. Добавьте товары.', success: false }
  }

  const total = Number(String(totalRaw)) || items.reduce((s, i) => s + i.price * i.quantity, 0)

  // Send to Telegram ONLY (no CMS saving)
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.error(`[CheckoutForm] [${timestamp}] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set`)
    return {
      message: 'Не удалось отправить заявку. Попробуйте позже или свяжитесь с нами по телефону.',
      success: false,
    }
  }

  const messageText = formatTelegramMessage({
    name,
    phone,
    contactMethod,
    telegramUsername,
    deliveryMethod: deliveryLabel,
    deliveryStreet,
    deliveryHouse,
    deliveryEntrance,
    deliveryFloor,
    deliveryApartment,
    deliveryIntercom,
    comment,
    items,
    total,
    shopAddress,
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
      console.log(`[Telegram] [${timestamp}] Cart order message sent successfully`)
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