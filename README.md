# ФОХСТОР

Публичный сайт магазина техники Apple в Самаре. Пользователь выбирает товар и вариант, добавляет позиции в корзину и отправляет заявку менеджеру. Онлайн-оплаты на сайте нет.

## Стек

- Next.js `16.2.4`, React `19.2.5`, TypeScript `5.9.3`
- Payload CMS `3.84.1` с PostgreSQL adapter
- PostgreSQL `16-alpine`
- Nginx `1.27-alpine`, Docker Compose
- Lexical, Sharp, Zod; серверная интеграция Telegram Bot API

## Архитектура и структура

Next.js App Router содержит публичный frontend и встроенную админку Payload. Payload использует PostgreSQL, миграции из `src/migrations` и файловое хранилище media volume. Nginx проксирует HTTP/HTTPS на приложение и обслуживает SSL.

```text
src/app/(frontend)/       публичные страницы
src/app/(payload)/        Payload admin, REST и GraphQL routes
src/components/           UI, каталог, корзина и формы
src/actions/              server actions для заявок
src/lib/                  CMS-запросы, типы, корзина, Telegram и утилиты
src/payload/collections/  коллекции Payload
src/payload/globals/      глобальные настройки Payload
src/migrations/           миграции PostgreSQL/Payload
src/seed.ts               seed категорий, справочников, страниц и товаров
src/seed-products.ts      исходный каталог товаров
nginx/                    активный конфиг и шаблоны для SSL/доменов
docker-compose.yml        app + postgres + nginx
```

## Локальный запуск

```bash
cp .env.example .env
# задайте POSTGRES_PASSWORD и PAYLOAD_SECRET
docker compose up -d --build
```

Локальные адреса из `docker-compose.yml`:

- `http://localhost:3003` — приложение напрямую;
- `http://localhost` — приложение через Nginx;
- `http://localhost:3003/admin` — Payload CMS.

Для запуска без Docker нужны Node.js/npm и доступная PostgreSQL, после чего применяются обычные `npm install`, `npm run dev`, `npm run typecheck` и `npm run build`. В Docker миграции запускаются при старте, если `RUN_MIGRATIONS_ON_START=true`.

## Каталог, товары и варианты

Товары находятся в коллекции `Products`. Один товар имеет slug, категорию, изображения, цену, статус и вложенные `variants`; вариант получает отдельный SKU и может содержать цвет, память, SIM, размер, чип, диагональ, подключение, материал и размер ремешка. Статусы товара и варианта: `in_stock`, `preorder`, `out_of_stock`. Отдельные товары для конфигураций создавать нельзя: конфигурации хранятся внутри `variants`.

Seed содержит категории:

| Категория | Slug |
|---|---|
| iPhone | `iphone` |
| iPad | `ipad` |
| MacBook | `macbook` |
| AirPods | `airpods` |
| Apple Watch | `apple-watch` |
| PlayStation | `playstation` |
| Аксессуары | `accessories` |
| Б/У техника | `used` |

Справочники характеристик включают цвета, память, SIM, модели устройств, RAM, размеры вариантов, диагонали и подключение. Каталог также поддерживает навигацию и группы брендов через `CatalogNavigation` и `BrandCatalogNavigation`.

## Корзина и заявка

На странице товара пользователь выбирает вариант и добавляет товар в корзину. Корзина хранится в браузере в `localStorage` под ключом `foxapple-cart`; для одинакового товара и конфигурации количество объединяется.

Маршрут `/cart` показывает позиции, варианты, количество и сумму. На этой же странице находится форма оформления: имя, телефон, Telegram, комментарий и согласие на обработку персональных данных. Онлайн-эквайринга и оплаты нет. После отправки корзина очищается, а менеджер связывается с клиентом для подтверждения заказа, наличия и доставки.

Заявка записывается в Payload collection `Leads` с источником `cart_order`, составом корзины и статусами заявки/отправки в Telegram. Сервер отправляет сообщение через Telegram Bot API (`sendMessage`) в чат из `TELEGRAM_CHAT_ID`; токен задаётся через `TELEGRAM_BOT_TOKEN`. Результат фиксируется как `telegram_sent` или `telegram_failed`. Остальные формы сайта создают заявки с собственными источниками (`product_form`, `contact_form`, `repair_form`, `trade_in_form`, `installment_form`).

## Payload CMS

