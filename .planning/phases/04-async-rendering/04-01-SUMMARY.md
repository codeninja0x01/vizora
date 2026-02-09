---
phase: 04-async-rendering
plan: 01
subsystem: queue, database, infra
tags: bullmq, ioredis, redis, prisma, async-jobs, error-handling

# Dependency graph
requires:
  - phase: 02-foundation-auth
    provides: "Prisma setup, User and Organization models"
  - phase: 03-template-system
    provides: "Template model for render job relations"
provides:
  - "Redis connection singleton with BullMQ-compatible configuration"
  - "BullMQ render queue with no auto-retry and 30-day retention"
  - "Render Prisma model with status tracking and error categorization"
  - "Error categorization types for typed error handling"
affects:
  - "04-02 (API endpoints depend on queue and Render model)"
  - "04-03 (Worker process depends on queue and Render model)"
  - "render-api"
  - "render-worker"

# Tech tracking
tech-stack:
  added:
    - "bullmq ^5.67.3"
    - "ioredis ^5.9.2"
  patterns:
    - "Redis singleton with globalThis pattern for HMR survival"
    - "BullMQ queue with no auto-retry fail-fast pattern"
    - "Error categorization with typed categories"
    - "Render model with status lifecycle tracking"

key-files:
  created:
    - "editor/src/lib/redis.ts"
    - "editor/src/lib/queue.ts"
    - "editor/src/lib/error-categorization.ts"
    - "editor/.env.sample"
  modified:
    - "editor/package.json"
    - "editor/prisma/schema.prisma"

key-decisions:
  - "BullMQ maxRetriesPerRequest: null and enableReadyCheck: false required for compatibility"
  - "No auto-retry pattern (attempts: 1) - fail fast and let users retry manually"
  - "30-day retention for completed and failed jobs"
  - "Four error categories: VALIDATION_ERROR, RENDER_TIMEOUT, RESOURCE_MISSING, INTERNAL_ERROR"
  - "Template relation with onDelete: Restrict to preserve render history"

patterns-established:
  - "Redis singleton: globalThis pattern prevents multiple connections in dev/serverless"
  - "Queue configuration: 1 attempt, 30-day retention for both completed and failed jobs"
  - "Error categorization: Pattern-based string matching for error type detection"
  - "Render lifecycle: status field tracks queued → active → completed/failed transitions"

# Metrics
duration: 2m 43s
completed: 2026-02-09
---

# Phase 4 Plan 1: Queue Infrastructure & Render Model Summary

**BullMQ render queue with Redis connection, Render model with status tracking, and typed error categorization**

## Performance

- **Duration:** 2m 43s (163s)
- **Started:** 2026-02-09T11:14:37Z
- **Completed:** 2026-02-09T11:17:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Redis connection singleton with BullMQ-compatible options (maxRetriesPerRequest: null, enableReadyCheck: false)
- BullMQ render queue configured with no auto-retry pattern (attempts: 1) and 30-day retention
- Render Prisma model with status, templateId, userId, organizationId, outputUrl, error fields, and timestamp tracking
- Error categorization utilities with four typed categories (VALIDATION_ERROR, RENDER_TIMEOUT, RESOURCE_MISSING, INTERNAL_ERROR)
- Three indexes on Render model for query performance: org+status+time, org+template, status+time

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Redis, Queue, and Error utilities** - `2fb32f7` (chore)
2. **Task 2: Add Render model to Prisma schema with relations and indexes** - `075aa39` (feat)

## Files Created/Modified
- `editor/src/lib/redis.ts` - Redis connection singleton with globalThis pattern for HMR survival
- `editor/src/lib/queue.ts` - BullMQ render queue with 1 attempt and 30-day retention
- `editor/src/lib/error-categorization.ts` - Error categorization with pattern-based type detection
- `editor/.env.sample` - Redis configuration variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
- `editor/package.json` - Added bullmq and ioredis dependencies
- `editor/prisma/schema.prisma` - Added Render model with relations to User, Organization, Template

## Decisions Made
- **BullMQ compatibility requirements**: Set maxRetriesPerRequest: null and enableReadyCheck: false (required by BullMQ, will error without these)
- **No auto-retry pattern**: attempts: 1 to fail fast on errors and let users manually retry instead of automatic retries
- **30-day retention**: Keep completed jobs for 30 days (max 10,000) and failed jobs for 30 days (max 5,000)
- **Error categories**: Four typed categories cover validation, timeout, missing resource, and internal errors
- **Template deletion protection**: onDelete: Restrict on Template relation prevents deleting templates with render history
- **Index strategy**: Three composite indexes optimize the primary query patterns for render list API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks executed smoothly with no blockers.

## User Setup Required

**Redis configuration needed for async rendering.**

Users must:
1. Add Redis environment variables to `.env` (see `.env.sample` for defaults):
   - `REDIS_HOST=127.0.0.1`
   - `REDIS_PORT=6379`
   - `REDIS_PASSWORD=` (optional for local dev)

2. Ensure Redis server is running:
   ```bash
   # For local development
   redis-server

   # For production, configure managed Redis (e.g., Upstash, Redis Cloud)
   ```

3. Verify Redis connection:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

## Next Phase Readiness
- Queue infrastructure complete and ready for job dispatch
- Render model synced to database with all fields and indexes
- Error categorization ready for consistent error handling
- Redis connection pattern supports both development (localhost) and production (managed Redis)
- Ready for plan 04-02 (API endpoints) to add /api/render/create and /api/render/list
- Ready for plan 04-03 (Worker process) to consume jobs from the queue

## Self-Check: PASSED

**File Existence:**
- ✓ editor/src/lib/redis.ts
- ✓ editor/src/lib/queue.ts
- ✓ editor/src/lib/error-categorization.ts
- ✓ editor/.env.sample
- ✓ editor/prisma/schema.prisma

**Commit Existence:**
- ✓ 2fb32f7 (Task 1)
- ✓ 075aa39 (Task 2)

**Database Sync:**
- ✓ Prisma schema validated successfully
- ✓ Database synced with Render model and indexes

---
*Phase: 04-async-rendering*
*Completed: 2026-02-09*
