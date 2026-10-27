'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { getMediaUrl } from '@/lib/media'
import type { Media } from '@/lib/types'
import { useSwipe } from '@/lib/use-swipe'
import { ImageWithFallback } from './ImageWithFallback'

type Props = {
  images: Media[]
  index: number
  alt: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

const FOCUSABLE = 'button:not([disabled])'

export function GalleryLightbox({ images, index, alt, onIndexChange, onClose }: Props) {
  const count = images.length
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)

  const go = useCallback(
    (step: number) => {
      if (count > 1) onIndexChange((index + step + count) % count)
    },
    [count, index, onIndexChange],
  )

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      } else if (event.key === 'Tab' && rootRef.current) {
        const items = Array.from(rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        } else if (!rootRef.current.contains(active)) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [go, onClose])

  useEffect(() => {
    for (const step of [-1, 1]) {
      const neighbour = images[(index + step + count) % count]
      const url = getMediaUrl(neighbour, 'detail')
      if (url) new Image().src = url
    }
  }, [images, index, count])

  useEffect(() => {
    const active = thumbsRef.current?.querySelector<HTMLElement>('[aria-current="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [index])

  const swipe = useSwipe({ left: () => go(1), right: () => go(-1), down: onClose })

  const current = images[index]
  const url = getMediaUrl(current, 'detail')

  return createPortal(
    <div
      ref={rootRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Фото: ${alt}`}
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
      onTouchCancel={swipe.onTouchCancel}
    >
      <div className="lightbox__bar">
        <span className="lightbox__counter" aria-live="polite">
          {count > 1 ? `${index + 1} / ${count}` : ''}
        </span>
        <button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label="Закрыть">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>
      </div>

      <div
        className="lightbox__stage"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        {count > 1 && (
          <button type="button" className="lightbox__arrow lightbox__arrow--left" onClick={() => go(-1)} aria-label="Предыдущее фото">
            ‹
          </button>
        )}
        {url ? (
          <ImageWithFallback key={index} src={url} alt={current?.alt || `${alt} ${index + 1}`} className="lightbox__image" loading="eager" />
        ) : (
          <span className="image-placeholder" role="img" aria-label={alt} />
        )}
        {count > 1 && (
          <button type="button" className="lightbox__arrow lightbox__arrow--right" onClick={() => go(1)} aria-label="Следующее фото">
            ›
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="lightbox__thumbs" ref={thumbsRef}>
          {images.map((image, i) => {
            const thumb = getMediaUrl(image, 'thumbnail')
            return (
              <button
                key={image.id}
                type="button"
                className={`lightbox__thumb${i === index ? ' lightbox__thumb--active' : ''}`}
                aria-current={i === index}
                aria-label={`Фото ${i + 1}`}
                onClick={() => onIndexChange(i)}
              >
                {thumb ? <ImageWithFallback src={thumb} alt="" /> : <span className="image-placeholder" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>,
    document.body,
  )
}
