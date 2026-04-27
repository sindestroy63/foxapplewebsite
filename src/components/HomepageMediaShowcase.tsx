import { ScrollReveal } from '@/components/ScrollReveal'
import { getMediaUrl, isVideoMedia } from '@/lib/media'
import type { Media } from '@/lib/types'

function MediaTile({
  media,
  priority = false,
}: {
  media: Media
  priority?: boolean
}) {
  const url = getMediaUrl(media, 'detail')

  if (!url) {
    return null
  }

  const isVideo = isVideoMedia(media)

  return (
    <figure className={`showcase-tile${isVideo ? ' showcase-tile--video' : ''}`}>
      {isVideo ? (
        <>
          <video
            autoPlay
            className="showcase-media"
            loop
            muted
            playsInline
            preload={priority ? 'auto' : 'metadata'}
            src={url}
          />
          <span className="showcase-play-badge">▶ Видео</span>
        </>
      ) : (
        <img
          alt={media.alt || 'FOX APPLE'}
          className="showcase-media"
          loading={priority ? 'eager' : 'lazy'}
          src={url}
        />
      )}
      {media.alt ? <figcaption>{media.alt}</figcaption> : null}
    </figure>
  )
}

export function HomepageMediaShowcase({
  items,
  text,
  title,
}: {
  items: Media[]
  text?: string
  title?: string
}) {
  if (!items.length) {
    return null
  }

  const [featured, ...secondary] = items

  return (
    <ScrollReveal>
    <section className="section section-showcase">
      <div className="container section-head showcase-head">
        <div>
          <p className="eyebrow">Наш магазин</p>
          <h2>{title || 'Загляните к нам'}</h2>
        </div>
        {text ? <p className="showcase-copy">{text}</p> : null}
      </div>

      <div className={`container showcase-grid${secondary.length ? '' : ' single'}`}>
        <div className="showcase-featured">
          <MediaTile media={featured} priority />
        </div>

        {secondary.length ? (
          <div className="showcase-secondary">
            {secondary.slice(0, 4).map((media) => (
              <MediaTile key={media.id} media={media} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
    </ScrollReveal>
  )
}
