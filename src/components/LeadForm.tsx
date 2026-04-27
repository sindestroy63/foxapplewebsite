'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'

import { submitLeadAction, type LeadActionState } from '@/actions/leads'

const initialLeadActionState: LeadActionState = { success: false }

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? 'Отправляем...' : 'Отправить заявку'}
    </button>
  )
}

type LeadFormProps = {
  description?: string
  productId?: number | string
  source: 'contact_form' | 'product_form' | 'repair_form'
  title: string
}

export function LeadForm({ description, productId, source, title }: LeadFormProps) {
  const [state, formAction] = useActionState(submitLeadAction, initialLeadActionState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <div className="lead-form-card">
      <div className="lead-form-head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>

      <form action={formAction} className="lead-form" ref={formRef}>
        <input name="source" type="hidden" value={source} />
        {productId ? <input name="productId" type="hidden" value={String(productId)} /> : null}

        <div className="lead-grid">
          <label>
            <span>Имя *</span>
            <input name="name" placeholder="Как к вам обращаться" required type="text" />
            {state.errors?.name ? <small className="form-error">{state.errors.name}</small> : null}
          </label>

          <label>
            <span>Телефон *</span>
            <input name="phone" placeholder="+7 (900) 000-00-00" required type="tel" />
            {state.errors?.phone ? <small className="form-error">{state.errors.phone}</small> : null}
          </label>

          <label>
            <span>Telegram</span>
            <input name="telegram" placeholder="@username (необязательно)" type="text" />
          </label>
        </div>

        <label className="lead-form-full">
          <span>Комментарий</span>
          <textarea name="comment" placeholder="Какая модель интересует, цвет, память, удобное время для связи" rows={4} />
        </label>

        <label className="consent-check">
          <input name="consent" required type="checkbox" />
          <span>
            Я соглашаюсь на{' '}
            <Link href="/personal-data-consent">обработку персональных данных</Link> и принимаю
            условия <Link href="/privacy">Политики конфиденциальности</Link>.
          </span>
        </label>
        {state.errors?.consent ? <p className="form-error">{state.errors.consent}</p> : null}

        <div className="lead-form-actions">
          <SubmitButton />
          {state.message ? (
            <p className={state.success ? 'form-success' : 'form-error'}>{state.message}</p>
          ) : null}
        </div>
      </form>
    </div>
  )
}
