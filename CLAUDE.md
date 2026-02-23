# CLAUDE.md — XO Companion

Voice-first AI operations assistant for small construction contractors (5–50 employees). NestJS monorepo with React Native mobile client. The founder is a licensed contractor dogfooding this through Real Elite Contracting.

## Architecture

```
packages/
  api/          NestJS 11 backend (8 modules, Prisma 7, BullMQ)
  shared/       Shared enums, types, Zod schemas
  mobile/       React Native (Expo SDK) mobile app
```

### Backend Modules (packages/api/src/modules/)

| Module | Purpose |
|--------|---------|
| auth | JWT + refresh rotation, RBAC (6 construction roles), Passport |
| voice | Upload → AssemblyAI STT → transcript storage, BullMQ jobs |
| ai | Claude Sonnet 4 via Vercel AI SDK, Zod structured extraction |
| daily-log | Core data model — weather, workforce, equipment, work, safety, delays |
| compliance | OSHA 300/300A/301, training records, license tracking |
| communications | Ghost PM — auto-draft emails/RFIs from voice notes |
| memory | pgvector RAG, document chunking, time-weighted retrieval |
| analytics | Predictive risk, delay patterns, safety scoring |

Additional: notifications (push via Expo), inspections (AI vision), tasks, media/documents.

### AI Pipeline

```
Field audio → AssemblyAI STT → raw transcript → Claude Sonnet 4 + Zod schema
→ structured data (with aiConfidence score) → HITL review → Prisma → PostgreSQL
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript strict
- **Backend**: NestJS 11, Prisma 7, PostgreSQL 16 + pgvector
- **Queue**: BullMQ + Redis 7
- **Auth**: JWT (15-min access / 7-day refresh rotation), @nestjs/passport
- **AI**: Vercel AI SDK v6, Claude Sonnet 4 (analysis), GPT-4o-mini (high-volume extraction)
- **STT**: AssemblyAI (primary), custom construction vocab
- **Embeddings**: OpenAI text-embedding-3-small
- **Mobile**: React Native, Expo SDK, expo-router
- **Offline**: PowerSync (PostgreSQL → client SQLite) — planned
- **Validation**: Zod everywhere (API DTOs, LLM output, config)
- **Package manager**: pnpm 9+

## Commands

```bash
# Development (run from repo root)
pnpm install                        # Install all workspace deps
pnpm dev                            # Start API (http://localhost:3000/api/v1)
pnpm db:migrate                     # Run Prisma migrations
pnpm db:seed                        # Seed demo data (password123 for all users)
pnpm db:generate                    # Regenerate Prisma client

# Mobile (run from repo root)
pnpm mobile                         # Start Expo dev server
pnpm mobile:ios                     # iOS simulator
pnpm mobile:android                 # Android emulator

# Testing
pnpm test                           # Run all tests
cd packages/api && bash test/run-all.sh   # E2E bash/curl test suite
cd packages/api && bash test/smoke.sh     # Quick API smoke test

# Lint & Build
pnpm lint                           # Lint all packages
pnpm build                          # Production build
```

## Conventions

- **Use** TypeScript strict mode for all files. No `any`.
- **Use** Zod for all validation — API input, LLM output, config parsing.
- **Use** NestJS Logger service. Never `console.log` in production code.
- **Use** constructor injection for all NestJS services.
- **Use** conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Keep** business logic in services, not controllers. Controllers handle HTTP only.
- **Scope** every DB query to user's assigned projects via Prisma middleware.
- **Include** `aiGenerated`, `aiConfidence`, and `status` fields on all AI-produced data.
- **Status flow**: `draft → pending_review → approved → amended`. AI outputs are always drafts.
- **Confidence tiers**: green >85%, yellow 60–85%, red <60%.
- **Store** all monetary values as integers (cents).
- **Use** UUIDs for all primary keys.

## Prohibited

- **Never** use `console.log` — use NestJS `Logger` instead.
- **Never** put business logic in controllers — use services.
- **Never** import directly between modules — use shared package or module exports.
- **Never** skip HITL review — all AI outputs must be human-approved before commit.
- **Never** store secrets in code — use environment variables exclusively.
- **Never** use `moment.js` — use `date-fns` instead.
- **Never** make direct Prisma calls from controllers — always go through services.
- **Never** modify migration files after they've been applied.

## RBAC Roles

```
SUPER_ADMIN → full access
PROJECT_MANAGER → project-scoped CRUD, approve AI outputs, manage team
SUPERINTENDENT → daily logs, workforce, scheduling within assigned projects
FOREMAN → create voice entries, submit daily logs for review
SAFETY_OFFICER → compliance, inspections, incident reports
FIELD_WORKER → voice notes, view own project data, basic entries
```

## Seed Data

All users: `password123` | Base URL: `http://localhost:3000/api/v1` | Swagger: `/docs`

