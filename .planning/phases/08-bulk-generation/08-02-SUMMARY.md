---
phase: 08-bulk-generation
plan: 02
subsystem: batch-api
tags: [rest-api, batch-processing, validation, retry]
dependency_graph:
  requires:
    - 08-01 (Batch model, types, queue, tracker utilities)
    - 02-04 (withApiAuth middleware, API key validation)
    - 03-01 (Template schema, validateMergeData)
  provides:
    - POST /api/v1/renders/batch (batch submission endpoint)
    - GET /api/v1/batches/:id (batch status polling)
    - POST /api/v1/batches/:id/retry (failed render retry)
  affects:
    - External API clients (batch render submission)
    - Dashboard CSV upload (will call batch API)
tech_stack:
  added:
    - Zod batch request validation schema
  patterns:
    - Eager validation pattern (fail-fast before queuing)
    - Organization-scoped access control (404 for unauthorized)
    - Tier-based limits (batch size and concurrent queue)
    - 202 Accepted with Location and Retry-After headers
key_files:
  created:
    - editor/src/app/api/v1/renders/batch/route.ts
    - editor/src/app/api/v1/batches/[id]/route.ts
    - editor/src/app/api/v1/batches/[id]/retry/route.ts
  modified:
    - editor/src/lib/batch/queue.ts
decisions:
  - key: URL pathname extraction for withApiAuth compatibility
    rationale: withApiAuth expects 2-param handlers (request, context), but Next.js 15 dynamic routes provide params as 3rd parameter. Extract ID from URL pathname instead.
    alternatives: [Modify withApiAuth to support 3-param handlers, Use route handlers without middleware]
    trade_offs: URL parsing is simple but requires knowing route structure; middleware remains reusable
  - key: Filter null batchIndex in retry endpoint
    rationale: TypeScript sees batchIndex as nullable, but batch renders always have non-null index. Filter defensively.
    alternatives: [Assert non-null, Modify schema to enforce non-null]
    trade_offs: Defensive filtering is safer but adds runtime check
metrics:
  duration: 4m 29s
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  commits: 1
  lines_added: ~244
  completed_at: 2026-02-09T20:24:47Z
---

# Phase 08 Plan 02: Batch REST API Endpoints Summary

**One-liner:** Three REST API endpoints for batch render submission, status polling, and failed render retry with tier-based limits and eager validation.

## What Was Built

### POST /api/v1/renders/batch - Batch Render Submission

**Request validation:**
- Zod schema validates templateId (required), mergeDataArray (non-empty array), and optional render options (width, height, fps, quality)
- Enforces tier-based batch size limits: Free 10, Pro 100, Enterprise 1000
- Returns 400 with clear error message if limit exceeded

**Template access control:**
- Fetches template and verifies it exists (404 if not)
- Template must be public OR owned by same organization (404 for unauthorized)
- Same access pattern as single render endpoint

**Eager validation of all merge data rows:**
- Validates ALL merge data rows before queuing ANY renders (fail-fast)
- Collects validation errors with row indices
- Returns 400 with invalidRows array if any row fails
- Per user decision: API validates eagerly, dashboard shows preview/dry-run

**Concurrent queue limit check:**
- Counts active renders (queued + processing) for organization
- Checks if adding batch would exceed tier limit (free: 5, pro: 50, enterprise: unlimited)
- Returns 429 with detailed message if limit would be exceeded

**Atomic batch creation:**
- Creates Batch record in database with totalCount and 'queued' status
- Creates all Render records with batchId, batchIndex, and 'queued' status
- Database is source of truth before queueing

**Queue management:**
- Calls queueBatchRenders with actual render IDs from database
- Uses chunked addBulk to prevent Redis max command size errors
- If queuing fails, updates batch and all renders to 'failed' status
- Returns 500 with error message on queue failure

**Response:**
- Returns 202 Accepted with batch ID, status, totalCount, templateId, createdAt
- Includes Location header: `/api/v1/batches/{batchId}`
- Includes Retry-After: 5 header for polling

### GET /api/v1/batches/:id - Batch Status Polling

**Access control:**
- Extracts batch ID from URL pathname (withApiAuth compatibility)
- Fetches batch with organization scope (prevents cross-org access)
- Returns 404 if batch not found or unauthorized

**Live progress aggregation:**
- Calls getBatchProgress() for real-time status counts
- Returns progress object with queued, processing, completed, failed counts
- Includes percentComplete calculation

**Response format:**
```json
{
  "id": "batch_id",
  "status": "processing",
  "templateId": "...",
  "templateName": "...",
  "totalCount": 100,
  "progress": {
    "queued": 10,
    "processing": 5,
    "completed": 80,
    "failed": 5,
    "percentComplete": 85
  },
  "createdAt": "ISO string",
  "completedAt": null
}
```

**Headers:**
- Includes Retry-After: 5 header if batch not in terminal state (completed, failed, partial_failure)
- No Retry-After for terminal states (polling should stop)

### POST /api/v1/batches/:id/retry - Retry Failed Renders

**Access control:**
- Extracts batch ID from URL pathname (path ends with /retry, so use pathParts[-2])
- Fetches batch with organization scope
- Returns 404 if batch not found or unauthorized

**Failed render identification:**
- Queries all renders with batchId and status='failed'
- Returns 400 if no failed renders to retry

**Reset and re-queue:**
- Resets failed renders to 'queued' status
- Clears errorCategory, errorMessage, failedAt fields
- Sets new queuedAt timestamp
- Filters out any renders with null batchIndex (defensive)
- Re-queues via queueBatchRenders with actual render IDs
- If re-queueing fails, resets renders back to 'failed' status

