import type { GlobalConfig } from 'payload'

import { admins, anyone } from '../access'

export const SiteAppearance: GlobalConfig = {
  slug: 'site-appearance',
  label: 'Оформление сайта',
  admin: { hidden: true },
  access: {
    read: anyone,
    update: admins,
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
                description: 'Товары показываются на главной в этом порядке. Можно найти товар по названию и быстро изменить порядок.',
                components: { Field: '/payload/components/admin/BestOffersField' },
              },
            },
          ],
        },
      ],
    },
  ],
}
