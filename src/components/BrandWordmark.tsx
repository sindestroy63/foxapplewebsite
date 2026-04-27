type BrandWordmarkProps = {
  className?: string
  subtitle?: string
}

export function BrandWordmark({ className, subtitle }: BrandWordmarkProps) {
  const classes = ['brand-wordmark', className].filter(Boolean).join(' ')

  return (
    <span className={classes}>
      <span className="brand-wordmark-text" aria-hidden="true">
        <span>FOX</span>
        <span>APPLE.</span>
      </span>
      {subtitle ? <span className="brand-wordmark-subtitle">{subtitle}</span> : null}
    </span>
  )
}
