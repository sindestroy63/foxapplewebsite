# ФОХСТОР

Production-ready сайт магазина техники Apple: **Next.js 16**, **TypeScript**, **Payload CMS 3**, **PostgreSQL**, **Docker Compose**, **Nginx**.

Сайт работает без корзины и онлайн-оплаты. Клиент звонит, пишет в Telegram, уточняет наличие и бронирует товар.

## Стек

- **Next.js 16.2** (Turbopack) + React 19
- **Payload CMS 3.84** (PostgreSQL adapter)
- **PostgreSQL 16** (Alpine)
- **Nginx** (reverse-proxy, SSL, IDN)
- **Docker Compose** (app + postgres + nginx)

## Локальный запуск

1. Скопируйте переменные окружения:

```bash
cp .env.example .env
```

2. Укажите сильные значения `POSTGRES_PASSWORD` и `PAYLOAD_SECRET`.

3. Запустите стек:

```bash
docker compose up -d --build
```

4. Откройте сайт:

| URL | Описание |
|-----|----------|
| `http://localhost` | Публичный сайт |
| `http://localhost/admin` | Админка Payload CMS |

При первом входе Payload предложит создать администратора. Seed-данные (категории, страницы, товары с вариантами) применяются автоматически, если `PAYLOAD_SEED_ON_START=true`.

## Структура проекта

```text
src/
  app/(frontend)/             публичный сайт (страницы, каталог, товары)
  app/(payload)/              стандартные маршруты Payload CMS
  components/                 React-компоненты (ProductCard, ProductDetailClient, LeadForm и др.)
  lib/                        утилиты, типы, форматирование, CMS-запросы
  payload/collections/        коллекции CMS (Products, Categories, Leads и др.)
  payload/globals/            глобальные настройки (SiteSettings, SiteAppearance)
  migrations/                 SQL-миграции для PostgreSQL
  seed.ts                     seed-логика (категории, страницы, товары)
  seed-products.ts            каталог товаров с официальными спецификациями Apple
nginx/conf.d/                 конфигурация Nginx (HTTP / SSL)
docker-compose.yml            app + postgres + nginx
```

## Каталог товаров

Товары хранятся в коллекции `Products` с вложенным массивом `variants`. Каждый вариант содержит:

- **Цвет** — структурированный объект: `englishLabel`, `russianLabel`, `value`, `primaryHex`, `secondaryHex?`
- **Память / SSD** — 128GB, 256GB, 512GB, 1TB, 2TB
- **SIM** — `SIM + eSIM` или `eSIM`
- **Размер** — для Apple Watch (42mm, 46mm и т.д.)
- **Чип / RAM / Диагональ / Подключение** — для Mac и iPad
- **Цена** — наличные, старая цена
- **Статус** — в наличии, под заказ, нет в наличии

Все цвета соответствуют официальным спецификациям Apple и отображаются с цветным кружком + билингвальной подписью (English / Русский).

### Категории

| Категория | Slug |
|-----------|------|
| iPhone | `iphone` |
| iPad | `ipad` |
| MacBook | `macbook` |
| AirPods | `airpods` |
| Apple Watch | `apple-watch` |
| PlayStation | `playstation` |
| Аксессуары | `accessories` |
| Б/У техника | `used` |

### Карточка каталога

В карточке каталога: изображение, название, цена «от» (наличные / по карте), статус наличия, кнопки связи. Конфигурации (цвет, память, SIM) видны только на странице товара.

Для новых товаров показывается юридический disclaimer про RuStore. Для категории «Б/У техника» он скрыт.

## CMS-модели

### Коллекции

- **Categories** — категории каталога (название, slug, обложка, сортировка)
- **Products** — товары с вариантами, ценами, фото и SEO
- **Leads** — заявки с карточек товара и страницы контактов
- **Pages** — редактируемые текстовые страницы (Rich Text)
- **Media** — загрузка изображений (thumbnail / card / detail)
- **Users** — сотрудники админки (admin / manager)

### Глобалы

- **SiteSettings** — контакты, домены, hero-тексты, Telegram, WhatsApp
- **SiteAppearance** — hero-видео, медиа-блок на главной

## Полезные команды

```bash
docker compose up -d --build          # сборка и запуск
docker compose down -v                # остановка и очистка данных
docker compose logs -f app            # логи приложения
docker compose exec app npm run payload -- migrate   # миграции
docker compose exec app npm run seed                 # seed-данные
npm run typecheck                     # проверка типов
npm run build                         # production-сборка
```

## Деплой на Ubuntu 22.04

### 1. Установка Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2. Клонирование проекта

```bash
sudo mkdir -p /opt/foxapple
sudo chown -R "$USER":"$USER" /opt/foxapple
git clone <repo-url> /opt/foxapple
cd /opt/foxapple
```

### 3. Настройка `.env`

```bash
cp .env.example .env
nano .env
```

Для production (домен ФОХСТОР — фохстор.рф, ASCII/punycode-форма `xn--n1aagcfji.xn--p1ai`):