| Email | Role |
|-------|------|
| admin@realelite.com | SUPER_ADMIN |
| pm@realelite.com | PROJECT_MANAGER |
| super@realelite.com | SUPERINTENDENT |
| foreman@realelite.com | FOREMAN |
| safety@realelite.com | SAFETY_OFFICER |
| worker@realelite.com | FIELD_WORKER |

Projects: **Riverside Medical Center** (5 members, 2 logs) and **Downtown Loft Conversion** (2 members).

## Construction Domain

Know these terms — don't over-explain them:
- **CMU**: Concrete masonry unit (cinder block)
- **SOG**: Slab on grade
- **T&M**: Time and materials (billing method)
- **RFI**: Request for information
- **CO**: Change order
- **CSI MasterFormat**: Standard classification for work items (divisions 01–49)
- **Punchlist**: Pre-completion deficiency list
- **Roughing in**: First-fix MEP installation before walls close

## Progressive Disclosure

Read these docs only when working in the relevant area:

| When working on… | Read |
|---|---|
| Deployment or Railway config | `DEPLOYMENT.md` |
| Database schema changes | `packages/api/prisma/schema.prisma` |
| E2E test patterns | `packages/api/test/smoke.sh` (template for all test scripts) |
| Mobile app structure | `packages/mobile/app.json` and `packages/mobile/src/` |
| Notification routing | `packages/mobile/src/hooks/useNotifications.ts` |
| Environment variables | `packages/api/.env.example` and `DEPLOYMENT.md` |

## Workflow: Adding a New API Endpoint

1. Plan the endpoint (method, path, request/response shapes)
2. Confirm plan with user before implementing
3. Create/update Zod schemas in the module's `dto/` directory
4. Implement service method with business logic
5. Add controller route with guards and decorators
6. Register in module if new provider
7. Add Swagger decorators (`@ApiOperation`, `@ApiResponse`, etc.)
8. Write or update the relevant bash test in `packages/api/test/`
9. Run `bash test/smoke.sh` to verify nothing broke

## Workflow: Adding an AI-Processed Feature

1. Define the Zod output schema (what structured data do we need?)
2. Build the prompt template with construction domain context
3. Use Vercel AI SDK `generateObject()` with the Zod schema
4. Store result with `aiGenerated: true`, `aiConfidence`, `status: 'draft'`
5. Create HITL review endpoint (approve / reject with reason / amend)
6. Only committed data (status: approved) flows to reports and analytics

## Key Decisions Already Made

- AssemblyAI over Whisper for STT (better in noisy construction environments)
- Claude Sonnet 4 for complex extraction, GPT-4o-mini for high-volume classification
- PostgreSQL + pgvector over separate vector DB (single data plane)
- BullMQ over Bull for job queues (better TypeScript support)
- PowerSync for offline sync (PostgreSQL logical replication → client SQLite)
- Vercel AI SDK for provider-agnostic LLM integration
- pnpm workspaces over Turborepo/Nx (simpler, fewer moving parts)
