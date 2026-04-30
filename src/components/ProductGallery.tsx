'use client'

import { useState, useCallback } from 'react'
import type { Media } from '@/lib/types'
import { getMediaUrl } from '@/lib/media'

type Props = {
  images: Media[]
  alt: string
}

export function ProductGallery({ images, alt }: Props) {
  const [idx, setIdx] = useState(0)

  const prev = useCallback(() => setIdx((i) => (i > 0 ? i - 1 : images.length - 1)), [images.length])
  const next = useCallback(() => setIdx((i) => (i < images.length - 1 ? i + 1 : 0)), [images.length])

  if (images.length === 0) {
    return (
      <div className="gallery">
        <div className="gallery-main">
          <div className="gallery-placeholder">{alt}</div>
        </div>
      </div>
    )
  }

  const current = images[idx]
  const mainUrl = getMediaUrl(current, 'detail')

  return (
    <div className="gallery">
      <div className="gallery-main">
        {mainUrl && <img src={mainUrl} alt={current?.alt || alt} draggable={false} />}
        {images.length > 1 && (
          <>
            <button className="gallery-arrow gallery-arrow--left" onClick={prev} aria-label="Предыдущее фото" type="button">‹</button>
            <button className="gallery-arrow gallery-arrow--right" onClick={next} aria-label="Следующее фото" type="button">›</button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((img, i) => {
            const thumbUrl = getMediaUrl(img, 'thumbnail')
            return (
              <button
                key={img.id}
                className={`gallery-thumb ${i === idx ? 'gallery-thumb--active' : ''}`}
                onClick={() => setIdx(i)}
                type="button"
                aria-label={`Фото ${i + 1}`}
              >
                {thumbUrl && <img src={thumbUrl} alt={img.alt || `${alt} ${i + 1}`} draggable={false} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
