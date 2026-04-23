# AI Task Manager

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Приложение для управления задачами с интеграцией искусственного интеллекта. Поддерживает голосовой ввод, распознавание изображений, генерацию SMART-целей и административную панель управления. Реализовано на React + TypeScript (клиентская часть) и FastAPI + Python (серверная часть).

## Возможности

### Искусственный интеллект

- **Голосовой ввод** — распознавание речи с автоматическим разбором на название, подзадачи, приоритет и срок выполнения
- **Распознавание изображений** — загрузка фотографий доски или скриншотов для извлечения задач через OCR
- **Анализ сложности** — оценка сложности задачи и подбор оптимальных временных рамок
- **Предсказание времени** — прогнозирование трудозатрат на основе истории выполнения
- **Оценка рисков дедлайнов** — выявление задач в зоне риска срыва сроков
- **SMART-цели** — генерация критериев по методологии SMART (конкретность, измеримость, достижимость, релевантность, ограниченность по времени)
- **Поиск заблокированных задач** — автоматическое обнаружение задач без прогресса с предложением решений
- **Анализ паттернов** — изучение истории задач и формирование персональных рекомендаций
- **Семантический поиск** — поиск задач по смыслу без необходимости точного совпадения

<table>
  <tr>
    <td><img src="screenshots/02-screenshot.png" width="100%"/></td>
    <td><img src="screenshots/03-screenshot.png" width="100%"/></td>
    <td><img src="screenshots/05-screenshot.png" width="100%"/></td>
  </tr>
  <tr>
    <td align="center">Риск дедлайнов и предложения задач</td>
    <td align="center">Паттерны, советы коуча и недельный отчёт</td>
    <td align="center">SMART-цель и подзадачи в карточке задачи</td>
  </tr>
</table>

### Аутентификация и безопасность

- **Регистрация по номеру телефона** — верификация через SMS-код
- **JWT-аутентификация** — раздельные access и refresh токены
- **Двухфакторная аутентификация (2FA)** — TOTP с кодами восстановления, совместимо с Google Authenticator и Authy
- **Хранение паролей** — хеширование с использованием bcrypt и соли
- **Управление сессиями** — автоматическое обновление токенов и принудительный выход при несанкционированном доступе

### Управление задачами

- **Представления** — список, канбан-доска, календарь, статистика
- **Приоритеты** — четыре уровня: низкий, средний, высокий, срочный
- **Статусы** — к выполнению, в процессе, выполнено, архив
- **Подзадачи** — декомпозиция задач с отдельным отслеживанием прогресса
- **Теги и категории** — произвольная классификация задач
- **Сроки выполнения** — установка дедлайнов с предупреждениями о приближении
- **Перетаскивание** — изменение порядка задач и перемещение между колонками канбана
- **Учёт времени** — сравнение фактических трудозатрат с оценочными

<table>
  <tr>
    <td><img src="screenshots/11-screenshot.png" width="100%"/></td>
    <td><img src="screenshots/06-screenshot.png" width="100%"/></td>
    <td><img src="screenshots/07-screenshot.png" width="100%"/></td>
  </tr>
  <tr>
    <td align="center">Список задач с приоритетами</td>
    <td align="center">Канбан-доска</td>
    <td align="center">Календарь с дедлайнами</td>
  </tr>
</table>

### Геймификация

- **Бейджи достижений** — награды за выполнение вех: серии дней, количество задач и другие
- **Ежедневные испытания** — задания, генерируемые на основе AI, с системой вознаграждений
- **Система очков** — начисление за завершение задач и получение достижений
- **Стрики активности** — отслеживание непрерывных серий продуктивных дней

<table>
  <tr>
    <td><img src="screenshots/04-screenshot.png" width="100%"/></td>
  </tr>
</table>

### Административная панель

- **Управление пользователями** — просмотр всех учётных записей с детальной статистикой
- **Поиск и фильтрация** — поиск по номеру телефона, фильтрация по статусу подписки
- **Управление подпиской** — выдача и отзыв премиум-доступа
- **Сброс пароля** — принудительная смена пароля пользователя
- **Управление 2FA** — отключение двухфакторной аутентификации при потере доступа
- **Статистика системы** — метрики в реальном времени: пользователи, задачи, запросы к AI

<table>
  <tr>
    <td><img src="screenshots/10-screenshot.png" width="100%"/></td>
  </tr>
  <tr>
    <td align="center">Административная панель — статистика и список пользователей</td>
  </tr>
