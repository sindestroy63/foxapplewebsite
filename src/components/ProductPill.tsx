'use client'

import { useEffect, useId, useState } from 'react'

const PRODUCT_PILL_TOGGLE_EVENT = 'product-pill-toggle'

type ProductPillToggleEvent = CustomEvent<{ id: string | null }>

type ProductPillProps = {
  label: string
  tooltip: string
  tone?: 'accent' | 'light' | 'warranty'
}

export function ProductPill({ label, tooltip, tone = 'light' }: ProductPillProps) {
  const tooltipId = useId()
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    function handleToggle(event: Event) {
      const { id } = (event as ProductPillToggleEvent).detail
      setIsExpanded(id === tooltipId)
    }

    window.addEventListener(PRODUCT_PILL_TOGGLE_EVENT, handleToggle)
    return () => window.removeEventListener(PRODUCT_PILL_TOGGLE_EVENT, handleToggle)
  }, [tooltipId])

  function setActive(id: string | null) {
    window.dispatchEvent(
      new CustomEvent(PRODUCT_PILL_TOGGLE_EVENT, {
        detail: { id },
      }),
    )
  }

  return (
    <button
      className={`product-pill product-pill--${tone}${isExpanded ? ' product-pill--expanded' : ''}`}
      type="button"
      aria-label={`${label}: ${tooltip}`}
      aria-describedby={tooltipId}
      aria-expanded={isExpanded}
      onBlur={() => {
        if (isExpanded) setActive(null)
      }}
      onClick={() => setActive(isExpanded ? null : tooltipId)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setActive(null)
          event.currentTarget.blur()
        }
      }}
    >
      <span className="product-pill__label">{label}</span>
      <span className="product-pill__tooltip" id={tooltipId} role="tooltip">
        {tooltip}
      </span>
    </button>
  )
}
