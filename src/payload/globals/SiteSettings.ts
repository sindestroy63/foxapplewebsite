import type { GlobalConfig } from 'payload'

import { anyone, superadmins } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  access: {
    read: anyone,
    update: superadmins,
  },
  fields: [
    {
      name: 'shopName',
      type: 'text',
      label: 'Название магазина',
      defaultValue: 'FOX APPLE',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Телефон',
      defaultValue: '+7 (917) 954-64-64',
    },
    {
      name: 'telegramUsername',
      type: 'text',
      label: 'Telegram',
      defaultValue: '@FoxAppleSeller',
    },
    {
      name: 'telegramChannelUrl',
      type: 'text',
      label: 'Telegram-канал',
      defaultValue: 'https://t.me/foxappleru',
    },
    {
      name: 'whatsappUrl',
      type: 'text',
      label: 'WhatsApp URL',
    },
    {
      name: 'address',
      type: 'text',
      label: 'Адрес',
      defaultValue: 'Самара, ул. Московское шоссе 55',
    },
    {
      name: 'workTime',
      type: 'text',
      label: 'График',
      defaultValue: 'с 11:00 до 20:00, ежедневно',
    },
    {
      name: 'mapUrl',
      type: 'text',
      label: 'Ссылка на карту',
    },
    {
      name: 'mainDomain',
      type: 'text',
      label: 'Основной домен',
      defaultValue: 'foxapple.ru',
    },
    {
      name: 'secondaryDomain',
      type: 'text',
      label: 'Дополнительный домен',
      defaultValue: 'фоксэпл.рф',
    },
    {
      name: 'heroTitle',
      type: 'text',
      label: 'Hero заголовок',
      defaultValue: 'FOX APPLE — техника Apple в Самаре',
    },
    {
      name: 'heroSubtitle',
      type: 'textarea',
      label: 'Hero подзаголовок',
      defaultValue: 'Оригинальная техника Apple, гарантия 1 год, Trade-In, рассрочка и доставка.',
    },
    {
      name: 'aboutText',
      type: 'textarea',
      label: 'О магазине',
      defaultValue:
        'FOX APPLE помогает быстро выбрать актуальную технику Apple, проверить наличие и забронировать товар в Самаре.',
    },
    {
      name: 'homepageMediaTitle',
      type: 'text',
      label: 'Заголовок медиа-блока на главной',
      defaultValue: 'FOX APPLE вживую',
    },
    {
      name: 'homepageMediaText',
      type: 'textarea',
      label: 'Текст медиа-блока на главной',
      defaultValue:
        'Загружайте фото, видео и GIF из офиса, выдач и новых поставок в раздел «Медиа», а затем выбирайте их здесь для главной страницы.',
    },
    {
      name: 'homepageMedia',
      type: 'relationship',
      label: 'Медиа для главной страницы',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description:
          'Рекомендуемый размер: 1400×1050 px (фото), 1920×1080 (видео). Формат: JPG, PNG, WebP, GIF или MP4. Первый элемент — крупно, остальные в сетку.',
      },
    },
  ],
}