</table>

### Многоязычность

- **Поддерживаемые языки** — английский, русский, испанский
- **Динамическое переключение** — смена языка интерфейса без перезагрузки страницы
- **Готовность к RTL** — архитектура поддерживает языки с письмом справа налево
- **Локализация AI-ответов** — ответы генерируются на языке, выбранном пользователем

### Progressive Web App

- **Работа без интернета** — кеширование данных с автоматической синхронизацией при восстановлении соединения
- **Установка на устройство** — добавление на домашний экран iOS и Android
- **Фоновая синхронизация** — обработка отложенных операций через Service Worker
- **Push-уведомления** — напоминания о приближающихся дедлайнах

### Интерфейс

- **Тёмная тема** — поддержка тёмного режима с определением системных предпочтений
- **Адаптивная вёрстка** — корректное отображение на устройствах любого форм-фактора
- **Плотность отображения** — настройка количества элементов на экране
- **Доступность** — соответствие стандарту WCAG 2.1 AA, навигация с клавиатуры

<table>
  <tr>
    <td><img src="screenshots/09-screenshot.png" width="100%"/></td>
    <td><img src="screenshots/12-screenshot.png" width="100%"/></td>
    <td><img src="screenshots/08-screenshot.png" width="100%"/></td>
    <td><img src="screenshots/01-screenshot.jpg" width="100%"/></td>
  </tr>
  <tr>
    <td align="center">Задача с подзадачами и AI-кнопками</td>
    <td align="center">Настройки интерфейса</td>
    <td align="center">Настройки безопасности (email, 2FA)</td>
    <td align="center">Мобильная версия</td>
  </tr>
</table>

## Технологический стек

### Клиентская часть
| Технология | Назначение |
|---|---|
| React 18 | UI-фреймворк |
| TypeScript | Статическая типизация |
| Vite | Сборка и разработка |
| Tailwind CSS | Стилизация |
| Zustand | Управление состоянием |
| TanStack Query | Серверное состояние и кеш |
| React Router | Маршрутизация |
| Web Speech API | Голосовой ввод |
| Service Workers | Офлайн-режим и PWA |

### Серверная часть
| Технология | Назначение |
|---|---|
| Python 3.12 | Серверная среда выполнения |
| FastAPI | Веб-фреймворк |
| SQLAlchemy 2.0 | ORM |
| Pydantic v2 | Валидация данных |
| PostgreSQL 14+ | Реляционная база данных |
| Alembic | Миграции схемы БД |
| Puter.com API | Доступ к AI (gpt-4o-mini) |
| PyJWT | Работа с JWT-токенами |
| pyotp | TOTP для двухфакторной аутентификации |

## Установка и запуск

### Системные требования

- Python 3.12+
- Node.js 18+ и npm
- PostgreSQL 14+
- Учётная запись на Puter.com для получения API-ключа

### 1. Создание баз данных

```bash
createdb ai_task_manager
createdb ai_task_manager_test
```

### 2. Настройка серверной части

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Создать файл `.env` в директории `backend/`:

```env
# База данных
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_task_manager?schema=public"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_task_manager_test?schema=public"

# JWT (генерация: openssl rand -hex 32)
JWT_ACCESS_SECRET="сгенерированный_секрет"
JWT_REFRESH_SECRET="сгенерированный_секрет"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="30d"

# Puter AI API
PUTER_API_KEY="api_ключ_из_puter.com"
PUTER_MODEL="gpt-4o-mini"

# Лимиты
AI_DAILY_LIMIT=8

# Учётная запись администратора
ADMIN_PHONE="1111111111"
ADMIN_PASSWORD="надёжный_пароль"

# Сервер
PORT=5000
APP_ENV="development"
```

### 3. Применение миграций

```bash
cd backend
.venv/bin/alembic upgrade head
```

### 4. Запуск сервера

```bash
.venv/bin/uvicorn app.main:app --reload --port 5000
```

### 5. Настройка клиентской части

```bash
cd frontend
npm install
```

Создать файл `.env` в директории `frontend/`:

```env
VITE_API_URL="http://localhost:5000/api"
```

### 6. Запуск клиентской части

```bash
npm run dev
```

Клиентская часть: **http://localhost:5173**  
API сервера: **http://localhost:5000/api**

## Docker

```bash
export JWT_ACCESS_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
export PUTER_API_KEY="api_ключ"

docker compose up --build
```

