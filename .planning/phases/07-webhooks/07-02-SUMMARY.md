---
phase: 07-webhooks
plan: 02
subsystem: api
tags: [webhooks, rest-api, hmac, ssrf-protection, organization-scoping]

# Dependency graph
requires:
  - phase: 07-01
    provides: Webhook signature generation/verification utilities and SSRF URL validation
provides:
  - Full webhook CRUD API endpoints (POST, GET, PATCH, DELETE)
  - Webhook secret rotation endpoint
  - Organization-scoped access control for all webhook operations
  - One-time secret exposure pattern on create and rotate
affects: [10-external-integrations, zapier, make, external-webhooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "withApiAuth middleware for webhook endpoints"
    - "Organization-scoped access control prevents cross-tenant access"
    - "Secret shown once pattern on create/rotate (never in GET responses)"
    - "URL path regex extraction for webhook ID in dynamic routes"
    - "5 webhook limit per organization"

key-files:
  created:
    - editor/src/app/api/v1/webhooks/route.ts
    - editor/src/app/api/v1/webhooks/[id]/route.ts
    - editor/src/app/api/v1/webhooks/[id]/rotate-secret/route.ts
  modified: []

key-decisions:
  - "5 webhook limit per organization (reasonable default, prevents abuse)"
  - "Secret returned only on POST create and POST rotate-secret (one-time exposure)"
  - "All GET responses exclude secret field for security"
  - "URL path regex extraction for webhook ID from Next.js dynamic routes"
  - "Secret rotation resets consecutiveFailures counter"
  - "DELETE returns 204 No Content (RESTful pattern)"

patterns-established:
  - "Organization-scoped webhook access: all operations check organizationId match"
  - "URL validation with validateWebhookUrl() on create and update operations"
  - "Error handling with 404 for not found, 429 for limit exceeded, 400 for validation"

# Metrics
duration: 2m 3s
completed: 2026-02-09
---

# Phase 07 Plan 02: Webhook CRUD API Summary

**Full webhook CRUD API with SSRF-protected URLs, one-time secret exposure, and organization-scoped access control**

## Performance

- **Duration:** 2m 3s (123 seconds)
- **Started:** 2026-02-09T15:03:52Z
- **Completed:** 2026-02-09T15:05:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Complete webhook lifecycle management via REST API (register, list, get, update, delete)
- Webhook secret rotation endpoint with automatic failure counter reset
- Organization-scoped access control prevents cross-tenant webhook access
- One-time secret exposure pattern on create and rotate operations
- SSRF protection applied to all URL validation operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create webhook registration and listing API endpoints** - `1e2f263` (feat)
2. **Task 2: Create individual webhook management and secret rotation endpoints** - `59a706a` (feat)

## Files Created/Modified

- `editor/src/app/api/v1/webhooks/route.ts` - POST register webhook (with secret shown once), GET list webhooks (without secrets)
- `editor/src/app/api/v1/webhooks/[id]/route.ts` - GET single webhook, PATCH update url/enabled, DELETE webhook
- `editor/src/app/api/v1/webhooks/[id]/rotate-secret/route.ts` - POST rotate secret (new secret shown once)

## Decisions Made

**5 webhook limit per organization**
- Reasonable default to prevent abuse while supporting typical use cases
- Returns 429 with clear message when limit reached

**Secret shown once pattern**
- Secret returned only in POST /webhooks (create) and POST /webhooks/:id/rotate-secret responses
- All GET responses exclude secret field completely
- Response includes `_note` warning to store securely

**URL path regex extraction for webhook ID**
- withApiAuth wrapper doesn't pass through Next.js dynamic route params
- Extract webhook ID from URL path using regex: `/api/v1/webhooks/([^/?]+)`
- Different regex for rotate-secret: `/api/v1/webhooks/([^/?]+)/rotate-secret`

**Secret rotation resets failure counter**
- consecutiveFailures reset to 0 on secret rotation
- Helps recover from signature verification failures after secret rotation

**Organization-scoped access control**
- All operations check `organizationId` match in WHERE clause
- Prevents cross-tenant webhook access via ID guessing
- Returns 404 (not 403) to avoid leaking webhook existence

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed established patterns from renders/route.ts without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plan (07-03: Webhook Delivery Worker)**
- CRUD endpoints provide programmatic webhook management
- Phase 10 (External Integrations) can use these endpoints for Zapier/Make connectivity
- Worker can query webhooks via prisma.webhookConfig to find delivery targets

## Self-Check: PASSED

**Files verified:**
- ✓ editor/src/app/api/v1/webhooks/route.ts
- ✓ editor/src/app/api/v1/webhooks/[id]/route.ts
- ✓ editor/src/app/api/v1/webhooks/[id]/rotate-secret/route.ts

**Commits verified:**
- ✓ 1e2f263 (Task 1: webhook registration and listing)
- ✓ 59a706a (Task 2: webhook CRUD and secret rotation)

All claimed files exist and all commits are present in git history.

---
*Phase: 07-webhooks*
*Completed: 2026-02-09*
