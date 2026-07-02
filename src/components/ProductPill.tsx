'use client'

import { useId, useState } from 'react'
import type { CSSProperties } from 'react'

type ProductPillProps = {
  label: string
  tooltip: string
  tone?: 'accent' | 'light' | 'warranty'
}

export function ProductPill({ label, tooltip, tone = 'light' }: ProductPillProps) {
  const tooltipId = useId()
  const [isExpanded, setIsExpanded] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>()

  function updateTooltipPosition(target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect()
    const tooltipWidth = Math.min(260, window.innerWidth - 32)
    const center = rect.left + rect.width / 2
    const left = Math.min(Math.max(center - tooltipWidth / 2, 16), window.innerWidth - tooltipWidth - 16)
    const top = Math.max(rect.top - 8, 8)
    const arrowLeft = Math.min(Math.max(center, 22), window.innerWidth - 22)

    setTooltipStyle({
      '--product-pill-tooltip-left': `${left}px`,
      '--product-pill-tooltip-top': `${top}px`,
      '--product-pill-tooltip-arrow-left': `${arrowLeft}px`,
    } as CSSProperties)
  }

  return (
    <button
      className={`product-pill product-pill--${tone}${isExpanded ? ' product-pill--expanded' : ''}`}
      type="button"
      style={tooltipStyle}
      aria-label={`${label}: ${tooltip}`}
      aria-describedby={tooltipId}
      aria-expanded={isExpanded}
      onBlur={() => setIsExpanded(false)}
      onClick={(event) => {
        updateTooltipPosition(event.currentTarget)
        setIsExpanded((current) => !current)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setIsExpanded(false)
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
