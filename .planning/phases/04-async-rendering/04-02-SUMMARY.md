---
phase: 04-async-rendering
plan: 02
subsystem: Render API Endpoints
tags: [api, rest, async, validation, pagination]
dependency_graph:
  requires: [04-01]
  provides: [render-submission-api, render-status-polling-api, render-list-api]
  affects: [render-queue, template-validation, tier-limits]
tech_stack:
  added: [async-request-reply-pattern, cursor-pagination]
  patterns: [eager-validation, queue-limit-enforcement, status-polling]
key_files:
  created:
    - editor/src/app/api/v1/renders/route.ts
    - editor/src/app/api/v1/renders/[id]/route.ts
  modified:
    - editor/src/lib/api-middleware.ts
decisions:
  - Eager validation pattern: validate merge data before queuing to fail fast with 400 (not 422)
  - Per-tier queue limits: free=5, pro=50, enterprise=unlimited concurrent renders
  - 202 Accepted with Location header and Retry-After: 5 for async request-reply pattern
  - Cursor-based pagination for render listing with max 100 items per page
  - Organization ownership verified with 404 (not 403) to avoid leaking existence
metrics:
  duration: 211
  completed: 2026-02-09
---

# Phase 04 Plan 02: Render API Endpoints Summary

**One-liner:** REST API endpoints for async render submission with eager validation, tier-based queue limits, status polling, and filtered pagination.

## What Was Built

### POST /api/v1/renders - Submit Render Job

Async render submission endpoint following request-reply pattern:

1. **Request validation** with Zod schema (templateId, mergeData, options)
2. **Template access control** - public templates accessible to all, private only to owning org
3. **Eager merge data validation** - validateMergeData() called before queue (instant 400 on invalid)
4. **Per-tier queue limits** - enforces concurrent render limits (free: 5, pro: 50, enterprise: ∞)
5. **DB-first pattern** - creates Render record before BullMQ enqueue (DB is source of truth)
6. **BullMQ job creation** - uses render.id as jobId for correlation
7. **202 Accepted response** - includes Location header and Retry-After: 5

**Queue limit enforcement:**
```typescript
const tierLimits = { free: 5, pro: 50, enterprise: Infinity };
const activeCount = await prisma.render.count({
  where: { organizationId, status: { in: ['queued', 'active'] } }
});
if (activeCount >= maxQueued) return 429;
```

### GET /api/v1/renders - List Renders

Paginated render listing with filtering:

- **Organization scoping** - all queries scoped to context.organizationId
- **Optional filters** - status, templateId, fromDate, toDate
- **Cursor pagination** - offset-based with configurable limit (max 100)
- **Response format** - excludes mergeData for brevity, includes outputUrl/error based on status

### GET /api/v1/renders/:id - Poll Render Status

Status polling endpoint with status-dependent responses:

- **Completed status** - includes outputUrl, completedAt
- **Failed status** - includes error.category, error.message, failedAt
- **Queued/active status** - includes Retry-After: 5 header for polling guidance
- **Access control** - returns 404 for non-owned renders (doesn't leak existence)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ApiKeyContext not exported from api-middleware**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** api-middleware.ts imported ApiKeyContext from api-keys.ts but didn't re-export it
- **Fix:** Added `export type { ApiKeyContext } from './api-keys';` for convenience import
- **Files modified:** editor/src/lib/api-middleware.ts
- **Commit:** efe226d

**2. [Rule 3 - Blocking] Prisma client missing Render model**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Render model existed in schema but Prisma client not regenerated
- **Fix:** Ran `npx prisma generate` to regenerate client
- **Files modified:** node_modules/@prisma/client (generated)
- **Commit:** efe226d (included in Task 1)

**3. [Rule 3 - Blocking] Zod z.record() type signature**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** z.record(z.unknown()) needs explicit key type parameter
- **Fix:** Changed to z.record(z.string(), z.unknown()) for proper type inference
- **Files modified:** editor/src/app/api/v1/renders/route.ts
- **Commit:** efe226d

**4. [Rule 3 - Blocking] MergeField[] type casting**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Direct cast from Json to MergeField[] not allowed
- **Fix:** Cast through unknown: `template.mergeFields as unknown as MergeField[]`
- **Files modified:** editor/src/app/api/v1/renders/route.ts
- **Commit:** efe226d

## Technical Decisions

**Eager validation before queue:**
User decision to validate merge data immediately on submission rather than in worker. Benefits: instant 400 feedback, no wasted queue slots, simpler worker logic. Returns 400 (not 422) since it's pre-queue validation, not the template validate endpoint.

**Tier-based queue limits:**
User decision to enforce concurrent render limits by tier. Prevents free tier abuse while allowing enterprise unlimited capacity. Checked before DB insert and enqueue.

**202 Accepted with headers:**
Following async request-reply pattern from research. Location header points to poll endpoint, Retry-After: 5 suggests 5-second polling interval.

**Cursor pagination:**
Offset-based cursor pagination (simpler than keyset for this use case). Max 100 items per page to prevent memory issues. Returns hasMore + nextCursor for client-side pagination.

**404 for unauthorized access:**
Returns 404 instead of 403 for non-owned renders to avoid leaking existence of other orgs' renders.

## Files Changed

**Created:**
- `editor/src/app/api/v1/renders/route.ts` (304 lines) - POST submit and GET list handlers
- `editor/src/app/api/v1/renders/[id]/route.ts` (108 lines) - GET poll handler

**Modified:**
- `editor/src/lib/api-middleware.ts` - Re-exported ApiKeyContext type

## Verification Results

**TypeScript compilation:** ✅ All files compile without errors

**API endpoint structure:**
- ✅ POST /api/v1/renders returns 202 with Location and Retry-After headers
- ✅ GET /api/v1/renders returns paginated list with filtering support
- ✅ GET /api/v1/renders/:id returns status-dependent response
- ✅ All endpoints wrapped with withApiAuth (authentication + rate limiting)

**Error handling:**
- ✅ Invalid body returns 400 with validation errors
- ✅ Template not found returns 404
- ✅ Queue limit exceeded returns 429 with tier-specific message
- ✅ Unauthorized access returns 404 (not 403)

## Integration Points

**Upstream dependencies:**
- `@/lib/api-middleware` - withApiAuth wrapper for all handlers
- `@/lib/db` - Prisma client for Render and Template queries
- `@/lib/queue` - renderQueue.add() for BullMQ job enqueue
- `@/lib/template-schema` - validateMergeData() for eager validation
- `@/types/template` - MergeField type definitions

**Downstream consumers:**
- Render workers (04-03) will poll these endpoints for job data
- Frontend dashboard will use GET /api/v1/renders for render list
- External API clients will use POST for programmatic render submission

**Database operations:**
- Reads: Template.findUnique(), Render.count(), Render.findMany(), Render.findUnique()
- Writes: Render.create()

**Queue operations:**
- renderQueue.add() with render.id as jobId for correlation

## Known Limitations

**Pagination:**
- Offset-based pagination doesn't handle concurrent inserts well (cursor could skip/duplicate)
- For high-volume production use, consider keyset pagination

**Queue limit race condition:**
- count() + create() is not atomic - possible to exceed limit if many requests happen simultaneously
- Consider distributed lock or DB constraint for strict enforcement

**Retry-After fixed at 5 seconds:**
- Doesn't adapt to actual queue depth or worker capacity
- Future enhancement: dynamic Retry-After based on queue metrics

## Next Steps

**Immediate (Plan 04-03):**
- Implement render worker that processes BullMQ jobs
- Update render status in DB as jobs progress
- Upload completed videos and populate outputUrl

**Future enhancements:**
- Webhook notifications for render completion/failure
- Batch render submission endpoint
- Render cancellation endpoint
- Advanced filtering (by date range, user, etc.)

## Self-Check: PASSED

**Created files exist:**
- ✅ FOUND: editor/src/app/api/v1/renders/route.ts
- ✅ FOUND: editor/src/app/api/v1/renders/[id]/route.ts

**Commits exist:**
- ✅ FOUND: efe226d (Task 1 - POST and GET /api/v1/renders)
- ✅ FOUND: 0e0e8f7 (Task 2 - GET /api/v1/renders/:id poll)

**TypeScript compilation:**
- ✅ All files compile without errors (npx tsc --noEmit --skipLibCheck)
