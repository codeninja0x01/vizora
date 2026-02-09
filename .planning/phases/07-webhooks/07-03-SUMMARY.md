---
phase: 07-webhooks
plan: 03
subsystem: webhooks
tags: [webhook-delivery, worker-process, retry-logic, integration]
dependency_graph:
  requires:
    - 07-01 (webhook foundation with signature generation and queue)
  provides:
    - webhook-delivery-worker (standalone BullMQ worker)
    - webhook-integration (render worker triggers webhook jobs)
  affects:
    - render-worker (now enqueues webhooks on completion/failure)
tech_stack:
  added:
    - undici (HTTP client for webhook delivery)
  patterns:
    - fire-and-forget webhook enqueueing
    - custom 5^n exponential backoff strategy
    - Standard Webhooks spec (headers: webhook-id, webhook-timestamp, webhook-signature)
    - permanent failure via UnrecoverableError for 4xx responses
key_files:
  created:
    - editor/src/workers/webhook-worker.ts (webhook delivery worker)
  modified:
    - editor/src/workers/render-worker.ts (webhook integration)
    - editor/package.json (webhook-worker npm script)
decisions:
  - Use undici for HTTP delivery (not fetch - better control over timeouts)
  - Fire-and-forget pattern ensures webhook failures never affect render outcomes
  - Custom 5^n backoff (5s, 25s, 125s, 625s, 3125s) for webhook retries
  - UnrecoverableError for 4xx (except 429) prevents wasted retry attempts
  - Webhook worker runs standalone alongside render worker (5 concurrent deliveries)
metrics:
  duration: 197s
  completed: 2026-02-09T15:07:09Z
---

# Phase 07 Plan 03: Webhook Delivery Worker Summary

**One-liner:** Standalone webhook delivery worker with 5^n exponential backoff, HTTP POST via undici with Standard Webhooks headers, integrated into render worker for automatic notification on render completion/failure.

## Execution Report

**Status:** ✅ Complete
**Duration:** 3m 17s (197s)
**Tasks Completed:** 2/2
**Commits:** 2

### Task Breakdown

| Task | Status | Duration | Commit |
|------|--------|----------|--------|
| 1. Create webhook delivery worker with 5^n backoff | ✅ Complete | ~2m | 09fe444 |
| 2. Integrate webhook enqueueing into render worker | ✅ Complete | ~1m | ced4640 |

## What Was Built

### 1. Webhook Delivery Worker (editor/src/workers/webhook-worker.ts)

Standalone BullMQ worker process that:

- **Sends HTTP POST requests** via undici to webhook URLs with 30s timeouts
- **Includes Standard Webhooks headers:**
  - `webhook-id`: Unique delivery ID (whk_UUID)
  - `webhook-timestamp`: UNIX timestamp
  - `webhook-signature`: HMAC-SHA256 signature (v1,{base64})
- **Custom 5^n exponential backoff:** 5s, 25s, 125s, 625s, 3125s delays
- **Retry logic:**
  - 5xx and 429: Regular Error → BullMQ retries with backoff
  - Other 4xx: UnrecoverableError → permanent failure, no retries
  - 2xx: Success → update DB metadata (lastSuccessAt, consecutiveFailures: 0)
- **Graceful handling:**
  - Skips delivery if webhook deleted/disabled during queue wait
  - Updates DB on final failure (lastFailureAt, consecutiveFailures++)
  - Response body dumped to prevent memory leaks
- **Concurrency:** 5 parallel deliveries
- **Runs via:** `npm run webhook-worker`

### 2. Render Worker Integration (editor/src/workers/render-worker.ts)

Modified render worker to enqueue webhook jobs:

- **enqueueWebhooks helper function:**
  - Finds all enabled webhooks for organization
  - Creates delivery jobs with unique webhook IDs
  - Uses `webhookQueue.addBulk` for efficient batch enqueueing
  - Fire-and-forget: internal try/catch prevents webhook errors from affecting renders
- **Integration points:**
  - **On render completion:** Enqueues `render.completed` event with outputUrl
  - **On render failure:** Enqueues `render.failed` event with error details
- **Payload structure:**
  - `type`: Event type (render.completed | render.failed)
  - `timestamp`: ISO 8601 timestamp
  - `data`: Render details (renderId, templateId, status, outputUrl/error)

## Implementation Highlights

### Custom Backoff Strategy

