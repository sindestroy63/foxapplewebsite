# FOX APPLE

Production-ready проект сайта магазина техники Apple: Next.js, TypeScript, Payload CMS, PostgreSQL, Docker Compose и Nginx.

Сайт не содержит корзину и онлайн-оплату. Основные действия клиента: позвонить, написать в Telegram, уточнить наличие и забронировать товар.

## Локальный запуск

1. Скопируйте переменные окружения:

```bash
cp .env.example .env
```

2. Укажите сильные значения `POSTGRES_PASSWORD` и `PAYLOAD_SECRET`.

3. Запустите стек:

```bash
docker compose up -d
```

4. Откройте сайт:

```text
http://localhost
```

Админка Payload:

```text
http://localhost/admin
```

При первом входе Payload предложит создать первого администратора. Seed-данные категорий, страниц и демо-товаров применяются автоматически, если `PAYLOAD_SEED_ON_START=true`.

## Структура

```text
src/app/(frontend)        публичный сайт
src/app/(payload)         стандартные маршруты Payload CMS
src/payload/collections   коллекции CMS
src/payload/globals       глобальные настройки сайта
src/seed.ts               seed-данные категорий, страниц и товаров
nginx/conf.d              конфигурация Nginx
docker-compose.yml        app + postgres + nginx
```

## Основные CMS-модели

- `Categories`: категории каталога.
- `Products`: товары, цены, наличие, фото, SEO.
- `Leads`: заявки с карточек товара и страницы контактов.
- `Pages`: редактируемые страницы.
- `SiteSettings`: контакты, домены, hero-тексты и базовые настройки.
- `Media`: загрузка изображений.
- `Users`: сотрудники админки.

## Полезные команды

```bash
docker compose logs -f app
docker compose exec app npm run payload -- migrate
docker compose exec app npm run seed
docker compose exec app npm run typecheck
docker compose down
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

Для production:

```env
NEXT_PUBLIC_SITE_URL=https://foxapple.ru
PAYLOAD_PUBLIC_SERVER_URL=https://foxapple.ru
POSTGRES_PASSWORD=<strong-password>
PAYLOAD_SECRET=<long-random-secret>
RUN_MIGRATIONS_ON_START=true
PAYLOAD_SEED_ON_START=true
```

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
https://foxapple.ru/admin
```

Если коллекция пользователей пустая, Payload покажет форму создания первого администратора.

### 6. DNS

Создайте A-записи:

```text
foxapple.ru        -> IP сервера
www.foxapple.ru    -> IP сервера
фоксэпл.рф         -> IP сервера
```

IDN-домен для Nginx:

```text
фоксэпл.рф = xn--j1achfjp0e.xn--p1ai
```

### 7. SSL через Certbot / Let's Encrypt

HTTP-конфиг уже содержит `/.well-known/acme-challenge/`. Выпустите сертификат:

```bash
docker run --rm \
  -v foxapple_certbot_www:/var/www/certbot \
  -v foxapple_letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d foxapple.ru \
  -d www.foxapple.ru \
  -d xn--j1achfjp0e.xn--p1ai \
  --email admin@foxapple.ru \
  --agree-tos \
  --no-eff-email
```

После выпуска сертификата замените HTTP-конфиг на SSL-пример:

```bash
cp nginx/examples/foxapple.ssl.conf nginx/conf.d/foxapple.conf
docker compose restart nginx
```

### 8. Редирект с `фоксэпл.рф`

В `nginx/conf.d/foxapple.conf` уже настроен редирект:

```nginx
server_name xn--j1achfjp0e.xn--p1ai;
return 301 https://foxapple.ru$request_uri;
```

После включения SSL пример-конфиг редиректит кириллический домен на `https://foxapple.ru`.

## Проверка после деплоя

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 nginx
curl -I http://foxapple.ru
curl -I http://xn--j1achfjp0e.xn--p1ai
```

Публичные URL:

- `/`
- `/catalog`
- `/catalog/[categorySlug]`
- `/catalog/[categorySlug]/[productSlug]`
- `/installment`
- `/trade-in`
- `/warranty`
- `/contacts`
- `/admin`
