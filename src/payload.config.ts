import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Categories } from './payload/collections/Categories'
import { Colors } from './payload/collections/Colors'
import { DeviceModels } from './payload/collections/DeviceModels'
import { RamOptions } from './payload/collections/RamOptions'
import { VariantSizeOptions } from './payload/collections/VariantSizeOptions'
import { ScreenSizeOptions } from './payload/collections/ScreenSizeOptions'
import { ConnectivityOptions } from './payload/collections/ConnectivityOptions'
import { CatalogNavigation } from './payload/collections/CatalogNavigation'
import { Leads } from './payload/collections/Leads'
import { Media } from './payload/collections/Media'
import { Pages } from './payload/collections/Pages'
import { PriceImportItems } from './payload/collections/PriceImportItems'
import { PriceImportSessions } from './payload/collections/PriceImportSessions'
import { Products } from './payload/collections/Products'
import { PriceUpdateBatches } from './payload/collections/PriceUpdateBatches'
import { PriceUpdateItems } from './payload/collections/PriceUpdateItems'
import { SimOptions } from './payload/collections/SimOptions'
import { StorageOptions } from './payload/collections/StorageOptions'
import { Users } from './payload/collections/Users'
import { SiteAppearance } from './payload/globals/SiteAppearance'
import { SiteSettings } from './payload/globals/SiteSettings'
import { priceUpdateEndpoints } from './payload/price-updates/endpoints'
import { migrations } from './migrations'
import { catalogNavigationAdminEndpoints } from './payload/catalog-navigation-admin'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost'

// Единый список разрешённых origin для CORS/CSRF. Технический (punycode) домен обязателен —
// кириллица в Origin-заголовках браузеров не встречается. Список расширяется через ENV,
// без хардкода конкретного бренд-домена в коде.
const extraAllowedOrigins = (process.env.PAYLOAD_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = Array.from(
  new Set([
    serverURL,
    'https://xn--n1aagcfji.xn--p1ai',
    'https://www.xn--n1aagcfji.xn--p1ai',
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:3001',
    ...extraAllowedOrigins,
  ]),
)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      afterNavLinks: ['/payload/components/admin/PriceUpdateNavLink', '/payload/components/admin/CatalogNavigationNavLink'],
      graphics: {
        Icon: '/payload/components/admin/Branding#NavIcon',
        Logo: '/payload/components/admin/Branding#LoginLogo',
      },
      views: {
        priceUpdates: {
          Component: '/payload/components/admin/PriceUpdateView',
          path: '/price-updates',
          exact: true,
          meta: { title: 'Обновление цен' },
        },
        catalogNavigation: {
          Component: '/payload/components/admin/CatalogNavigationView',
          path: '/catalog-navigation',
          exact: true,
          meta: { title: 'Навигация каталога' },
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dashboard: {
      widgets: [],
    },
    meta: {
      titleSuffix: ' | ФОХСТОР CMS',
      icons: [
        { url: '/favicon.ico', type: 'image/x-icon' },
        { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      ],
    },
  },
  collections: [
    Users, Media, Categories, Products, PriceUpdateBatches, PriceUpdateItems, PriceImportSessions, PriceImportItems,
    Leads, Pages, Colors, StorageOptions, SimOptions, DeviceModels, RamOptions, VariantSizeOptions, ScreenSizeOptions, ConnectivityOptions, CatalogNavigation,
  ],
  endpoints: [...priceUpdateEndpoints, ...catalogNavigationAdminEndpoints],
  globals: [SiteSettings, SiteAppearance],
  bin: [
    {
      key: 'seed',
      scriptPath: path.resolve(dirname, 'seed.ts'),
    },
  ],
  cors: allowedOrigins,
  csrf: allowedOrigins,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
  }),
  editor: lexicalEditor(),
  i18n: {
    fallbackLanguage: 'ru',
    supportedLanguages: {
      ru,
    },
    translations: {
      ru: {
        general: {
          collections: 'Разделы',
          globals: 'Настройки',
        },
      },
    },
  },
  secret: process.env.PAYLOAD_SECRET || 'local-development-secret-change-me',
  serverURL,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
