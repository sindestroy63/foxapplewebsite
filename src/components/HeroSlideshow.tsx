'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Media } from '@/lib/types'

type Slide = {
  url: string
  isVideo: boolean
  alt: string
}

type Props = {
  slides: Slide[]
}

export function HeroSlideshow({ slides }: Props) {
  const [current, setCurrent] = useState(0)
  const [next, setNext] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const len = slides.length

  const isCurrentVideo = slides[current]?.isVideo

  const advance = useCallback(
    (to?: number) => {
      if (len <= 1) return
      const target = to !== undefined ? to : (current + 1) % len
      if (target === current) return
      setNext(target)
      setTimeout(() => {
        setCurrent(target)
        setNext(null)
      }, 800)
    },
    [current, len],
  )

  useEffect(() => {
    if (len <= 1) return
    if (isCurrentVideo) return
    timerRef.current = setTimeout(() => advance(), 7000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [advance, len, current, isCurrentVideo])

  const handleVideoEnded = useCallback(() => {
    if (len > 1) advance()
  }, [advance, len])

  const goTo = (idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    advance(idx)
  }

  const goPrev = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    advance((current - 1 + len) % len)
  }

  const goNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    advance((current + 1) % len)
  }

  if (slides.length === 0) return null

  return (
    <div className="hero-slideshow">
      {slides.map((slide, i) => {
        const isActive = i === current
        const isNext = i === next
        const visible = isActive || isNext
        return (
          <div
            className={`hero-slide${isActive && next === null ? ' hero-slide--active' : ''}${isNext ? ' hero-slide--next' : ''}${isActive && next !== null ? ' hero-slide--leaving' : ''}`}
            key={i}
          >
            {visible && (
              slide.isVideo ? (
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
              ) : (
                <img
                  alt={slide.alt}
                  className="hero-bg-video"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  src={slide.url}
                />
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
