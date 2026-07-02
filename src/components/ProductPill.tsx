'use client'

import { type CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

const PRODUCT_PILL_TOGGLE_EVENT = 'product-pill-toggle'

type ProductPillToggleEvent = CustomEvent<{ id: string | null }>

type ProductPillProps = {
  label: string
  tooltip: string
  tone?: 'accent' | 'light' | 'warranty'
}

export function ProductPill({ label, tooltip, tone = 'light' }: ProductPillProps) {
  const tooltipId = useId()
  const pillRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [tooltipShift, setTooltipShift] = useState(0)

  useEffect(() => {
    function handleToggle(event: Event) {
      const { id } = (event as ProductPillToggleEvent).detail
      setIsExpanded(id === tooltipId)
    }

    window.addEventListener(PRODUCT_PILL_TOGGLE_EVENT, handleToggle)
    return () => window.removeEventListener(PRODUCT_PILL_TOGGLE_EVENT, handleToggle)
  }, [tooltipId])

  useLayoutEffect(() => {
    if (!isExpanded) {
      setTooltipShift(0)
      return
    }

    function updateTooltipShift() {
      const pill = pillRef.current
      const tooltipElement = tooltipRef.current

      if (!pill || !tooltipElement) return

      const viewportPadding = 8
      const pillRect = pill.getBoundingClientRect()
      const tooltipWidth = tooltipElement.offsetWidth
      const centeredLeft = pillRect.left + pillRect.width / 2 - tooltipWidth / 2
      const centeredRight = centeredLeft + tooltipWidth
      let nextShift = 0

      if (centeredLeft < viewportPadding) {
        nextShift = viewportPadding - centeredLeft
      } else if (centeredRight > window.innerWidth - viewportPadding) {
        nextShift = window.innerWidth - viewportPadding - centeredRight
      }

      setTooltipShift(Math.round(nextShift))
    }

    updateTooltipShift()
    window.addEventListener('resize', updateTooltipShift)
    window.addEventListener('scroll', updateTooltipShift, true)

    return () => {
      window.removeEventListener('resize', updateTooltipShift)
      window.removeEventListener('scroll', updateTooltipShift, true)
    }
  }, [isExpanded])

  function setActive(id: string | null) {
    window.dispatchEvent(
      new CustomEvent(PRODUCT_PILL_TOGGLE_EVENT, {
        detail: { id },
      }),
    )
  }

  const tooltipStyle = {
    '--product-pill-tooltip-shift': `${tooltipShift}px`,
  } as CSSProperties

  return (
    <button
      ref={pillRef}
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
      <span
        ref={tooltipRef}
        className="product-pill__tooltip"
        id={tooltipId}
        role="tooltip"
        style={tooltipStyle}
      >
        {tooltip}
      </span>
    </button>
  )
}
