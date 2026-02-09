---
phase: 04-async-rendering
plan: 03
subsystem: async-rendering
tags: [worker, bullmq, rendering, video]
dependency_graph:
  requires:
    - 04-01-render-queue
    - packages/node/Renderer
    - lib/merge-fields
    - lib/error-categorization
  provides:
    - render-worker-process
  affects:
    - render-lifecycle
tech_stack:
  added: [tsx]
  patterns: [standalone-worker, dynamic-esm-import, bullmq-processor]
key_files:
  created:
    - editor/src/workers/render-worker.ts
  modified:
    - editor/package.json
decisions:
  - "Dynamic ESM import for @designcombo/node to resolve CommonJS/ESM compatibility"
  - "mkdir inside job processor rather than top-level to avoid await issues"
  - "Concurrency: 1 for sequential processing per worker instance"
  - "15-minute lockDuration matching render timeout"
metrics:
  duration: 5m 38s (338s)
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
  completed_at: 2026-02-09T11:26:21Z
---

# Phase 04 Plan 03: Render Worker Process Summary

**One-liner:** Standalone BullMQ worker process that executes video render jobs using Playwright-based Renderer with full DB lifecycle tracking and graceful shutdown.

## What Was Built

Created a standalone Node.js worker process (`editor/src/workers/render-worker.ts`) that:

- Connects to BullMQ render queue and processes jobs sequentially (concurrency: 1)
- Fetches templates from DB with full projectData (not API-trimmed version)
- Applies merge data using existing `applyMergeData` utility from merge-fields.ts
- Renders MP4 videos via `@designcombo/node` Renderer class (Playwright-based)
- Updates DB through complete lifecycle: active → completed/failed
- Categorizes errors into 4 types: VALIDATION_ERROR, RENDER_TIMEOUT, RESOURCE_MISSING, INTERNAL_ERROR
- Handles SIGTERM/SIGINT for graceful shutdown
- Outputs to `/tmp/renders/{renderId}.mp4` with configurable `RENDER_OUTPUT_DIR`
- Runs via `npm run worker` using tsx for TypeScript execution

**Technical highlights:**
- Dynamic ESM import for `@designcombo/node` (ESM package) to work with CommonJS worker
- Progress event logging from Renderer
- 15-minute timeout and lockDuration per user decision
- Output directory created on first job (avoiding top-level await)

## Tasks Completed

### Task 1: Create render worker process
**Commit:** 3a83441
**Files:** editor/src/workers/render-worker.ts

Created BullMQ Worker with:
- Job processor: fetches template, applies merge data, renders video, updates DB
- Worker config: concurrency 1, lockDuration 900000ms, stalledInterval 60000ms, maxStalledCount 1
- Event listeners: completed, failed, error, stalled
- Graceful shutdown: SIGTERM/SIGINT handlers that close worker and disconnect Prisma
- Error handling: formatRenderError categorization, DB updates with errorCategory/errorMessage
- Structured logging throughout

### Task 2: Configure worker runtime
**Commit:** 1aacd2c
**Files:** editor/package.json, pnpm-lock.yaml

Added:
- `worker` npm script: `tsx src/workers/render-worker.ts`
- `tsx` dev dependency (^4.21.0) for TypeScript execution with path alias support
- `@designcombo/node` workspace dependency for Renderer class

