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

const FREE_DELIVERY_THRESHOLD = 9900

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
  deliveryStreet: string
  deliveryHouse: string
  deliveryEntrance: string
  deliveryFloor: string
  deliveryApartment: string
  deliveryIntercom: string
  comment: string
}

const initialFormFields: FormFields = {
  name: '',
  phone: '',
  telegramUsername: '',
  deliveryStreet: '',
  deliveryHouse: '',
  deliveryEntrance: '',
  deliveryFloor: '',
  deliveryApartment: '',
  deliveryIntercom: '',
  comment: '',
}

export function CheckoutForm({ settings, total, onSuccess }: Props) {
  const { items } = useCart()
  const [state, formAction] = useActionState(submitCartOrder, initialCartOrderState)

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup')
  const [contactMethod, setContactMethod] = useState('')
  const [consent, setConsent] = useState(false)
  const [formData, setFormData] = useState<FormFields>(initialFormFields)
  const [utmParams, setUtmParams] = useState<UtmParams>({})

  // Собираем UTM-метки при монтировании
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

  const isFreeDelivery = total >= FREE_DELIVERY_THRESHOLD

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

        {/* Honeypot - скрытое поле для защиты от ботов */}
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        />

        {/* Name */}
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

        {/* Phone */}
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

        {/* Contact method */}
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

        {/* Telegram username (conditional) */}
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

        {/* Delivery method */}
        <label className="checkout-field">
          <span>Способ получения *</span>
          <select
            name="deliveryMethod"
            required
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value as 'pickup' | 'delivery')}
          >
            <option value="pickup">Самовывоз</option>
            <option value="delivery">Доставка</option>
          </select>
        </label>

        {/* Pickup address */}
        {deliveryMethod === 'pickup' && (
          <div className="checkout-pickup-address">
            <span className="checkout-field-label">Адрес магазина</span>
            <p className="checkout-address-text">{settings.address}</p>
            <p className="checkfield-hint">{settings.workTime}</p>
          </div>
        )}

        {/* Delivery address */}
        {deliveryMethod === 'delivery' && (
          <>
            <div className="checkout-field-row">
              <label className="checkout-field">
                <span>Улица *</span>
                <input
                  name="deliveryStreet"
                  value={formData.deliveryStreet}
                  onChange={(e) => updateField('deliveryStreet', e.target.value)}
                  placeholder="Московское шоссе"
                  required
                  type="text"
                  maxLength={100}
                />
                {state.errors?.deliveryStreet ? <small className="form-error">{state.errors.deliveryStreet}</small> : null}
              </label>
              <label className="checkout-field checkout-field-narrow">
                <span>Дом *</span>
                <input
                  name="deliveryHouse"
                  value={formData.deliveryHouse}
                  onChange={(e) => updateField('deliveryHouse', e.target.value)}
                  placeholder="55"
                  required
                  type="text"
                  maxLength={20}
                  inputMode="numeric"
                />
                {state.errors?.deliveryHouse ? <small className="form-error">{state.errors.deliveryHouse}</small> : null}
              </label>
            </div>

            <div className="checkout-delivery-details">
              <span className="checkout-field-label">Дополнительная информация для курьера</span>
              <div className="checkout-delivery-grid">
                <label className="checkout-field">
                  <span>Подъезд</span>
                  <input
                    name="deliveryEntrance"
                    value={formData.deliveryEntrance}
                    onChange={(e) => updateField('deliveryEntrance', e.target.value)}
                    placeholder="1"
                    type="text"
                    maxLength={5}
                    inputMode="numeric"
                  />
                </label>
                <label className="checkout-field">
                  <span>Этаж</span>
                  <input
                    name="deliveryFloor"
                    value={formData.deliveryFloor}
                    onChange={(e) => updateField('deliveryFloor', e.target.value)}
                    placeholder="5"
                    type="text"
                    maxLength={3}
                    inputMode="numeric"
                  />
                </label>
                <label className="checkout-field">
                  <span>Квартира</span>
                  <input
                    name="deliveryApartment"
                    value={formData.deliveryApartment}
                    onChange={(e) => updateField('deliveryApartment', e.target.value)}
                    placeholder="10"
                    type="text"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </label>
                <label className="checkout-field">
                  <span>Домофон</span>
                  <input
                    name="deliveryIntercom"
                    value={formData.deliveryIntercom}
                    onChange={(e) => updateField('deliveryIntercom', e.target.value)}
                    placeholder="код"
                    type="text"
                    maxLength={20}
                  />
                </label>
              </div>
              <p className="checkfield-hint">Заполняется при необходимости и поможет курьеру быстрее найти адрес.</p>
            </div>

            {!isFreeDelivery && (
              <p className="cart-delivery-note">
                Бесплатная доставка от 9&nbsp;900 ₽. Стоимость доставки уточнит менеджер.
              </p>
            )}
            {isFreeDelivery && (
              <p className="cart-delivery-free">Бесплатная доставка по Самаре</p>
            )}
          </>
        )}

        {/* Comment */}
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