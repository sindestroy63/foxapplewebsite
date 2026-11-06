'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { submitCartOrder, type CartOrderState } from '@/actions/submitCartOrder'
import { useCart } from '@/contexts/CartContext'
import { ConsentCheckbox } from '@/components/ConsentCheckbox'
import type { SiteSettings } from '@/lib/types'
import { formatPhoneMask } from '@/lib/phone-mask'
import { getUtmParams, utmToString, type UtmParams } from '@/lib/utm'

const initialCartOrderState: CartOrderState = { success: false }

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? (
        <>
          <span className="spinner" />
          Отправляем заявку...
        </>
      ) : (
        'Оформить заявку'
      )}
    </button>
  )
}

type Props = {
  settings: SiteSettings
  total: number
  onSuccess: () => void
}

type FormFields = {
  name: string
  phone: string
  telegramUsername: string
  comment: string
}

const initialFormFields: FormFields = {
  name: '',
  phone: '',
  telegramUsername: '',
  comment: '',
}

export function CheckoutForm({ settings, total, onSuccess }: Props) {
  const { items } = useCart()
  const [state, formAction] = useActionState(submitCartOrder, initialCartOrderState)

  const [contactMethod, setContactMethod] = useState('')
  const [consent, setConsent] = useState(false)
  const [formData, setFormData] = useState<FormFields>(initialFormFields)
  const [utmParams, setUtmParams] = useState<UtmParams>({})

  useEffect(() => {
    setUtmParams(getUtmParams())
  }, [])

  const updateField = (field: keyof FormFields, value: string) => {
    if (field === 'phone') {
      setFormData((prev) => ({ ...prev, [field]: formatPhoneMask(value) }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  useEffect(() => {
    if (state.success) {
      onSuccess()
    }
  }, [state.success, onSuccess])

  const cartItemsJson = JSON.stringify(
    items.map((item) => {
      const variantParts: string[] = []
      if (item.variant?.color) variantParts.push(item.variant.color.russianLabel || item.variant.color.englishLabel)
      if (item.variant?.memory) variantParts.push(item.variant.memory)
      if (item.variant?.simType) variantParts.push(item.variant.simType === 'SIM_ESIM' ? 'SIM + eSIM' : item.variant.simType === 'ESIM' ? 'eSIM' : item.variant.simType)
      if (item.variant?.size) variantParts.push(item.variant.size)
      return {
        name: item.productName,
        variant: variantParts.length > 0 ? variantParts.join(', ') : undefined,
        quantity: item.quantity,
        price: item.price,
      }
    }),
  )

  return (
    <div className="checkout-form-card">
      <div className="checkout-form-head">
        <h2>Оформление заявки</h2>
        <p>Заполните форму, и мы свяжемся с вами для подтверждения заказа.</p>
      </div>

      <form action={formAction} className="checkout-form">
        <input type="hidden" name="items" value={cartItemsJson} />
        <input type="hidden" name="total" value={String(total)} />
        <input type="hidden" name="shopAddress" value={settings.address || ''} />
        <input type="hidden" name="utm" value={utmToString(utmParams)} />

        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        />

        <label className="checkout-field">
          <span>ФИО *</span>
          <input
            name="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Иванов Иван Иванович"
            required
            type="text"
            maxLength={80}
            minLength={2}
          />
          {state.errors?.name ? <small className="form-error">{state.errors.name}</small> : null}
        </label>

        <label className="checkout-field">
          <span>Телефон *</span>
          <input
            name="phone"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+7 (900) 000-00-00"
            required
            type="tel"
            inputMode="tel"
            maxLength={18}
          />
          {state.errors?.phone ? <small className="form-error">{state.errors.phone}</small> : null}
        </label>

        <label className="checkout-field">
          <span>Способ связи *</span>
          <select
            name="contactMethod"
            required
            value={contactMethod}
            onChange={(e) => setContactMethod(e.target.value)}
          >
            <option value="">Выберите способ связи</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Telegram">Telegram</option>
            <option value="MAX">MAX</option>
            <option value="Позвонить по телефону">Позвонить по телефону</option>
          </select>
          {state.errors?.contactMethod ? <small className="form-error">{state.errors.contactMethod}</small> : null}
        </label>

        {contactMethod === 'Telegram' && (
          <label className="checkout-field">
            <span>Telegram username *</span>
            <input
              name="telegramUsername"
              value={formData.telegramUsername}
              onChange={(e) => updateField('telegramUsername', e.target.value)}
              placeholder="@username"
              type="text"
              maxLength={32}
            />
            {state.errors?.telegramUsername ? <small className="form-error">{state.errors.telegramUsername}</small> : null}
          </label>
        )}

        <div className="checkout-pickup-address">
          <span className="checkout-field-label">Адрес магазина</span>
          <p className="checkout-address-text">{settings.address}</p>
          <p className="checkfield-hint">{settings.workTime}</p>
        </div>

        <label className="checkout-field checkout-field-full">
          <span>Комментарий</span>
          <textarea
            name="comment"
            value={formData.comment}
            onChange={(e) => updateField('comment', e.target.value)}
            placeholder="Удобное время, дополнительные вопросы"
            rows={3}
            maxLength={500}
          />
        </label>

        <ConsentCheckbox
          error={state.errors?.consent}
          checked={consent}
          onChange={(checked) => setConsent(checked)}
        />
        <input type="hidden" name="consent" value={consent ? 'on' : ''} />

        <div className="checkout-summary">
          <div className="checkout-summary-row">
            <span>Итоговая сумма</span>
            <strong>
              {total.toLocaleString('ru-RU')} ₽
            </strong>
          </div>
        </div>

        <div className="checkout-actions">
          <SubmitButton />
          {state.message ? (
            <p className="form-error">{state.message}</p>
          ) : null}
        </div>
      </form>
    </div>
  )
}