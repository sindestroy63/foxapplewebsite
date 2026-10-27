'use client'

import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Media } from '@/lib/types'
import { getMediaUrl } from '@/lib/media'
import { useSwipe } from '@/lib/use-swipe'
import { GalleryLightbox } from './GalleryLightbox'
import { ImageWithFallback } from './ImageWithFallback'

type Props = {
  images: Media[]
  alt: string
  overlay?: ReactNode
}

export function ProductGallery({ images, alt, overlay }: Props) {
  const [selected, setSelected] = useState(0)
  const [viewing, setViewing] = useState(false)

  const idx = Math.min(selected, Math.max(images.length - 1, 0))

  const prev = useCallback(() => setSelected((i) => (i > 0 ? i - 1 : images.length - 1)), [images.length])
  const next = useCallback(() => setSelected((i) => (i < images.length - 1 ? i + 1 : 0)), [images.length])
  const swipe = useSwipe({ left: images.length > 1 ? next : undefined, right: images.length > 1 ? prev : undefined })

  if (images.length === 0) {
    return (
      <div className="gallery">
        <div className="gallery-main-wrap">
          <div className="gallery-main">
            <span className="image-placeholder" role="img" aria-label={alt} />
          </div>
          {overlay}
        </div>
      </div>
    )
  }

  const current = images[idx]
  const mainUrl = getMediaUrl(current, 'detail')

  return (
    <div className="gallery">
      <div className="gallery-main-wrap">
        <div
          className="gallery-main"
          onTouchStart={swipe.onTouchStart}
          onTouchMove={swipe.onTouchMove}
          onTouchEnd={swipe.onTouchEnd}
          onTouchCancel={swipe.onTouchCancel}
        >
          {mainUrl ? <ImageWithFallback src={mainUrl} alt={current?.alt || alt} className="gallery-image" /> : <span className="image-placeholder" role="img" aria-label={alt} />}
          {mainUrl && (
            <button className="gallery-open" onClick={() => setViewing(true)} type="button" aria-label="Открыть фото на весь экран" />
          )}
          {images.length > 1 && (
            <>
              <button className="gallery-arrow gallery-arrow--left" onClick={prev} aria-label="Предыдущее фото" type="button">‹</button>
              <button className="gallery-arrow gallery-arrow--right" onClick={next} aria-label="Следующее фото" type="button">›</button>
              <div className="gallery-dots">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    className={`gallery-dot ${i === idx ? 'gallery-dot--active' : ''}`}
                    onClick={() => setSelected(i)}
                    type="button"
                    aria-label={`Фото ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        {overlay}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => {
            const thumbUrl = getMediaUrl(img, 'thumbnail')
            return (
              <button
                key={img.id}
                className={`gallery-thumb ${i === idx ? 'gallery-thumb--active' : ''}`}
                onClick={() => setSelected(i)}
                type="button"
                aria-label={`Фото ${i + 1}`}
              >
                {thumbUrl ? <ImageWithFallback src={thumbUrl} alt={img.alt || `${alt} ${i + 1}`} /> : <span className="image-placeholder" role="img" aria-label={`${alt} ${i + 1}`} />}
              </button>
            )
          })}
        </div>
      )}
      {viewing && <GalleryLightbox images={images} index={idx} alt={alt} onIndexChange={setSelected} onClose={() => setViewing(false)} />}
    </div>
  )
}
