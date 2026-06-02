'use client'

import Link from 'next/link'

type Props = {
  error?: string
  name?: string
  required?: boolean
  checked?: boolean
  onChange?: (checked: boolean) => void
}

export function ConsentCheckbox({ error, name = 'consent', required = true, checked, onChange }: Props) {
  const isControlled = checked !== undefined

  return (
    <label className="consent-check">
      <input
        name={name}
        required={required}
        type="checkbox"
        checked={isControlled ? checked : undefined}
        onChange={isControlled && onChange ? (e) => onChange(e.target.checked) : undefined}
        defaultChecked={isControlled ? undefined : false}
      />
      <span>
        Я соглашаюсь на{' '}
        <Link href="/personal-data-consent">обработку персональных данных</Link> и принимаю
        условия <Link href="/privacy">Политики конфиденциальности</Link>.
      </span>
      {error ? <p className="form-error">{error}</p> : null}
    </label>
  )
}