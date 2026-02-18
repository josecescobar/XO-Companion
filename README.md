# XO Companion

Voice-powered AI daily log assistant for small construction contractors (5-50 employees). Upload a voice memo from the jobsite, and XO transcribes it, extracts structured daily log data using AI, and presents it for human review before committing to the project record.

## Architecture

```
packages/
  api/          NestJS 11 backend (Prisma, BullMQ, Passport)
  shared/       Shared enums and types
```

**Stack:** Node.js, NestJS 11, Prisma 7, PostgreSQL 16, BullMQ + Redis 7, Zod

**AI Pipeline:** AssemblyAI (speech-to-text) → Claude Sonnet 4 via Vercel AI SDK (structured extraction) → Human-in-the-loop review

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16
- Redis 7

**Option A — Docker:**

```bash
docker compose up -d
```

**Option B — Homebrew (macOS):**

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
createuser -s xo_user
createdb -O xo_user xo_companion
psql -d xo_companion -c "ALTER USER xo_user PASSWORD 'xo_local_password';"
psql -d xo_companion -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and configure
cp packages/api/.env.example packages/api/.env

# Run database migrations
pnpm db:migrate

# Seed demo data
pnpm db:seed

# Start development server
pnpm dev
```

The API runs at `http://localhost:3000/api/v1` with Swagger docs at `http://localhost:3000/docs`.

### Seed Data

All users have password `password123`:

| Email | Role |
|-------|------|
| admin@realelite.com | SUPER_ADMIN |
| pm@realelite.com | PROJECT_MANAGER |
| super@realelite.com | SUPERINTENDENT |
| foreman@realelite.com | FOREMAN |
| safety@realelite.com | SAFETY_OFFICER |
| worker@realelite.com | FIELD_WORKER |

Two projects seeded: **Riverside Medical Center** (5 members, 2 daily logs) and **Downtown Loft Conversion** (2 members).

## API Endpoints (54 total)

### Auth `/auth`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/register` | Register user (SUPER_ADMIN only) |
| POST | `/login` | Login, returns JWT + httpOnly refresh cookie |
| POST | `/refresh` | Rotate refresh token |
| POST | `/logout` | Revoke token family, clear cookie |
| GET | `/me` | Current user profile |

### Users `/users`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | List org users |
| GET | `/:id` | Get user |
| PATCH | `/:id` | Update user |
| DELETE | `/:id` | Deactivate user |

### Projects `/projects`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/` | Create project |
| GET | `/` | List user's projects |
| GET | `/:id` | Get project |
| PATCH | `/:id` | Update project |
| POST | `/:id/members` | Add member |
| DELETE | `/:id/members/:userId` | Remove member |
| GET | `/:id/members` | List members |

### Daily Logs `/projects/:projectId/daily-logs`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/` | Create log (one per project per day) |
| GET | `/` | List logs (filter by status, date range) |
| GET | `/:id` | Get log with all sub-entries |
| PATCH | `/:id` | Update log notes |
| DELETE | `/:id` | Delete draft log |
| POST | `/:id/submit` | Submit for review |
| POST | `/:id/approve` | Approve log |
| POST | `/:id/amend` | Amend approved log |
| POST | `/:id/sign` | Add signature |
| PUT | `/:id/weather` | Upsert weather |
| PUT | `/:id/safety` | Upsert safety |
| POST | `/:id/workforce` | Add workforce entry |
| PATCH | `/:id/workforce/:entryId` | Update workforce entry |
| DELETE | `/:id/workforce/:entryId` | Delete workforce entry |
| POST | `/:id/equipment` | Add equipment entry |
| PATCH | `/:id/equipment/:entryId` | Update equipment entry |
| DELETE | `/:id/equipment/:entryId` | Delete equipment entry |
| POST | `/:id/work-completed` | Add work completed entry |
| PATCH | `/:id/work-completed/:entryId` | Update work completed entry |
| DELETE | `/:id/work-completed/:entryId` | Delete work completed entry |
| POST | `/:id/materials` | Add material entry |
| PATCH | `/:id/materials/:entryId` | Update material entry |
| DELETE | `/:id/materials/:entryId` | Delete material entry |
| POST | `/:id/delays` | Add delay entry |
| PATCH | `/:id/delays/:entryId` | Update delay entry |
| DELETE | `/:id/delays/:entryId` | Delete delay entry |

### Voice `/projects/:projectId/daily-logs/:logId/voice`

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/upload` | Upload audio (multipart, max 50MB) |
| GET | `/` | List voice notes for log |
| GET | `/:id` | Get voice note details |
| GET | `/:id/extracted` | Get AI-extracted structured data |
| POST | `/:id/apply` | Apply extracted data to daily log |
| POST | `/:id/reprocess` | Re-run AI extraction |

### Reviews `/projects/:projectId/daily-logs/:logId/reviews`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pending` | AI entries below confidence threshold |
| POST | `/` | Submit review (APPROVED / REJECTED / MODIFIED) |
| GET | `/` | Audit trail for log |
| GET | `/projects/:projectId/reviews/stats` | Accuracy stats per project |

### Health `/health`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Liveness check |
| GET | `/ready` | Readiness check (DB connectivity) |

## Voice Processing Pipeline

```
Upload audio → BullMQ job queued → AssemblyAI transcription
    → Claude Sonnet 4 structured extraction (Zod schema)
    → Extracted data stored on VoiceNote
    → Human reviews entries below 0.85 confidence
    → Approved data applied to daily log
```

The extraction uses a construction-specific system prompt with trade jargon mappings and CSI MasterFormat codes. Each extracted field carries an `aiConfidence` score. The HITL review system surfaces entries below the configurable threshold (default 0.85) for human approval, modification, or rejection — with full audit trail.

## Data Model

16 models across core entities, daily log sub-entries, and voice/review:

- **Core:** Organization, User, RefreshToken, Project, ProjectMember
- **Daily Log:** DailyLog, WeatherEntry, WorkforceEntry, EquipmentEntry, WorkCompletedEntry, MaterialEntry, SafetyEntry, DelayEntry, Signature
- **Voice/Review:** VoiceNote, ReviewEntry

**Daily Log Status Workflow:**

```
DRAFT → PENDING_REVIEW → APPROVED
                ↑              ↓
                └── AMENDED ←──┘
```

## RBAC Roles

| Role | Scope |
|------|-------|
| SUPER_ADMIN | Full access, bypasses project membership |
| PROJECT_MANAGER | Manage projects, members, approve logs |
| SUPERINTENDENT | Approve logs, manage daily operations |
| FOREMAN | Create/edit daily logs, manage field data |
| FIELD_WORKER | View projects, contribute to logs |
| OWNER_REP | Approve logs, view project data |
| SAFETY_OFFICER | Manage safety entries, view all data |

## Environment Variables

See [`packages/api/.env.example`](packages/api/.env.example) for all configuration options. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis for BullMQ job queue |
| `JWT_ACCESS_SECRET` | Secret for 15-min access tokens |
| `JWT_REFRESH_SECRET` | Secret for 7-day refresh tokens |
| `ASSEMBLYAI_API_KEY` | AssemblyAI speech-to-text |
| `ANTHROPIC_API_KEY` | Claude for structured extraction |
| `OPENAI_API_KEY` | GPT-4o-mini fallback |
| `AI_CONFIDENCE_THRESHOLD` | HITL review threshold (default 0.85) |

## Scripts

```bash
pnpm dev          # Start API in watch mode
pnpm build        # Build for production
pnpm db:generate  # Regenerate Prisma client
pnpm db:migrate   # Run pending migrations
pnpm db:seed      # Seed demo data
```
