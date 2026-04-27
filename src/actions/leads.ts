'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

export type LeadActionState = {
  errors?: {
    consent?: string
    name?: string
    phone?: string
  }
  message?: string
  success: boolean
}

function one(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseProductId(value: string): number | undefined {
  if (!value) {
    return undefined
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

export async function submitLeadAction(
  _prevState: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const name = one(formData.get('name'))
  const phone = one(formData.get('phone'))
  const telegram = one(formData.get('telegram'))
  const comment = one(formData.get('comment'))
  const source = one(formData.get('source')) || 'contact_form'
  const productId = parseProductId(one(formData.get('productId')))
  const consent = formData.get('consent') === 'on'

  if (!name) {
    return {
      errors: {
        name: 'Укажите ваше имя.',
      },
      success: false,
    }
  }

  if (!phone) {
    return {
      errors: {
        phone: 'Укажите номер телефона.',
      },
      success: false,
    }
  }

  if (!consent) {
    return {
      errors: {
        consent: 'Нужно подтвердить согласие на обработку персональных данных.',
      },
      success: false,
    }
  }

  try {
    const payload = await getPayload({ config })

    await payload.create({
      collection: 'leads',
      data: {
        comment: comment || undefined,
        consent: true,
        consentAt: new Date().toISOString(),
        name: name || undefined,
        phone,
        product: productId,
        source: source as any,
        status: 'new',
        telegram: telegram || undefined,
      },
      overrideAccess: true,
    })

    return {
      message: 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.',
      success: true,
    }
  } catch (error) {
    console.error('Failed to create lead', error)

    return {
      message: 'Не удалось отправить заявку. Попробуйте еще раз или напишите в Telegram.',
      success: false,
    }
  }
}
