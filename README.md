# Task Management with AI

Full-stack task manager with a React frontend, Python API, PostgreSQL storage, and a Mistral-powered assistant for splitting, estimating, and prioritizing tasks.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind + Zustand + TanStack Query
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2 + Pydantic v2 + PostgreSQL
- **Migrations**: Alembic
- **AI**: Mistral API (`mistral-small-latest` by default)
- **Auth**: phone + password, SMS verification code in the dev console, JWT access + refresh
- **Tests**: pytest + FastAPI TestClient, Vitest + React Testing Library
- **Deploy**: Docker + docker compose

## Features

- Phone registration with SMS verification
- JWT auth with access + refresh tokens
- Tasks with status, priority, due date, tags, and ordering
- Subtasks with completion tracking, drag-to-reorder, and time estimates
- AI split, estimate, and prioritize actions
- List, Kanban, Calendar, Stats, and Settings views
- Responsive layout, dark mode, compact list mode
- AI response cache and daily per-user rate limit

## Quick Start

Requirements: Python 3.12+, npm for frontend tooling, PostgreSQL 14+, and a Mistral API key.

```bash
createdb ai_task_manager
createdb ai_task_manager_test

cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --port 5000
```

In another shell:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Docker

```bash
export MISTRAL_API_KEY=your_key_here
export JWT_ACCESS_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:5000
- Postgres: localhost:5432 (`taskai` / `taskai`)

## Tests

```bash
cd backend && .venv/bin/pytest
cd frontend && npm test
```

## Project Layout

```text
ai_task_manager/
├── backend/
│   ├── alembic/              Database migrations
│   ├── app/
│   │   ├── routers/          API routes
│   │   ├── services/         AI and SMS services
│   │   ├── config.py         Runtime settings
│   │   ├── db.py             SQLAlchemy session
│   │   ├── main.py           FastAPI app
│   │   └── models.py         SQLAlchemy models
│   ├── tests/                pytest tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/              Fetch client and typed endpoints
│   │   ├── components/       UI components
│   │   ├── pages/            App screens
│   │   ├── store/            Zustand stores
│   │   └── utils/
│   ├── tests/                Vitest tests
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── package.json
```

## API

All endpoints are under `/api`. Protected routes require `Authorization: Bearer <accessToken>`.

### Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ phone, password }` | Sends SMS code |
| POST | `/auth/verify-sms` | `{ phone, code }` | Returns tokens and user |
| POST | `/auth/resend-sms` | `{ phone }` | Rate-limited |
| POST | `/auth/login` | `{ phone, password }` | Phone must be verified |
| POST | `/auth/refresh` | `{ refreshToken }` | New access token |
| GET | `/auth/me` | - | Current user |

### Tasks

| Method | Path | Notes |
|---|---|---|
| GET | `/tasks?status=...` | List user tasks |
| POST | `/tasks` | Create |
| GET | `/tasks/:id` | One task |
| PUT | `/tasks/:id` | Update |
| DELETE | `/tasks/:id` | Delete |
| POST | `/tasks/reorder` | Body `{ order: [taskId, ...] }` |

### Subtasks

| Method | Path | Notes |
|---|---|---|
| POST | `/tasks/:id/subtasks` | Add |
| PUT | `/subtasks/:id` | Update or move |
| DELETE | `/subtasks/:id` | Delete |

### AI

| Method | Path | Notes |
|---|---|---|
| POST | `/ai/split` | `{ taskId, apply? }` |
| POST | `/ai/estimate` | `{ taskId }` |
| POST | `/ai/prioritize` | Returns ordered task IDs |

## Configuration

See `.env.example`.

- `DATABASE_URL`
- `TEST_DATABASE_URL`
- `APP_ENV`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `MISTRAL_API_KEY`
- `MISTRAL_MODEL`
- `AI_DAILY_LIMIT`
- `SMS_PROVIDER`

## License

MIT
