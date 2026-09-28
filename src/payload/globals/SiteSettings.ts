import type { GlobalConfig } from 'payload'

import { anyone, denyAll } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  admin: { hidden: true },
  access: {
    read: anyone,
    update: denyAll,
  },
  fields: [
    {
      name: 'shopName',
      type: 'text',
      label: 'Название магазина',
      defaultValue: 'ФОХСТОР',
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
      defaultValue: '@FoxStorSeller',
    },
    {
      name: 'telegramChannelUrl',
      type: 'text',
      label: 'Telegram-канал',
      defaultValue: 'https://t.me/foxstorerf',
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
      defaultValue: 'ТЦ «Русь на Волге», 1 этаж, секция 113',
    },
    {
      name: 'workTime',
      type: 'text',
      label: 'График',
      defaultValue: '10:00–21:00 ежедневно',
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
      defaultValue: 'фохстор.рф',
    },
    {
      name: 'secondaryDomain',
      type: 'text',
      label: 'Дополнительный домен',
      defaultValue: 'xn--n1aagcfji.xn--p1ai',
    },
    {
      name: 'heroTitle',
      type: 'text',
      label: 'Hero заголовок',
      defaultValue: 'ФОХСТОР — техника Apple в Самаре',
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
        'ФОХСТОР помогает быстро выбрать актуальную технику Apple, проверить наличие и забронировать товар в Самаре.',
    },
  ],
}
