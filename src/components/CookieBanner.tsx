'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'foxapple-cookie-consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = window.localStorage.getItem(STORAGE_KEY)
    if (!accepted) {
      setVisible(true)
    }
  }, [])

  if (!visible) {
    return null
  }

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite">
      <div className="cookie-banner__content">
        <strong>Мы используем cookies</strong>
        <p>
          Мы используем cookies для корректной работы сайта и анализа посещаемости. Продолжая
          пользоваться сайтом, вы соглашаетесь с использованием cookies.
        </p>
      </div>
      <button
        className="button small"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, 'accepted')
          setVisible(false)
        }}
        type="button"
      >
        Понятно
      </button>
    </div>
  )
}
