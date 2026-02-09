# Phase 4: Async Rendering - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can submit render jobs via REST API that process asynchronously through a BullMQ queue, with separate worker processes producing MP4 videos. This phase covers the API endpoints, queue infrastructure, worker process, and job state tracking. Real-time progress streaming (SSE) is Phase 5. Cloud storage (R2) is Phase 6. Webhooks are Phase 7.

</domain>

<decisions>
## Implementation Decisions

### API Contract Design
- Every POST /api/v1/renders creates a new render (no idempotency keys)
- Input: template ID + merge data only (no raw project data — forces template-first workflow)
- Output on completion: direct URL in poll response (not presigned URLs)
- Render options: allow overrides for resolution, format, quality params
- Output format: MP4 only at launch
- API versioning via URL path: /api/v1/
- GET /api/v1/renders supports full filtering (status, templateId, date range) + cursor pagination from day one
- Merge data validated against template schema on submit (eager) — instant 400 on invalid data, no wasted queue slot

### Job Lifecycle & States
- States: queued → active → completed | failed
- No cancellation — once submitted, the job runs to completion
- 15-minute job timeout before marked as stalled
- No auto-retry — failed renders require user resubmission
- Completed render outputs expire after 30 days (auto-delete)

### Worker Behavior
- 1 render at a time per worker (sequential processing, scale by adding workers)
- Workers run as separate Node process on same machine (npm run worker)
- Start/complete status only — no progress percentage (Phase 5 adds real-time progress)
- Rendered MP4 stored on local disk (Phase 6 adds R2 cloud storage)
- Per-tier queue limits: Free: 5 queued, Pro: 50, Enterprise: unlimited
- Structured console logging for render activity

### Failure & Error Reporting
- Detailed error messages with context (e.g., "Missing font: Roboto-Bold not available on server")
- Typed error categories: VALIDATION_ERROR, RENDER_TIMEOUT, RESOURCE_MISSING, INTERNAL_ERROR
- Render duration metrics (queuedAt, startedAt, completedAt) tracked internally but not exposed in API

### Claude's Discretion
- Submit response shape (render ID, status, any additional metadata)
- Rendering approach — evaluate existing Playwright-based Renderer from @designcombo/node vs alternatives
- Exact error code taxonomy beyond the four main categories
- Internal metrics storage approach
- Graceful shutdown and stall recovery strategy

</decisions>

<specifics>
## Specific Ideas

- Project uses custom WebCodecs-based rendering (NOT Remotion) — server-side rendering via Playwright + Chromium in @designcombo/node package
- Existing `Renderer` class in `/packages/node/` already handles server-side rendering — worker should evaluate this as the rendering backend
- MP4-only output aligns with existing Compositor capabilities (H.264 via WebCodecs)
- Template-first workflow enforces the template system built in Phase 3

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-async-rendering*
*Context gathered: 2026-02-09*
