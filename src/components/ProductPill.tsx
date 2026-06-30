type ProductPillProps = {
  label: string
  tooltip: string
  tone?: 'accent' | 'light' | 'warranty'
}

export function ProductPill({ label, tooltip, tone = 'light' }: ProductPillProps) {
  return (
    <button className={`product-pill product-pill--${tone}`} type="button" aria-label={tooltip} title={tooltip}>
      {label}
    </button>
  )
}
