'use client'

import { useState } from 'react'

export function ImageWithFallback({ src, alt, className, loading }: { src: string; alt: string; className?: string; loading?: 'lazy' | 'eager' }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="image-placeholder" role="img" aria-label={alt} />
  return <img className={className} src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />
}
