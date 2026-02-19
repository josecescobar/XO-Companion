# XO Companion — Deployment Guide

## Architecture

- **API**: NestJS (Node 20) — deployed to Railway
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache/Queue**: Redis 7 (BullMQ job queues)
- **Mobile**: React Native (Expo) — connects to API via HTTPS

## Railway Setup

### 1. Create Services

In your Railway project, provision:

1. **PostgreSQL** — Use the pgvector template or enable the `vector` extension after creation
2. **Redis** — Standard Redis service
3. **API** — Deploy from GitHub repo

### 2. Configure API Service

Set the **Root Directory** to the project root (not `packages/api`), since the Dockerfile references the monorepo workspace structure.

The `railway.toml` at `packages/api/railway.toml` configures:
- Dockerfile path: `packages/api/Dockerfile`
- Health check: `GET /api/v1/health`
- Restart policy: on failure, max 3 retries

### 3. Database Setup

After PostgreSQL is provisioned, enable required extensions:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
```

If using Railway's pgvector template, these are pre-enabled.

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Railway auto-sets from linked DB) | `postgresql://user:pass@host:5432/railway` |
| `REDIS_URL` | Redis connection string (Railway auto-sets from linked Redis) | `redis://default:pass@host:6379` |
| `JWT_ACCESS_SECRET` | Random 32+ char string for signing access tokens | `generate-a-random-string-here-32chars` |
| `JWT_REFRESH_SECRET` | Random 32+ char string for signing refresh tokens | `generate-a-different-random-string` |
| `ASSEMBLYAI_API_KEY` | AssemblyAI API key for voice transcription | `sk_...` |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude LLM extraction | `sk-ant-...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (Railway sets this automatically) | `3000` |
| `API_PREFIX` | API route prefix | `/api/v1` |
| `CORS_ORIGIN` | Allowed origins (comma-separated, or `*` for all) | `*` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings (RAG). Graceful fallback if missing. | — |
| `GROQ_API_KEY` | Groq API key for fallback LLM | — |
| `AI_PRIMARY_MODEL` | Primary LLM model for extraction | `claude-sonnet-4-20250514` |
| `AI_FALLBACK_MODEL` | Fallback LLM model | `gpt-4o-mini` |
| `AI_CONFIDENCE_THRESHOLD` | Minimum confidence for auto-approval | `0.85` |
| `JWT_ACCESS_EXPIRATION` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL | `7d` |
| `UPLOAD_DIR` | Directory for uploaded audio files | `./uploads` |
| `MAX_AUDIO_FILE_SIZE` | Max audio upload size in bytes | `52428800` (50MB) |
| `POWERSYNC_URL` | PowerSync instance URL (offline sync) | — |
| `POWERSYNC_PRIVATE_KEY` | PowerSync signing key (falls back to JWT_ACCESS_SECRET) | — |
| `REDIS_HOST` | Redis host (used if REDIS_URL not set) | `localhost` |
| `REDIS_PORT` | Redis port (used if REDIS_URL not set) | `6379` |

### Railway Auto-Injected

Railway automatically provides these when you link services:
- `DATABASE_URL` — from linked PostgreSQL
- `REDIS_URL` — from linked Redis
- `PORT` — assigned by Railway

You only need to manually set: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`, and `CORS_ORIGIN`.

## Startup Process

The `start.sh` script runs on container start:

1. `npx prisma migrate deploy` — applies any pending database migrations
2. `node dist/main` — starts the NestJS server

## Health Check

`GET /api/v1/health` returns `200 OK` when the server is ready.

## Seeding (Optional)

To seed the database with test users after first deploy, run in Railway's shell:

```bash
cd packages/api && npx tsx prisma/seed.ts
```

This creates:
- Admin: `admin@realelite.com` / `password123`
- Foreman: `foreman@realelite.com` / `password123`

**Change these passwords immediately in production.**

## Mobile App Configuration

Update the mobile app's `.env` to point to the Railway API URL:

```
EXPO_PUBLIC_API_URL=https://your-railway-app.railway.app/api/v1
```

## Notes

- PostgreSQL must have `pgcrypto` and `vector` extensions enabled
- Audio uploads are stored on the local filesystem (`./uploads`). For production persistence, consider linking a Railway volume or using cloud storage.
- The `CORS_ORIGIN=*` setting is temporary for development. Lock it down to your mobile app's domain before launch.
