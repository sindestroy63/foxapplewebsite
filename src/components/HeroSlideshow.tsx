'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type HeroSlide = {
  id: string
  alt: string
  video: string
  poster?: string
  href: string
  eyebrow?: string
  title?: string
  subtitle?: string
  secondaryHref?: string
  secondaryLabel?: string
}

type Props = {
  slides: HeroSlide[]
}

const FALLBACK_ADVANCE_MS = 14000

export function HeroSlideshow({ slides }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])
  const [active, setActive] = useState(0)
  const count = slides.length

  const goTo = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = Math.round(track.scrollLeft / track.clientWidth)
        setActive(Math.min(Math.max(next, 0), count - 1))
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('scroll', onScroll)
    }
  }, [count])

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return
      video.muted = true
      if (index === active) {
        video.currentTime = 0
        video.play().catch(() => undefined)
      } else {
        video.pause()
      }
    })
    if (count <= 1) return
    const timer = setTimeout(() => goTo((active + 1) % count), FALLBACK_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [active, count, goTo])

  if (count === 0) return null

  return (
    <>
      <div className="hero-track" ref={trackRef}>
        {slides.map((slide, index) => {
          const isIntro = Boolean(slide.title)
          return (
            <div className={`hero-slide${isIntro ? ' hero-slide--intro' : ''}`} key={slide.id}>
              <video
                className="hero-slide-media"
                ref={(node) => {
                  videoRefs.current[index] = node
                }}
                src={slide.video}
                poster={slide.poster}
                muted
                playsInline
                preload={index === active || index === (active + 1) % count ? 'auto' : 'none'}
                onEnded={index === active && count > 1 ? () => goTo((active + 1) % count) : undefined}
              />
              {isIntro ? (
                <>
                  <div className="hero-bg-overlay" />
                  <div className="hero-content hero-intro">
                    {slide.eyebrow && <p className="eyebrow">{slide.eyebrow}</p>}
                    <h1>{slide.title}</h1>
                    {slide.subtitle && <p className="hero-subtitle">{slide.subtitle}</p>}
                    <div className="hero-actions">
                      <Link className="button hero-primary" href={slide.href}>
                        Купить
                      </Link>
                      {slide.secondaryHref && (
                        <Link className="button hero-secondary" href={slide.secondaryHref}>
                          {slide.secondaryLabel || 'Связаться'}
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link className="hero-slide-link" href={slide.href} aria-label={slide.alt} draggable={false} />
                  <Link className="hero-buy" href={slide.href} draggable={false}>
                    Купить
                  </Link>
                </>
              )}
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <div className="hero-slide-dots">
          {slides.map((slide, index) => (
            <button
              aria-label={slide.alt}
              className={`hero-slide-dot${index === active ? ' hero-slide-dot--active' : ''}`}
              key={slide.id}
              onClick={() => goTo(index)}
              type="button"
            />
          ))}
        </div>
      )}
    </>
  )
}