| Сервис | Адрес |
|---|---|
| Клиентская часть | http://localhost:8080 |
| API сервера | http://localhost:5000/api |
| PostgreSQL | localhost:5432 |

Учётные данные PostgreSQL по умолчанию: `taskai` / `taskai`

## API

Все защищённые endpoints требуют заголовок `Authorization: Bearer <accessToken>`.

### Аутентификация

```
POST   /api/auth/register           Регистрация
POST   /api/auth/verify-sms         Подтверждение SMS-кода
POST   /api/auth/resend-sms         Повторная отправка кода
POST   /api/auth/login              Вход в систему
POST   /api/auth/refresh            Обновление токена
GET    /api/auth/me                 Данные текущего пользователя
POST   /api/auth/enable-2fa         Включение 2FA
POST   /api/auth/verify-2fa         Проверка TOTP-кода
POST   /api/auth/disable-2fa        Отключение 2FA
```

### Задачи

```
GET    /api/tasks                   Список задач с фильтрами
POST   /api/tasks                   Создание задачи
GET    /api/tasks/:id               Получение задачи
PUT    /api/tasks/:id               Обновление задачи
DELETE /api/tasks/:id               Удаление задачи
POST   /api/tasks/reorder           Изменение порядка задач
POST   /api/tasks/:id/subtasks      Создание подзадачи
PUT    /api/subtasks/:id            Обновление подзадачи
DELETE /api/subtasks/:id            Удаление подзадачи
```

### Искусственный интеллект

```
POST   /api/ai/parse-voice          Разбор голосового ввода
POST   /api/ai/check-complexity     Анализ сложности задачи
POST   /api/ai/suggest-tasks        Предложения новых задач
POST   /api/ai/predict-time         Прогноз трудозатрат
POST   /api/ai/deadline-risk        Оценка рисков дедлайнов
POST   /api/ai/stuck-tasks          Поиск заблокированных задач
POST   /api/ai/ocr                  Извлечение задач из изображения
POST   /api/ai/smart-goal           Генерация SMART-критериев
POST   /api/ai/patterns             Анализ паттернов активности
POST   /api/ai/coach-insights       Персональные рекомендации
```

### Администрирование

```
POST   /api/admin/login             Вход в административную панель
GET    /api/admin/stats             Статистика системы
GET    /api/admin/users             Список пользователей
PUT    /api/admin/users/:id/premium         Управление подпиской
PUT    /api/admin/users/:id/password        Сброс пароля
POST   /api/admin/users/:id/disable-2fa    Отключение 2FA
DELETE /api/admin/users/:id                Удаление пользователя
```

### Настройки пользователя

```
GET    /api/users/preferences       Получение настроек
PUT    /api/users/preferences       Обновление настроек
GET    /api/users/statistics        Статистика пользователя
```

## Конфигурация

### Серверная часть

| Переменная | Описание | Обязательна |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | Да |
| `TEST_DATABASE_URL` | База данных для тестов | Да |
| `JWT_ACCESS_SECRET` | Секрет подписи access-токенов | Да |
| `JWT_REFRESH_SECRET` | Секрет подписи refresh-токенов | Да |
| `JWT_ACCESS_TTL` | Срок жизни access-токена | `15m` |
| `JWT_REFRESH_TTL` | Срок жизни refresh-токена | `30d` |
| `PUTER_API_KEY` | Ключ Puter AI API | Да |
| `PUTER_MODEL` | Модель AI | `gpt-4o-mini` |
| `AI_DAILY_LIMIT` | Дневной лимит запросов к AI | `8` |
| `ADMIN_PHONE` | Телефон администратора | Да |
| `ADMIN_PASSWORD` | Пароль администратора | Да |
| `PORT` | Порт сервера | `5000` |
| `APP_ENV` | Режим работы | `development` |

### Клиентская часть

| Переменная | Описание | По умолчанию |
|---|---|---|
| `VITE_API_URL` | Базовый URL API | `http://localhost:5000/api` |

## Тестирование

### Серверная часть

```bash
cd backend
.venv/bin/pytest                      # Все тесты
.venv/bin/pytest -v                   # Подробный вывод
.venv/bin/pytest tests/test_auth.py   # Отдельный файл
.venv/bin/pytest -k test_login        # Тесты по шаблону имени
```

### Клиентская часть

```bash
cd frontend
npm test                  # Все тесты
npm test -- --watch       # Режим наблюдения
npm test -- --coverage    # Отчёт о покрытии кода
```

## Структура проекта