Коллекции: `Users`, `Media`, `Categories`, `Products`, `Leads`, `Pages`, `CatalogNavigation`, а также справочники характеристик и коллекции импорта/обновления цен (`PriceUpdateBatches`, `PriceUpdateItems`, `PriceImportSessions`, `PriceImportItems`).

Глобалы: `SiteSettings`, `SiteAppearance`, `BrandCatalogNavigation`.

Админка доступна по `/admin`. Дополнительные административные разделы: обновление цен `/admin/price-updates`, Trade-In `/admin/trade-in` и навигация каталога `/admin/catalog-navigation`.

## Основные маршруты

- `/` — главная;
- `/catalog` — каталог;
- `/catalog/[categorySlug]` — категория;
- `/catalog/[categorySlug]/[productSlug]` — товар;
- `/cart` — корзина и оформление заявки;
- `/contacts`, `/installment`, `/trade-in`, `/trade-in/catalog`, `/warranty`, `/repair` — сервисные страницы;
- `/offer`, `/privacy`, `/privacy-policy`, `/personal-data-consent`, `/purchase-return` — юридические страницы;
- `/admin` — Payload CMS.

## ENV и команды

Основные переменные `.env.example`:

```env
POSTGRES_DB=foxapple
POSTGRES_USER=foxapple
POSTGRES_PASSWORD=...
DATABASE_URL=postgres://...
PAYLOAD_SECRET=...
NEXT_PUBLIC_SITE_URL=http://localhost
PAYLOAD_PUBLIC_SERVER_URL=http://localhost
PAYLOAD_ALLOWED_ORIGINS=http://localhost:3003
RUN_MIGRATIONS_ON_START=true
PAYLOAD_SEED_ON_START=false
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_API_BASE=...
OPENAI_API_KEY=...
OPENAI_BASE_URL=...
OPENAI_PRICE_MODEL=...
OPENAI_RESPONSE_FORMAT=json_schema
```

Не публикуйте секреты и токены. В production `NEXT_PUBLIC_SITE_URL` и `PAYLOAD_PUBLIC_SERVER_URL` должны указывать на технический IDN-домен `https://xn--n1aagcfji.xn--p1ai` (фохстор.рф), если используется текущая схема домена.

```bash
npm run dev
npm run typecheck
npm run build
npm test

docker compose up -d --build
docker compose ps
docker compose logs --tail=200 app
docker compose exec app npm run payload -- migrate
docker compose exec app npm run seed
```

`PAYLOAD_SEED_ON_START=true` включает seed при старте. Seed обновляет контакты, категории, справочники, канонический каталог товаров, страницы и пользователей Payload; для production включайте его осознанно.

## Migrations и seed

Payload настроен на `src/migrations`, `push: false`, и выполняет зарегистрированные миграции из `src/migrations/index.ts`. При необходимости миграции запускаются вручную командой `npm run payload -- migrate`. Seed зарегистрирован как Payload command `npm run seed`; он не является миграцией схемы.

## Production deployment

Compose запускает три сервиса:

- `postgres` — PostgreSQL 16, порт хоста `5433`, volume `postgres_data`;
- `app` — production-сборка Next.js, порт хоста `3003`, volume `media_data`;
- `nginx` — порты `80/443`, reverse proxy, сертификаты из `/etc/letsencrypt` и ACME volume.

Базовый порядок на Ubuntu: установить Docker Engine и Compose plugin, развернуть проект, создать `.env`, задать production URL/секреты/Telegram, затем выполнить `docker compose up -d --build`. После запуска проверить `docker compose ps`, логи app/Nginx и доступность `/admin`.

Активный конфиг `nginx/conf.d/foxapple.conf` пока обслуживает текущий домен `foxapple.ru`. Шаблоны нового домена находятся в `nginx/examples/foxstore.conf` и `nginx/examples/foxstore.ssl.conf`; они не подключаются автоматически. Для перехода на `фохстор.рф` сначала направьте DNS A-записи `фохстор.рф` и `www.фохстор.рф` на сервер, используйте punycode `xn--n1aagcfji.xn--p1ai`, выпустите сертификат Let's Encrypt через HTTP-конфиг, затем активируйте SSL-конфиг и перезапустите Nginx.

До ручной активации нового конфига DNS и SSL для нового домена не считаются переключёнными. Шаблоны предусматривают 301-редирект со старого `foxapple.ru` после готовности нового домена; не удаляйте активный конфиг до проверки DNS, сертификата и редиректов.