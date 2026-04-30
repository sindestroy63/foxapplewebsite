import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const SiteAppearance: GlobalConfig = {
  slug: 'site-appearance',
  label: 'Оформление сайта',
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Главный экран (Hero)',
          fields: [
            {
              name: 'heroVideo',
              type: 'upload',
              label: 'Видео / изображение для Hero',
              relationTo: 'media',
              admin: {
                description: 'Рекомендуемый размер: 1920×1080 px (Full HD). Формат: MP4 (видео) или JPG/PNG/WebP (фото). Отображается на фоне главного экрана.',
              },
            },
          ],
        },
        {
          label: 'Медиа-блок',
          fields: [
            {
              name: 'mediaBlockTitle',
              type: 'text',
              label: 'Заголовок медиа-блока',
              defaultValue: 'FOX APPLE вживую',
            },
            {
              name: 'mediaBlockText',
              type: 'textarea',
              label: 'Текст медиа-блока',
            },
            {
              name: 'mediaBlockItems',
              type: 'relationship',
              label: 'Медиа для блока на главной',
              relationTo: 'media',
              hasMany: true,
              admin: {
                description: 'Рекомендуемый размер: 1400×1050 px (фото), 1920×1080 (видео). Формат: JPG, PNG, WebP, GIF или MP4. Первый элемент показывается крупно, остальные — в сетку.',
              },
            },
          ],
        },
      ],
    },
  ],
}