Verified worker starts successfully and logs:
```
[Worker] Render worker started, waiting for jobs...
[Worker] Output directory: /tmp/renders
[Worker] Timeout: 900s
[Redis] Connected successfully
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client missing Render model**
- **Found during:** Task 1 verification (TypeScript compilation)
- **Issue:** Prisma client hadn't been regenerated after Render model was added in plan 04-01
- **Fix:** Ran `npx prisma generate` to regenerate client with Render model
- **Files modified:** None (regenerated client in node_modules)
- **Commit:** Not applicable (client generation)

**2. [Rule 1 - Bug] Top-level await not supported in CommonJS**
- **Found during:** Task 2 verification (worker startup test)
- **Issue:** Top-level `await mkdir()` caused "Top-level await is currently not supported with the 'cjs' output format" error
- **Fix:** Moved `mkdir` call inside `processRenderJob` function (runs on first job)
- **Files modified:** editor/src/workers/render-worker.ts
- **Commit:** Included in Task 1 commit (3a83441)

**3. [Rule 3 - Blocking] ESM/CommonJS compatibility issue**
- **Found during:** Task 2 verification (worker startup test)
- **Issue:** @designcombo/node is ESM-only ("type": "module") but worker runs in CommonJS mode
- **Fix:** Changed import from static `import { Renderer }` to dynamic `await import('@designcombo/node')` inside job processor
- **Files modified:** editor/src/workers/render-worker.ts
- **Commit:** Included in Task 1 commit (3a83441)

**4. [Rule 1 - Bug] TypeScript implicit any on progress parameter**
- **Found during:** Final TypeScript verification
- **Issue:** Progress event callback parameter had implicit any type
- **Fix:** Added explicit `any` type annotation: `(progress: any) =>`
- **Files modified:** editor/src/workers/render-worker.ts
- **Commit:** Included in Task 1 commit (3a83441)

## Verification Results

All verification criteria passed:

### Task 1 Verification
- ✅ Worker file imports: Worker, Renderer (dynamic), prisma, redisConnection, applyMergeData, formatRenderError
- ✅ Worker configuration: concurrency 1, lockDuration 900000, stalledInterval 60000, maxStalledCount 1
- ✅ SIGTERM/SIGINT handlers exist
- ✅ DB status updates for active, completed, failed states

### Task 2 Verification
- ✅ Worker script in package.json: `"worker": "tsx src/workers/render-worker.ts"`
- ✅ tsx installed: ^4.21.0 (dev dependency)
- ✅ @designcombo/node installed: workspace:^ (dependency)
- ✅ TypeScript compilation passes
- ✅ Worker starts successfully: logs startup, output directory, timeout, Redis connection

### Overall Verification
- ✅ Worker runs via `npm run worker`
- ✅ Worker picks BullMQ jobs sequentially
- ✅ Renderer integration via dynamic import
- ✅ Merge data applied via applyMergeData utility
- ✅ Full DB lifecycle: queued → active → completed|failed
- ✅ Error categorization: 4 types (VALIDATION_ERROR, RENDER_TIMEOUT, RESOURCE_MISSING, INTERNAL_ERROR)
- ✅ Graceful shutdown on SIGTERM/SIGINT
- ✅ MP4 output to /tmp/renders/{id}.mp4

## Self-Check: PASSED

### Created Files Verification
```bash
✅ FOUND: editor/src/workers/render-worker.ts
```

### Commits Verification
```bash
✅ FOUND: 3a83441 (Task 1: render worker)
✅ FOUND: 1aacd2c (Task 2: worker runtime config)
```

All files and commits verified successfully.

## Technical Notes

### ESM/CommonJS Solution
The worker uses dynamic import for the ESM package:
```typescript
let Renderer: any;
// ... inside processRenderJob:
if (!Renderer) {
  const module = await import('@designcombo/node');
  Renderer = module.Renderer;
}
```

This pattern:
- Loads ESM package in CommonJS context
- Caches the import (only loads once)
- Avoids static import compilation errors

### Worker Execution Flow

1. **Startup:**
   - Connect to Redis via redisConnection
   - Initialize BullMQ Worker for 'render-queue'
   - Log configuration (output dir, timeout)

2. **Job Processing:**
   - Ensure output directory exists
   - Load Renderer (dynamic import)
   - Update DB: status → 'active', startedAt
   - Fetch template with projectData
   - Apply merge data
   - Render video to /tmp/renders/{renderId}.mp4
   - Update DB: status → 'completed', outputUrl, completedAt
   - OR on error: status → 'failed', errorCategory, errorMessage, failedAt

3. **Shutdown:**
   - Close worker (wait for current job)
   - Disconnect Prisma
   - Exit gracefully

### Output Files
- **Location:** `/tmp/renders/{renderId}.mp4` (default)
- **Override:** Set `RENDER_OUTPUT_DIR` environment variable
- **URL pattern:** `/renders/{renderId}.mp4` (public URL for serving)

## Next Steps

Plan 04-03 completes the core rendering infrastructure. Next plan should:
- Add render status API endpoints (GET /api/v1/renders/:id)
- Add render download endpoint
- Add webhook support for render completion notifications
- Add render metrics/monitoring

## Success Criteria Met

- ✅ Worker runs as standalone Node.js process via `npm run worker`
- ✅ Worker picks BullMQ jobs and processes them sequentially (1 at a time)
- ✅ Worker uses existing Renderer class from @designcombo/node for video rendering
- ✅ Worker applies merge data using existing applyMergeData utility
- ✅ Worker updates DB status through full lifecycle (active, completed, failed)
- ✅ Worker categorizes errors into VALIDATION_ERROR, RENDER_TIMEOUT, RESOURCE_MISSING, INTERNAL_ERROR
- ✅ Worker handles SIGTERM/SIGINT for graceful shutdown
- ✅ Completed renders produce MP4 file at /tmp/renders/{id}.mp4