**Batch status update:**
- Calls updateBatchStatus() to transition batch back to 'processing'
- Batch status logic handles mixed states (queued, processing, completed, failed)

**Response:**
- Returns 202 Accepted with batchId, retriedCount, status='processing'
- Includes Retry-After: 5 header for continued polling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed queueBatchRenders to accept actual render IDs**
- **Found during:** Task 1 implementation
- **Issue:** queueBatchRenders generated synthetic render IDs (`render_${batchId}_${index}`), but batch endpoint created Render records in database with auto-generated UUIDs. IDs wouldn't match, causing worker to fail when updating render status.
- **Fix:** Modified queueBatchRenders signature to accept array of render records with actual IDs from database. Updated function to map render records to jobs with correct IDs.
- **Files modified:** editor/src/lib/batch/queue.ts, editor/src/app/api/v1/renders/batch/route.ts
- **Commit:** Included in initial Task 1 commit (ca5a44f, created during plan 08-03 execution)

**Note:** POST /api/v1/renders/batch endpoint and queueBatchRenders fix were already implemented in commit ca5a44f (plan 08-03). This plan execution created the missing GET /api/v1/batches/:id and POST /api/v1/batches/:id/retry endpoints.

## Architecture Decisions

**1. URL pathname extraction for dynamic route parameters**
- **Problem:** withApiAuth expects handlers with signature `(request, context) => Response`, but Next.js 15 dynamic routes provide params as third parameter `({ params }: { params: Promise<{ id: string }> })`
- **Solution:** Extract IDs from URL pathname by splitting path and selecting appropriate segment
- **Trade-offs:** Simple and works with existing middleware, but requires knowing route structure. Alternative would be modifying withApiAuth to support 3-param handlers, but that would break existing endpoints.

**2. Defensive filtering of null batchIndex**
- **Problem:** TypeScript infers batchIndex as `number | null` from Prisma schema, but batch renders always have non-null index (set during creation)
- **Solution:** Filter renders with null batchIndex before passing to queueBatchRenders
- **Trade-offs:** Adds runtime check for case that shouldn't occur, but prevents potential type errors and makes code more defensive

## Integration Points

**Upstream dependencies:**
- Batch model (08-01): Batch and Render Prisma models with batchId, batchIndex, totalCount
- Queue utilities (08-01): queueBatchRenders, getBatchProgress, updateBatchStatus
- Validation (03-01): validateMergeData for merge field validation
- Middleware (02-04): withApiAuth for API key validation and rate limiting

**Downstream consumers:**
- External API clients: Can submit batch renders via JSON API
- Dashboard CSV upload (08-04): Will convert CSV to JSON and call POST /api/v1/renders/batch
- Batch progress SSE (08-03): GET endpoint provides polling fallback if SSE not available

## Testing Notes

**Manual verification completed:**
- TypeScript compilation passes with no errors
- All three endpoints export handlers wrapped in withApiAuth
- Zod schemas validate required fields and types
- Organization scoping enforced in all database queries
- Tier limits imported from BATCH_SIZE_LIMITS constant
- Returns 202 with Location and Retry-After headers

**Testing recommendations:**
- Test batch submission with valid merge data (should return 202)
- Test batch submission exceeding tier limit (should return 400)
- Test batch submission with invalid merge data rows (should return 400 with row indices)
- Test batch submission exceeding concurrent queue limit (should return 429)
- Test GET status endpoint while batch is processing (should return progress)
- Test retry endpoint with no failed renders (should return 400)
- Test retry endpoint with failed renders (should reset to queued and re-queue)
- Test cross-org access (should return 404, not 403)

## Performance Characteristics

**Batch submission:**
- O(n) for merge data validation (validates each row)
- O(n) for Render record creation (parallel Promise.all)
- O(n/100) for queue insertion (chunked addBulk)
- Database writes: 1 Batch + n Renders (can be optimized with createMany in future)

**Status polling:**
- O(1) database queries (single batch fetch + efficient groupBy for progress)
- Uses Prisma groupBy for progress aggregation (single query, not n queries)
- Suitable for frequent polling (5-second intervals)

**Retry:**
- O(failed) for re-queueing (only processes failed renders)
- Efficient filtering and bulk update operations
- Minimal overhead for batches with few failures

## Known Limitations

1. **Render creation uses Promise.all instead of createMany**
   - Current: n individual database inserts
   - Future: Single createMany call for better performance
   - Rationale: Promise.all is simpler and works, optimization can come later

2. **No partial batch submission**
   - If any merge data row fails validation, entire batch is rejected
   - No option to submit valid rows and skip invalid ones
   - Rationale: Fail-fast prevents surprising behavior, aligns with eager validation decision

3. **Retry re-queues ALL failed renders**
   - No selective retry (can't retry specific renders)
   - No way to exclude permanently failed renders
   - Rationale: Simple retry logic, can be enhanced later if needed

## Self-Check

Verifying created files exist:

```
✓ FOUND: editor/src/app/api/v1/renders/batch/route.ts
✓ FOUND: editor/src/app/api/v1/batches/[id]/route.ts
✓ FOUND: editor/src/app/api/v1/batches/[id]/retry/route.ts
✓ FOUND: editor/src/lib/batch/queue.ts
```

Verifying commits exist:

```
✓ FOUND: c811839 (Task 2: batch status and retry endpoints)
✓ FOUND: ca5a44f (Task 1: batch submission endpoint - created in plan 08-03)
```

## Self-Check: PASSED

All files created and all commits verified. Plan 08-02 complete.
