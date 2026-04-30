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
import { Leads } from './payload/collections/Leads'
import { Media } from './payload/collections/Media'
import { Pages } from './payload/collections/Pages'
import { Products } from './payload/collections/Products'
import { SimOptions } from './payload/collections/SimOptions'
import { StorageOptions } from './payload/collections/StorageOptions'
import { Users } from './payload/collections/Users'
import { SiteAppearance } from './payload/globals/SiteAppearance'
import { SiteSettings } from './payload/globals/SiteSettings'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost'

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      graphics: {
        Icon: '/payload/components/admin/Branding#NavIcon',
        Logo: '/payload/components/admin/Branding#LoginLogo',
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' | FOX APPLE CMS',
      icons: [
        { url: '/favicon.ico', type: 'image/x-icon' },
        { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      ],
    },
  },
  collections: [Users, Media, Categories, Products, Leads, Pages, Colors, StorageOptions, SimOptions, DeviceModels],
  globals: [SiteSettings, SiteAppearance],
  bin: [
    {
      key: 'seed',
      scriptPath: path.resolve(dirname, 'seed.ts'),
    },
  ],
  cors: [serverURL, 'https://foxapple.ru', 'https://www.foxapple.ru', 'http://foxapple.ru', 'http://localhost', 'http://localhost:3000'],
  csrf: [serverURL, 'https://foxapple.ru', 'https://www.foxapple.ru', 'http://foxapple.ru', 'http://localhost', 'http://localhost:3000'],
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