```typescript
backoffStrategy: (attemptsMade: number): number => {
  return 5 ** attemptsMade * 1000; // 5s, 25s, 125s, 625s, 3125s
}
```

### Fire-and-Forget Pattern

```typescript
async function enqueueWebhooks(...) {
  try {
    // ... webhook enqueueing logic
  } catch (error) {
    // Log but do NOT throw — webhook failure must not affect render status
    console.error(`[Worker] Failed to enqueue webhooks:`, error);
  }
}
```

### Status Code Handling

- **2xx:** Success → update metadata, done
- **429 or 5xx:** Retryable → throw Error for BullMQ retry
- **Other 4xx:** Permanent → throw UnrecoverableError to prevent retries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unsupported maxRedirections option**
- **Found during:** Task 1 (webhook worker creation)
- **Issue:** TypeScript error - `maxRedirections` doesn't exist in undici's request options
- **Fix:** Removed the option (SSRF protection already handled by URL validation in plan 07-02)
- **Files modified:** editor/src/workers/webhook-worker.ts
- **Commit:** 09fe444 (included in main Task 1 commit)

## Verification Results

All verification criteria met:

- ✅ TypeScript compiles without errors in both worker files
- ✅ `npm run webhook-worker` script added to package.json
- ✅ Custom 5^n backoff produces delays: 5s, 25s, 125s, 625s, 3125s
- ✅ Standard Webhooks headers present (webhook-id, webhook-timestamp, webhook-signature)
- ✅ UnrecoverableError used for 4xx (except 429) permanent failures
- ✅ Render worker imports webhookQueue and calls enqueueWebhooks on completion/failure
- ✅ enqueueWebhooks wrapped in try/catch for fire-and-forget pattern

## Success Criteria Met

- ✅ Webhook delivery worker runs as standalone process alongside render worker
- ✅ HTTP POST includes webhook-id, webhook-timestamp, webhook-signature headers per Standard Webhooks spec
- ✅ Custom backoff produces exactly: 5s, 25s, 125s, 625s, 3125s delays
- ✅ 5xx and 429 trigger retry; other 4xx cause permanent failure via UnrecoverableError
- ✅ Render completion triggers render.completed webhook; render failure triggers render.failed webhook
- ✅ Webhook enqueueing cannot crash or delay the render worker

## Integration Points

### With Phase 07-01 (Webhook Foundation)

- **Uses:** `generateWebhookSignature` for HMAC-SHA256 signatures
- **Uses:** `webhookQueue` for job enqueueing
- **Uses:** `redisConnection` for BullMQ worker
- **Uses:** `WebhookJobData`, `WebhookPayload` types

### With Phase 04 (Async Rendering)

- **Modifies:** Render worker to enqueue webhook jobs
- **Triggers:** Webhook delivery on render completion/failure
- **Fire-and-forget:** Webhook failures don't affect render outcomes

## Files Changed

### Created

- `editor/src/workers/webhook-worker.ts` (177 lines) - Webhook delivery worker with custom backoff

### Modified

- `editor/src/workers/render-worker.ts` (+74 lines) - Webhook enqueueing integration
- `editor/package.json` (+1 line) - webhook-worker npm script

## Commits

1. **09fe444** - `feat(07-03): create webhook delivery worker with 5^n backoff`
   - Standalone BullMQ worker for webhook HTTP delivery
   - Custom 5^n exponential backoff strategy
   - Standard Webhooks headers with HMAC signatures
   - Retry on 5xx/429, permanent failure on other 4xx
   - npm run webhook-worker script

2. **ced4640** - `feat(07-03): integrate webhook enqueueing into render worker`
   - Created enqueueWebhooks helper with fire-and-forget pattern
   - Enqueue webhook jobs on render completion/failure
   - Payload includes status, outputUrl, or error details

## Next Steps

**Phase 07 Plan 04 (Webhook UI):** Create webhook management UI in dashboard with list, create, edit, delete, and event log viewer functionality.

## Self-Check

Verifying created files and commits exist on disk:

### Files
- ✅ FOUND: editor/src/workers/webhook-worker.ts
- ✅ FOUND: editor/src/workers/render-worker.ts
- ✅ FOUND: editor/package.json

### Commits
- ✅ FOUND: 09fe444 (webhook delivery worker)
- ✅ FOUND: ced4640 (webhook integration in render worker)

**Result:** ✅ PASSED - All files and commits verified
