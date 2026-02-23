# XO Companion — Full Codebase Review & Sync Verification

You are reviewing the XO Companion project (https://github.com/josecescobar/XO-Companion).
Clone or pull the latest `main` branch and verify everything described below is present,
correct, and consistent. Flag any discrepancies, missing pieces, or issues.

## Repository

GitHub: https://github.com/josecescobar/XO-Companion
Branch: main
Latest commit should be: `fix: add Express Request type augmentation and fix offline queue cleanup path`

---

## 1. Project Structure Verification

Confirm this structure exists:

```
packages/
  api/              NestJS 11 backend
  shared/           Shared enums, types, Zod schemas
  mobile/           React Native (Expo SDK) mobile app
```

**API backend should have 20 modules** in `packages/api/src/modules/`:
analytics, auth, communications, compliance, daily-logs, documents,
file-upload, health, inspections, media, memory, notifications, prisma,
projects, reports, review, sync, tasks, users, voice

**Common infrastructure** in `packages/api/src/common/` (8 files):
- `decorators/`: public.decorator.ts, roles.decorator.ts, current-user.decorator.ts
- `guards/`: jwt-auth.guard.ts, roles.guard.ts
- `interceptors/`: logging.interceptor.ts
- `filters/`: all-exceptions.filter.ts
- `types/`: express.d.ts

---

## 2. Global Error Handling & Logging (Priority #12)

### 2a. AllExceptionsFilter — `packages/api/src/common/filters/all-exceptions.filter.ts`

Verify:
- Uses `@Catch()` decorator (no argument = catches everything)
- Returns consistent JSON envelope: `{ statusCode, message, error, requestId, timestamp }`
- For 500s: logs full stack trace via Logger.error(), returns generic "Internal server error" (NO stack leak to client)
- For HttpExceptions: passes through status + message as-is
- Extracts requestId via typed `req.requestId` (no duck-typing) → x-request-id header → generates UUID
- Log levels: `warn` for 4xx, `error` for 5xx
- Handles NestJS validation pipe errors (array of messages joined with ', ')

### 2b. LoggingInterceptor — `packages/api/src/common/interceptors/logging.interceptor.ts`

Verify:
- Assigns `requestId` (from x-request-id header or crypto.randomUUID()) and attaches to `req.requestId`
- Logs on BOTH success (tap) AND error (catchError)
- Log format includes: requestId, method, url, statusCode, duration (ms), userId
- Logs request body for non-GET mutations at `debug` level, truncated to 500 chars
- Re-throws errors after logging (does NOT swallow them)
- Return type is `Observable<unknown>` (not `Observable<any>`)

### 2c. Express Type Augmentation — `packages/api/src/common/types/express.d.ts`

Verify:
- Extends `Express.Request` globally with `requestId: string` and `user?: { id: string; role: string }`
- Eliminates duck-type checks — filter and interceptor access `req.requestId` and `req.user` directly
- File exports empty object (`export {}`) to be treated as a module

### 2d. main.ts — `packages/api/src/main.ts`

Verify:
- `AllExceptionsFilter` is imported and registered via `app.useGlobalFilters()`
- Filter is registered BEFORE the interceptor
- `LoggingInterceptor` still registered via `app.useGlobalInterceptors()`
- Both are instantiated directly (not via DI container)

---

## 3. PowerSync Sync Alignment (Priority #1)

### 3a. Server sync rules — `packages/api/powersync/sync-rules.yaml`

Verify 15 tables are synced in the `org_data` bucket:
projects, daily_logs, workforce_entries, equipment_entries,
work_completed_entries, material_entries, safety_entries, delay_entries,
weather_entries, voice_notes, tasks, project_members, communications,
inspections, compliance_documents

Verify scoping patterns:
- Tables with `organization_id` → direct `WHERE organization_id = bucket.org_id`
- Tables with `project_id` → subquery through projects table
- Daily log child tables → subquery through daily_logs → projects

### 3b. Mobile schema — `packages/mobile/src/lib/powersync/schema.ts`

Verify the same 15 tables exist in the mobile schema with matching names.
Confirm type conventions:
- Booleans → column.integer
- UUIDs/FKs → column.text
- DateTimes → column.text
- Arrays/JSON → column.text

### 3c. Sync parity: server sync-rules.yaml tables == mobile schema.ts tables (all 15)

---

## 4. Offline Voice Queue (Priority #2)

### Files:
- `packages/mobile/src/lib/powersync/offlineVoiceQueue.ts` — queue implementation
- `packages/mobile/app/(tabs)/(record)/index.tsx` — Record screen
- `packages/mobile/app/(tabs)/_layout.tsx` — tab layout with useOfflineSync()

Verify:
- Record screen checks NetInfo.fetch() at top of handleUpload()
- If offline → queueVoiceNote() saves locally, shows "Saved Offline" alert
- If online → existing upload flow unchanged
- useOfflineSync() called in tab layout to process queue on foreground
- Metadata file cleanup in `uploadQueuedVoiceNote()` derives path via `new File(getQueueDir(), \`${audioName}.json\`)` — matching how the file was originally created in `queueVoiceNote()`

---

## 5. Offline Banner (Priority #3)

### File: `packages/mobile/src/components/common/OfflineBanner.tsx`

Verify:
- Uses @react-native-community/netinfo for connectivity detection
- Amber (#F59E0B) banner when offline
- Green (#10B981) "Back online" for 3 seconds on reconnect
- Animated.View slide in/out animation
- Rendered in `packages/mobile/app/(tabs)/_layout.tsx`

---

## 6. Database Schema (Priority #4)

### File: `packages/api/prisma/schema.prisma`

Verify 29 models exist, and specifically check these FK relations:
- TrainingRecord.employeeId → User via named relation "EmployeeTraining", onDelete: Cascade
- SyncConflictLog.organizationId → Organization, onDelete: Cascade
- User has reverse array: employeeTrainingRecords
- Organization has reverse array: syncConflictLogs

---

## 7. Code Quality Checks

Across ALL modified/created files, verify:
- [ ] No `console.log` — only NestJS Logger
- [ ] No `any` types (TypeScript strict)
- [ ] No business logic in controllers
- [ ] All imports are valid (no cross-module direct imports)
- [ ] No hardcoded secrets or credentials
- [ ] Express Request type augmentation eliminates all duck-type access patterns

---

## 8. Build & Test Verification

Run these commands and confirm they pass:

```bash
pnpm install
pnpm --filter @xo/api build        # Should compile with 0 errors
pnpm --filter @xo/api test         # Should pass all 54 tests
```

---

## 9. Deliverable

Produce a report with:
1. **Sync status**: Is the local repo fully pushed and matching GitHub main?
2. **File inventory**: Are all expected files present with correct contents?
3. **Code quality**: Any violations of the project conventions (CLAUDE.md)?
4. **Functionality gaps**: Anything described above that's missing or broken?
5. **Recommendations**: Any issues, improvements, or next priorities to address?

Rate overall project health: RED / YELLOW / GREEN with justification.
