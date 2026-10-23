'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type HeroSlide = {
  id: string
  isVideo?: boolean
  url: string
  alt: string
  title?: string
  subtitle?: string
  eyebrow?: string
  buyUrl: string
  buyLabel?: string
  secondaryUrl?: string
  secondaryLabel?: string
  bg?: string
}

type Props = {
  slides: HeroSlide[]
}

export function HeroSlideshow({ slides }: Props) {
  const [current, setCurrent] = useState(0)
  const [next, setNext] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | number | null>(null)
  const len = slides.length

  const isCurrentVideo = Boolean(slides[current]?.isVideo)

  const advance = useCallback(
    (to?: number) => {
      if (len <= 1) return
      const target = to !== undefined ? to : (current + 1) % len
      if (target === current) return
      setNext(target)
      setTimeout(() => {
        setCurrent(target)
        setNext(null)
      }, 600)
    },
    [current, len],
  )

  useEffect(() => {
    if (len <= 1) return
    const duration = isCurrentVideo ? 7000 : 5000
    timerRef.current = setTimeout(() => advance(), duration)
    return () => {
      clearTimeout(timerRef.current as number)
    }
  }, [advance, len, current, isCurrentVideo])

  const handleVideoEnded = useCallback(() => {
    if (len > 1) advance()
  }, [advance, len])

  const goTo = (idx: number) => {
    clearTimeout(timerRef.current as number)
    advance(idx)
  }

  const goPrev = () => {
    clearTimeout(timerRef.current as number)
    advance((current - 1 + len) % len)
  }

  const goNext = () => {
    clearTimeout(timerRef.current as number)
    advance((current + 1) % len)
  }

  if (slides.length === 0) return null

  return (
    <div className="hero-slideshow-container">
      {slides.map((slide, i) => {
        const isActive = i === current
        const isNext = i === next
        const visible = isActive || isNext
        const slideBg = slide.bg || (slide.isVideo ? '#000000' : '#f7f6f9')

        return (
          <div
            className={`hero-slide${isActive && next === null ? ' hero-slide--active' : ''}${isNext ? ' hero-slide--next' : ''}${isActive && next !== null ? ' hero-slide--leaving' : ''}`}
            key={slide.id || i}
            style={{ backgroundColor: slideBg }}
          >
            {visible && (
              slide.isVideo ? (
                <div className="hero-slide-video-wrap">
                  <video
                    autoPlay
                    className="hero-bg-video"
                    loop={len <= 1}
                    muted
                    onEnded={isActive ? handleVideoEnded : undefined}
                    playsInline
                    preload="auto"
                    src={slide.url}
                  />
                  <div className="hero-bg-overlay" />
                  <div className="container hero-content">
                    {slide.eyebrow && <p className="eyebrow">{slide.eyebrow}</p>}
                    <h1>{slide.title || 'iPhone 18 Pro Max'}</h1>
                    {slide.subtitle && <p className="hero-subtitle">{slide.subtitle}</p>}
                    <div className="hero-actions">
                      <Link className="button hero-primary" href={slide.buyUrl}>
                        {slide.buyLabel || 'Купить'}
                      </Link>
                      {slide.secondaryUrl && (
                        <Link className="button hero-secondary" href={slide.secondaryUrl}>
                          {slide.secondaryLabel || 'Связаться'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  className="hero-banner-link"
                  href={slide.buyUrl}
                  aria-label={`${slide.alt} - ${slide.buyLabel || 'Купить'}`}
                >
                  <img
                    alt={slide.alt}
                    className="hero-banner-image"
                    loading={i <= 1 ? 'eager' : 'lazy'}
                    src={slide.url}
                  />
                  <span className="hero-banner-cta-button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {slide.buyLabel || 'Купить'}
                  </span>
                </Link>
              )
            )}
          </div>
        )
      })}

      {len > 1 && (
        <>
          <button
            aria-label="Предыдущий слайд"
            className="hero-slide-arrow hero-slide-arrow--prev"
            onClick={goPrev}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label="Следующий слайд"
            className="hero-slide-arrow hero-slide-arrow--next"
            onClick={goNext}
            type="button"
          >
            ›
          </button>
          <div className="hero-slide-dots">
            {slides.map((_, i) => (
              <button
                aria-label={`Слайд ${i + 1}`}
                className={`hero-slide-dot${i === current || i === next ? ' hero-slide-dot--active' : ''}`}
                key={i}
                onClick={() => goTo(i)}
                type="button"
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
