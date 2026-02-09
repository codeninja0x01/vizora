---
phase: 06-storage-integration
plan: 02
subsystem: render-storage
tags: [r2, cdn, deletion-warnings, expiry-ui, email-notifications]
completed: 2026-02-09

dependency-graph:
  requires:
    - 06-01-r2-setup
    - 04-03-render-worker
    - 02-foundation-auth
  provides:
    - cdn-video-delivery
    - automatic-expiry-tracking
    - deletion-warning-system
  affects:
    - render-worker
    - dashboard-ui
    - notification-system

tech-stack:
  added:
    - R2StorageService in render worker
    - BullMQ deletion-warning-queue
    - Deletion warning worker with Resend integration
  patterns:
    - CDN delivery for rendered videos
    - 30-day automatic expiry lifecycle
    - 23-day scheduled deletion warnings (7 days before expiry)
    - Optional email notifications via Resend
    - Fire-and-forget deletion warning scheduling

key-files:
  created:
    - editor/src/lib/deletion-warning-queue.ts
    - editor/src/workers/deletion-warning-worker.ts
  modified:
    - editor/src/workers/render-worker.ts (already modified in phase 07)
    - editor/src/app/(protected)/dashboard/renders/actions.ts
    - editor/src/components/render/render-card.tsx
    - editor/src/app/(protected)/dashboard/renders/render-list.tsx
    - editor/package.json

key-decisions:
  - decision: Upload to R2 after rendering completes, before DB update
    rationale: Ensures outputUrl always points to valid CDN asset
    alternatives: Upload after DB update (race condition risk)
  - decision: Clean up local /tmp file after successful R2 upload
    rationale: Prevents disk space exhaustion on worker instances
    impact: Local files only exist during render, not after completion
  - decision: Make deletion warning scheduling fire-and-forget
    rationale: Warning scheduling failure should not fail the render
    impact: Renders succeed even if warning scheduling fails
  - decision: Resend email sending is optional in deletion warning worker
    rationale: Development environment can work without email service
    impact: Worker logs warnings to console when RESEND_API_KEY not set
  - decision: Show amber warning banner for renders with deletionWarningShown=true
    rationale: Provides dashboard-level visibility for expiring renders
    alternatives: Email-only notifications (less visible to users)

metrics:
  duration: 15m 8s
  tasks_completed: 2
  files_created: 2
  files_modified: 5
  commits: 1
---

# Phase 06 Plan 02: Render video R2 storage Summary

**One-liner:** CDN video delivery via R2 upload with 30-day expiry lifecycle and 23-day deletion warnings

## Objective Achieved

Transformed rendered videos from local /tmp files to CDN-delivered assets with automatic 30-day lifecycle. Completed renders now upload to R2, store CDN URLs in database, schedule deletion warnings at 23 days, and display expiry information on dashboard. This implements core STOR-01 (CDN delivery) and STOR-02 (auto-delete) requirements from Phase 6.

## Tasks Completed

### Task 1: Modify render worker to upload MP4 to R2 and set CDN URL with expiry ✓

**Status:** Previously completed in phase 07 (commit 92d061e)

