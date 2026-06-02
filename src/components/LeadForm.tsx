'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import { submitLeadAction, type LeadActionState } from '@/actions/leads'
import { ConsentCheckbox } from '@/components/ConsentCheckbox'
import { formatPhoneMask } from '@/lib/phone-mask'
import { getUtmParams, utmToString, type UtmParams } from '@/lib/utm'

const initialLeadActionState: LeadActionState = { success: false }

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
        'Отправить заявку'
      )}
    </button>
  )
}

type LeadFormProps = {
  categoryName?: string
  categorySlug?: string
  description?: string
  productId?: number | string
  productName?: string
  productSlug?: string
  source: 'contact_form' | 'installment_form' | 'product_form' | 'repair_form' | 'trade_in_form'
  title: string
}

export function LeadForm({
  categoryName,
  categorySlug,
  description,
  productId,
  productName,
  productSlug,
  source,
  title,
}: LeadFormProps) {
  const pathname = usePathname()
  const [state, formAction] = useActionState(submitLeadAction, initialLeadActionState)
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  const [phoneValue, setPhoneValue] = useState('')
  const [utmParams, setUtmParams] = useState<UtmParams>({})

  // Собираем UTM-метки при монтировании
  useEffect(() => {
    setUtmParams(getUtmParams())
  }, [])

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setPhoneValue('')
      setTimeout(() => {
        successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [state.success])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneMask(e.target.value)
    setPhoneValue(formatted)
  }

  return (
    <div className="lead-form-card">
      {state.success ? (
        <div className="form-success-block" ref={successRef}>
          <div className="form-success-icon">✓</div>
          <h3>Заявка успешно отправлена</h3>
          <p className="form-success-text">
            Спасибо за обращение. Мы уже получили вашу заявку и свяжемся с вами в ближайшее время
            для уточнения наличия, цены и комплектации.
          </p>
          <div className="form-success-actions">
            <Link className="button" href="/catalog">
              Вернуться в каталог
            </Link>
            <Link className="button secondary" href="/">
              На главную
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="lead-form-head">
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>

          <form action={formAction} className="lead-form" ref={formRef}>
            <input name="source" type="hidden" value={source} />
            <input name="pageUrl" type="hidden" value={pathname} />
            <input name="utm" type="hidden" value={utmToString(utmParams)} />
            {productId ? <input name="productId" type="hidden" value={String(productId)} /> : null}
            {productName ? <input name="productName" type="hidden" value={productName} /> : null}
            {productSlug ? <input name="productSlug" type="hidden" value={productSlug} /> : null}
            {categoryName ? <input name="categoryName" type="hidden" value={categoryName} /> : null}
            {categorySlug ? <input name="categorySlug" type="hidden" value={categorySlug} /> : null}

            {/* Honeypot - скрытое поле для защиты от ботов */}
            <input
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
              aria-hidden="true"
            />

            <div className="lead-grid">
              <label>
                <span>Имя *</span>
                <input name="name" placeholder="Как к вам обращаться" required type="text" maxLength={80} />
                {state.errors?.name ? <small className="form-error">{state.errors.name}</small> : null}
              </label>

              <label>
                <span>Телефон *</span>
                <input
                  name="phone"
                  value={phoneValue}
                  onChange={handlePhoneChange}
                  placeholder="+7 (900) 000-00-00"
                  required
                  type="tel"
                  inputMode="tel"
                  maxLength={18}
                />
                {state.errors?.phone ? <small className="form-error">{state.errors.phone}</small> : null}
              </label>

              <label>
                <span>Telegram</span>
                <input name="telegram" placeholder="@username (необязательно)" type="text" maxLength={32} />
              </label>
            </div>

            <label className="lead-form-full">
              <span>Комментарий</span>
              <textarea name="comment" placeholder="Какая модель интересует, цвет, память, удобное время для связи" rows={4} maxLength={500} />
            </label>

            <ConsentCheckbox error={state.errors?.consent} />

            <div className="lead-form-actions">
              <SubmitButton />
            </div>
          </form>
        </>
      )}
    </div>
  )
}