```env
NEXT_PUBLIC_SITE_URL=https://xn--n1aagcfji.xn--p1ai
PAYLOAD_PUBLIC_SERVER_URL=https://xn--n1aagcfji.xn--p1ai
POSTGRES_PASSWORD=<strong-password>
PAYLOAD_SECRET=<long-random-secret>
RUN_MIGRATIONS_ON_START=true
PAYLOAD_SEED_ON_START=true
```

ENV-переменные и `Metadata.metadataBase` / canonical / sitemap / robots читают домен централизованно через `SITE_URL` / `absoluteUrl()` в `src/lib/constants.ts` — при смене домена достаточно поменять `NEXT_PUBLIC_SITE_URL` / `PAYLOAD_PUBLIC_SERVER_URL`, без правки кода. Опционально можно указать дополнительные разрешённые CORS/CSRF origin-ы через `PAYLOAD_ALLOWED_ORIGINS` (через запятую).

### 4. Запуск

```bash
docker compose up -d --build
```

Миграции применяются entrypoint-скриптом контейнера `app`, если включен `RUN_MIGRATIONS_ON_START=true`. Повторно применить миграции можно командой:

```bash
docker compose exec app npm run payload -- migrate
```

Seed:

```bash
docker compose exec app npm run seed
```

### 5. Первый администратор Payload

Откройте:

```text
https://xn--n1aagcfji.xn--p1ai/admin
```

Если коллекция пользователей пустая, Payload покажет форму создания первого администратора.

### 6. DNS

Создайте A-записи на новый домен ФОХСТОР:

```text
фохстор.рф          -> IP сервера
www.фохстор.рф       -> IP сервера
```

IDN-домен (ASCII/punycode-форма) для Nginx и всех технических настроек:

```text
фохстор.рф = xn--n1aagcfji.xn--p1ai
```

> **Важно:** миграция кода на новый бренд/домен подготовлена (Nginx-шаблоны, ENV, CORS/CSRF), но DNS ещё не переключён и сертификаты для нового домена ещё не выпущены. Активный `nginx/conf.d/foxapple.conf` продолжает обслуживать старый домен `foxapple.ru`, пока эти шаги не выполнены вручную.

### 7. SSL через Certbot / Let's Encrypt

Шаблоны для нового домена лежат в `nginx/examples/foxstore.conf` (HTTP-бутстрап + редиректы) и `nginx/examples/foxstore.ssl.conf` (полный SSL-конфиг) — они **не активны** и не подключены в `docker-compose.yml`. Каждый файл содержит подробные комментарии по активации. Общий порядок:

```bash
# 1. Скопировать HTTP-бутстрап конфиг для ACME-challenge нового домена
cp nginx/examples/foxstore.conf nginx/conf.d/foxstore.conf
docker compose restart nginx

# 2. Выпустить сертификат для нового домена
docker run --rm \
  -v foxapple_certbot_www:/var/www/certbot \
  -v foxapple_letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d xn--n1aagcfji.xn--p1ai \
  -d www.xn--n1aagcfji.xn--p1ai \
  --email admin@фохстор.рф \
  --agree-tos \
  --no-eff-email
```

После выпуска сертификата замените HTTP-бутстрап на полный SSL-конфиг:

```bash
cp nginx/examples/foxstore.ssl.conf nginx/conf.d/foxstore.conf
docker compose restart nginx
```

### 8. Редирект со старого домена `foxapple.ru`

`nginx/examples/foxstore.conf` и `nginx/examples/foxstore.ssl.conf` уже содержат 301-редиректы со старого домена (`foxapple.ru`, `www.foxapple.ru`, старый punycode `xn--j1achfjp0e.xn--p1ai`) на новый, с сохранением пути и query-параметров:

```nginx
server_name foxapple.ru www.foxapple.ru;
return 301 https://xn--n1aagcfji.xn--p1ai$request_uri;
```

Старый `nginx/conf.d/foxapple.conf` можно вывести из эксплуатации только после того, как новый домен полностью подтверждён рабочим (DNS, сертификат, редиректы протестированы).

## Проверка после деплоя

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 nginx
curl -I http://xn--n1aagcfji.xn--p1ai
curl -I http://foxapple.ru
```

Публичные URL:

| Путь | Описание |
|------|----------|
| `/` | Главная страница |
| `/catalog` | Каталог товаров |
| `/catalog/[categorySlug]` | Категория каталога |
| `/catalog/[categorySlug]/[productSlug]` | Карточка товара |
| `/contacts` | Контакты |
| `/installment` | Рассрочка |
| `/trade-in` | Trade-In |
| `/warranty` | Гарантия |
| `/repair` | Ремонт |
| `/offer` | Публичная оферта |
| `/privacy` | Политика конфиденциальности |
| `/privacy-policy` | Обработка персональных данных |
| `/personal-data-consent` | Согласие на обработку ПД |
| `/purchase-return` | Возврат товара |
| `/admin` | Админка Payload CMS |
