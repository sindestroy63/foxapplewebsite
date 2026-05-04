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
              name: 'heroSlides',
              type: 'relationship',
              label: 'Слайды для Hero (фото / видео)',
              relationTo: 'media',
              hasMany: true,
              admin: {
                description: 'Добавьте несколько фото или видео. Они будут автоматически сменяться каждые 7 секунд. Рекомендуемый размер: 1920×1080 px. Формат: MP4, JPG, PNG, WebP.',
              },
            },
            {
              name: 'heroVideo',
              type: 'upload',
              label: 'Видео / изображение (устаревшее, используйте слайды выше)',
              relationTo: 'media',
              admin: {
                description: 'Используется как fallback, если слайды не заданы.',
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
        {
          label: 'Лучшие предложения',
          fields: [
            {
              name: 'bestOffers',
              type: 'relationship',
              label: 'Товары для блока «Лучшие предложения»',
              relationTo: 'products',
              hasMany: true,
              maxRows: 6,
              admin: {
                description: 'Выберите до 6 товаров. Если не задано — используются товары с флагом «Популярный».',
              },
            },
          ],
        },
      ],
    },
  ],
}
