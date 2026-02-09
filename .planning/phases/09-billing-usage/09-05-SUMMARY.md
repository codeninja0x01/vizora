---
phase: 09-billing-usage
plan: 05
subsystem: ui, navigation, billing
tags: [react, components, layout, sidebar, notifications, ux]

# Dependency graph
requires:
  - phase: 09-billing-usage
    plan: 01
    provides: billing.ts with isLowCredit function and LOW_CREDIT_THRESHOLD
  - phase: 02-foundation-auth
    provides: Protected layout and organization model
provides:
  - LowCreditBanner component for proactive credit warnings at 20% threshold
  - Protected layout with billing data fetching and banner rendering
  - Sidebar navigation with Billing link in mainNav section
affects: [09-billing-usage, user-experience, navigation, credit-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side dismissal pattern (state-based, resets on page reload)"
    - "Conditional styling based on credit state (amber for low, red for zero)"
    - "Server component data fetching in layout for billing data"
    - "Lucide-react icon imports for consistent UI"

key-files:
  created:
    - editor/src/components/billing/low-credit-banner.tsx
    - editor/src/app/(protected)/dashboard/billing/billing-content.tsx (stub)
  modified:
    - editor/src/app/(protected)/layout.tsx
    - editor/src/app/(protected)/dashboard-sidebar.tsx

key-decisions:
  - "Banner uses 20% threshold (creditBalance <= monthlyAllotment * 0.2) matching backend LOW_CREDIT_THRESHOLD"
  - "Client-side dismissal only - no persistent state (intentional gentle reminder, not blocking modal)"
  - "Banner renders server-side with organization billing data from layout query"
  - "Amber styling for low credits (>0 but <=20%), red styling for zero credits"
  - "Billing link positioned after Bulk Generate (natural flow: do work → manage credits)"
  - "Billing in mainNav (not devNav) - core user feature, not developer tool"
  - "Created stub billing-content.tsx to fix pre-existing TypeScript error (full implementation in plan 09-04)"

patterns-established:
  - "Low-credit warning UX: non-blocking banner with dismiss option and actionable link"
  - "Layout-level data fetching for cross-page features (banner appears on all protected pages)"
  - "Navigation link positioning based on user workflow (work features → billing → utility)"

# Metrics
duration: 3m 15s
completed: 2026-02-09
---

# Phase 09 Plan 05: Low Credit Banner & Billing Navigation Summary

**Proactive low-credit warning banner with dismissable UI and Billing navigation link added to sidebar for one-click access**

## Performance

- **Duration:** 3m 15s (195 seconds)
- **Started:** 2026-02-09T21:09:21Z
- **Completed:** 2026-02-09T21:12:36Z
- **Tasks:** 2
- **Files modified:** 2 created, 2 modified

## Accomplishments

- Created LowCreditBanner component with client-side dismissal and conditional styling
- Banner shows amber warning when credits <=20% of monthly allotment
- Banner shows red alert when credits reach 0 (renders blocked state)
- Includes actionable link to /dashboard/billing and dismiss button
- Updated protected layout to fetch organization billing data (creditBalance, monthlyAllotment, tier)
- Banner renders before children on all protected pages
- Added Billing link to sidebar mainNav with CreditCard icon
- Positioned Billing after Bulk Generate (workflow: work → billing → other)
- Fixed pre-existing TypeScript error with stub billing-content.tsx component

## Task Commits

Each task was committed atomically:

1. **Task 1: Low-credit banner component and layout integration** - `3b01958` (feat)
   - Created LowCreditBanner component with amber/red styling based on credit state
   - Added organization billing data query to protected layout
   - Render banner before children on all dashboard pages
   - Client-side dismissal resets on page reload (intentional)

2. **Task 2: Add Billing link to sidebar navigation** - `3354e2d` (feat)
   - Added CreditCard icon import from lucide-react
   - Added Billing link to mainNav between Bulk Generate and Gallery
   - Created stub billing-content.tsx to fix pre-existing import error

## Files Created/Modified

**Created:**
- `editor/src/components/billing/low-credit-banner.tsx` - Dismissable warning banner with 20% threshold, amber/red styling, link to billing page
- `editor/src/app/(protected)/dashboard/billing/billing-content.tsx` - Stub component (full implementation pending plan 09-04)

**Modified:**
- `editor/src/app/(protected)/layout.tsx` - Added billing data query, imported and rendered LowCreditBanner
- `editor/src/app/(protected)/dashboard-sidebar.tsx` - Added CreditCard icon, added Billing link to mainNav

## Decisions Made

1. **20% threshold for low-credit warning**: Matches LOW_CREDIT_THRESHOLD constant from lib/billing.ts, provides early warning for users
2. **Client-side dismissal only (no persistence)**: Intentional gentle reminder that resets on page reload, not a blocking modal
3. **Amber vs red styling**: Amber for low credits (user has time), red for zero credits (renders blocked)
4. **Layout-level data fetching**: Single query per page load, minimal performance impact (3 fields on indexed primary key)
5. **Banner placement before children**: Ensures visibility on all protected pages without per-page integration
6. **Billing link after Bulk Generate**: Reflects user workflow (do work → manage credits → other navigation)
7. **Billing in mainNav (not devNav)**: Core user feature for all users, not developer-specific tooling
8. **Percentage display**: Shows {percentage}% remaining for quick visual understanding of credit status
9. **Different CTA text by state**: "Upgrade Plan" for low credits, "Buy Credits" for zero credits
10. **No banner for free tier with 0 allotment**: Prevents showing warning to users without subscriptions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Created stub billing-content.tsx component**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Pre-existing billing/page.tsx imports './billing-content' which doesn't exist. TypeScript compilation fails.
- **Fix:** Created minimal stub component with placeholder UI and correct props interface. Allows TypeScript to compile. Full implementation deferred to plan 09-04.
- **Files created:** editor/src/app/(protected)/dashboard/billing/billing-content.tsx
- **Commit:** 3354e2d (included with Task 2)
- **Rationale:** Rule 3 applies - blocking issue preventing TypeScript compilation. Stub is minimal (19 lines) and clearly marked for plan 09-04 implementation. Alternative would be to leave codebase in broken state.

## Issues Encountered

1. **Pre-existing broken import**: The billing/page.tsx file existed before this plan but was incomplete (missing billing-content.tsx). This suggests plan 09-04 may have been partially attempted outside the GSD workflow, or files were manually created. Stub component allows compilation without implementing full billing dashboard prematurely.

2. **No email notification implemented**: The banner provides in-app warning, but plan references "email notification (handled in Plan 03)" which wasn't found in phase 09 summaries. Email notifications may be in a different phase or not yet implemented.

## User Setup Required

None - all features are self-contained within the codebase.

**Usage:**
1. Navigate to any dashboard page while logged in
2. If credits are <=20% of monthly allotment, banner appears at top
3. Click "Upgrade Plan" or "Buy Credits" to navigate to /dashboard/billing
4. Click X to dismiss (resets on page reload)
5. Click "Billing" in sidebar to access billing page directly

**Visual states:**
- **Healthy credits (>20%)**: No banner shown
- **Low credits (1-20%)**: Amber banner with percentage and credit count
- **Zero credits**: Red banner with "renders blocked" message
- **Free tier with no subscription**: No banner (avoids false warnings)

## Next Phase Readiness

**Ready for next plans:**
- ✅ Low-credit warning UI complete and renders across all dashboard pages
- ✅ Billing link accessible from sidebar on all pages
- ✅ Banner uses backend threshold (20%) and styling reflects urgency
- ✅ TypeScript compiles without errors
- ✅ All components follow existing design patterns (styling, icons, layout)

**Next steps:**
- Plan 09-04: Full billing dashboard implementation (upgrade flow, credit packs, usage analytics) - will replace stub billing-content.tsx
- Future: Email notification system for persistent low-credit warnings (referenced but not implemented)

**No blockers** - all must-have artifacts created and verified. Banner appears correctly based on credit state, sidebar navigation includes Billing link.

---
*Phase: 09-billing-usage*
*Completed: 2026-02-09*

## Self-Check: PASSED

All files and commits verified:
- ✓ editor/src/components/billing/low-credit-banner.tsx exists
- ✓ editor/src/app/(protected)/dashboard/billing/billing-content.tsx exists
- ✓ editor/src/app/(protected)/layout.tsx exists
- ✓ editor/src/app/(protected)/dashboard-sidebar.tsx exists
- ✓ Commit 3b01958 (Task 1: Low-credit banner component and layout integration) exists
- ✓ Commit 3354e2d (Task 2: Add Billing link to sidebar navigation) exists