```
ai_task_manager/
├── backend/
│   ├── alembic/                    Миграции базы данных
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py             Аутентификация
│   │   │   ├── tasks.py            Управление задачами
│   │   │   ├── ai.py               AI-функции
│   │   │   └── admin.py            Администрирование
│   │   ├── services/
│   │   │   ├── ai.py               Логика AI-сервиса
│   │   │   └── cache.py            Кеширование ответов
│   │   ├── models.py               Модели SQLAlchemy
│   │   ├── schemas.py              Схемы Pydantic
│   │   ├── db.py                   Сессия базы данных
│   │   ├── security.py             Утилиты безопасности
│   │   ├── deps.py                 Dependency injection
│   │   ├── config.py               Конфигурация
│   │   └── main.py                 Точка входа FastAPI
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                    HTTP-клиент и типизированные запросы
│   │   ├── components/             React-компоненты
│   │   ├── pages/                  Страницы приложения
│   │   ├── store/                  Zustand-хранилища
│   │   ├── utils/                  Вспомогательные утилиты
│   │   ├── i18n.ts                 Интернационализация
│   │   ├── App.tsx                 Корневой компонент
│   │   └── main.tsx                Точка входа
│   ├── tests/
│   ├── public/
│   │   ├── manifest.json           PWA-манифест
│   │   └── service-worker.js       Service Worker
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── package.json
```

## Безопасность

- Хеширование паролей bcrypt с солью
- Раздельные JWT-токены для доступа и обновления сессии
- TOTP-совместимая двухфакторная аутентификация
- Параметризованные SQL-запросы через SQLAlchemy ORM
- SameSite cookie и валидация токенов против CSRF
- Ежедневный лимит запросов к AI на уровне пользователя
- Отдельный тип JWT-токена для административных операций

## Развёртывание в production

### Требования

- PostgreSQL 14+ (рекомендуется managed-решение)
- Python 3.12+
- Node.js 18+
- TLS-сертификат (рекомендуется Let's Encrypt)
- API-ключ Puter.com

### Чеклист

1. Сгенерировать JWT-секреты:
```bash
openssl rand -hex 32  # JWT_ACCESS_SECRET
openssl rand -hex 32  # JWT_REFRESH_SECRET
```

2. Установить `APP_ENV=production` в конфигурации сервера

3. Передавать секреты через переменные окружения, не через `.env`-файлы

4. Настроить CORS для используемого домена

## Участие в разработке

Pull Request'ы приветствуются.

1. Форк репозитория
2. Создание ветки: `git checkout -b feature/название-функции`
3. Коммит изменений: `git commit -m 'feat: описание изменения'`
4. Отправка ветки: `git push origin feature/название-функции`
5. Открытие Pull Request с описанием изменений

**Рекомендации:**
- Серверная часть: соблюдать PEP 8, сопровождать новые endpoints тестами
- Клиентская часть: использовать TypeScript, придерживаться существующих паттернов, покрывать тестами Vitest
- Коммиты: следовать формату Conventional Commits
- Документация: обновлять README при добавлении новых возможностей

## Решение проблем

**Сервер не запускается**
- Проверить доступность PostgreSQL: `pg_isready -h localhost`
- Убедиться в наличии `.env` с корректным `DATABASE_URL`
- Проверить статус миграций: `.venv/bin/alembic current`
- Убедиться, что порт 5000 свободен: `lsof -i :5000`

**Клиентская часть не подключается к API**
- Убедиться, что сервер запущен на порту 5000
- Проверить значение `VITE_API_URL` в `.env` клиентской части
- Проверить консоль браузера на наличие CORS-ошибок

**Двухфакторная аутентификация не работает**
- Проверить синхронизацию времени на сервере и мобильном устройстве
- Использовать официальные TOTP-приложения (Google Authenticator, Authy)

**AI-функции возвращают ошибку 429**
- Проверить корректность `PUTER_API_KEY`
- Убедиться, что пользователь не превысил дневной лимит запросов
- Проверить баланс в личном кабинете Puter.com

## Лицензия

Распространяется под лицензией MIT. Подробности — в файле [LICENSE](LICENSE).

## Использованные технологии

- [Puter.com](https://puter.com/) — бесплатный доступ к AI API
- [FastAPI](https://fastapi.tiangolo.com/) — серверный фреймворк
- [React](https://react.dev/) — клиентская библиотека
- [Tailwind CSS](https://tailwindcss.com/) — утилитарный CSS-фреймворк
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM для Python