**Note:** This task was already implemented during Phase 07 execution. The render worker already:
- Imports R2StorageService and config
- Uploads rendered MP4 to R2 at `renders/{renderId}.mp4`
- Stores full CDN URL in outputUrl (e.g., https://assets.openvideo.dev/renders/xxx.mp4)
- Calculates and stores expiresAt (completedAt + 30 days)
- Schedules deletion warning job at 23 days delay
- Cleans up local file after successful upload
- Handles R2 upload failures as render failures

**Implementation details:**
- R2StorageService instantiated at module level with config
- File read via `readFile(outputPath)` and uploaded with `uploadData()`
- Progress updated to 90% after render, 95% after R2 upload
- expiresAt calculation: `new Date(completedAt.getTime() + 30 * 24 * 60 * 60 * 1000)`
- Deletion warning scheduled with `deletionWarningQueue.add()` with 23-day delay
- Dynamic import of deletion-warning-queue to avoid circular dependencies
- Try-catch wrapper for R2 upload - throws error to mark render as failed
- Best-effort local file cleanup with `.catch(() => {})` to prevent cleanup errors

**Files:** editor/src/workers/render-worker.ts

**Commit:** 92d061e (phase-07)

### Task 2: Create deletion warning infrastructure and add expiry display to dashboard ✓

**Status:** Completed

Created BullMQ deletion warning queue and worker, added expiry UI to render cards and dashboard banner.

**Implementation:**

1. **Deletion warning queue** (`editor/src/lib/deletion-warning-queue.ts`):
   - BullMQ Queue with 'deletion-warnings' name
   - 3 retry attempts with exponential backoff (60s delay)
   - Retains 1000 completed jobs, 500 failed jobs
   - Shared Redis connection from redis.ts

2. **Deletion warning worker** (`editor/src/workers/deletion-warning-worker.ts`):
   - Processes deletion-warnings queue jobs
   - Fetches render with user and template relations
   - Skips if render not found or not completed
   - Optional Resend email sending (checks RESEND_API_KEY):
     - Subject: "Your rendered video expires {date}"
     - HTML email with download link and expiry date
     - Console log fallback when Resend not configured
   - Updates render.deletionWarningShown = true in database
   - Concurrency: 5 for parallel email processing
   - Graceful shutdown handlers (SIGTERM, SIGINT)

3. **NPM script** (`editor/package.json`):
   - Added `worker:deletion` script: `tsx src/workers/deletion-warning-worker.ts`

4. **Render actions** (`editor/src/app/(protected)/dashboard/renders/actions.ts`):
   - Added expiresAt and deletionWarningShown to return payload
   - Serialized expiresAt date to ISO string

5. **Render card** (`editor/src/components/render/render-card.tsx`):
   - Added expiresAt and deletionWarningShown to RenderCardData interface
   - Imported Download and AlertTriangle icons from lucide-react
   - Added formatExpiryRelative() helper function (returns "in X days", "tomorrow", "today", "expired")
   - Download button for completed renders:
     - Inline flex button with Download icon + "Download" label
     - Primary button styling with hover effect
     - Uses `<a href={render.outputUrl} download>` for direct CDN download
   - Expiry display below video preview:
     - Amber warning banner when deletionWarningShown=true: "Expires in X days — download before deletion"
     - Muted text when not warning-shown: "Auto-deletes in X days"
     - AlertTriangle icon for warning state

6. **Render list** (`editor/src/app/(protected)/dashboard/renders/render-list.tsx`):
   - Imported AlertTriangle icon and useMemo hook
   - Added expiringCount calculation via useMemo:
     - Filters completed renders with deletionWarningShown=true
     - Checks expiresAt is in the future
   - Amber warning banner above render list:
     - Shows when expiringCount > 0
     - Message: "{N} rendered video(s) expiring within 7 days — download before deletion"
     - AlertTriangle icon with amber styling
     - Border and background with amber/5 opacity

**Files:**
- editor/src/lib/deletion-warning-queue.ts (created)
- editor/src/workers/deletion-warning-worker.ts (created)
- editor/package.json (modified)
- editor/src/app/(protected)/dashboard/renders/actions.ts (modified)
- editor/src/components/render/render-card.tsx (modified)
- editor/src/app/(protected)/dashboard/renders/render-list.tsx (modified)

**Commit:** 37cc0a4

## Deviations from Plan

None - plan executed exactly as written.

Task 1 was already completed during Phase 07 execution, which is outside the normal sequence but resulted in the same implementation as specified in the plan.

## Verification Results

**Task 1 (previously completed):**
- ✓ Render worker imports R2 service and config
- ✓ outputUrl contains full CDN URL (not local /tmp path)
- ✓ expiresAt set to completedAt + 30 days
- ✓ deletionWarningQueue.add called with 23-day delay
- ✓ Local file cleanup after R2 upload

**Task 2:**
- ✓ TypeScript compilation successful (npx tsc --noEmit)
- ✓ Deletion warning queue exports deletionWarningQueue
- ✓ Deletion warning worker starts without errors
- ✓ Render actions include expiresAt and deletionWarningShown fields
- ✓ Render card interface updated with expiry fields
- ✓ Render card displays download button and expiry info
- ✓ Render list shows amber banner for expiring renders

## Success Criteria Met

- [x] Render worker uploads completed MP4 to R2 at renders/{renderId}.mp4
- [x] outputUrl contains full CDN URL (e.g., https://assets.openvideo.dev/renders/xxx.mp4)
- [x] expiresAt = completedAt + 30 days stored in Render record
- [x] Deletion warning job scheduled 23 days after completion
- [x] Deletion warning worker sends email (when Resend configured) and sets DB flag
- [x] Local MP4 file cleaned up after R2 upload
- [x] Render cards show expiry date for completed renders
- [x] Completed render cards have a download button (Loom-style) linking to CDN MP4 URL
- [x] Dashboard banner warns about renders expiring within 7 days

## Integration Points

**Upstream dependencies:**
- R2 storage service (06-01) - Used for video upload
- Render worker (04-03) - Extended with R2 upload logic
- Redis connection (02-foundation-auth) - Shared for deletion warning queue
- Prisma schema (02-foundation-auth) - expiresAt and deletionWarningShown fields

**Downstream impacts:**
- Webhook system (07-webhooks) - outputUrl now contains CDN URL instead of local path
- Dashboard UI - Displays expiry information and download buttons
- Email notifications - Deletion warnings sent via Resend

## Technical Debt

None introduced.

## Follow-up Items

1. **Actual deletion automation:** Phase 6 Plan 03 will implement the automatic deletion of expired renders at 30 days
2. **Lifecycle rule verification:** Confirm R2 bucket lifecycle rule matches 30-day deletion policy
3. **Monitoring:** Add metrics for deletion warning delivery success rate
4. **User timezone:** Consider showing expiry dates in user's local timezone instead of UTC

## Self-Check

Verifying implementation claims:

**Created files:**
```bash
[ -f "editor/src/lib/deletion-warning-queue.ts" ] && echo "FOUND" || echo "MISSING"
# FOUND: editor/src/lib/deletion-warning-queue.ts

[ -f "editor/src/workers/deletion-warning-worker.ts" ] && echo "FOUND" || echo "MISSING"
# FOUND: editor/src/workers/deletion-warning-worker.ts
```

**Commits:**
```bash
git log --oneline | grep "37cc0a4\|92d061e"
# 37cc0a4 feat(06-02): add deletion warning infrastructure and expiry UI
# 92d061e docs(phase-07): complete phase execution
```

### Self-Check: PASSED

All files created and commits exist. Task 1 was completed in phase 07 (commit 92d061e), Task 2 completed in this execution (commit 37cc0a4).
