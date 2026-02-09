---
phase: 07-webhooks
plan: 04
subsystem: dashboard-webhooks
tags: [dashboard, webhooks, ui, crud]
dependency_graph:
  requires:
    - 07-01-PLAN.md (webhook foundation - signature, validator, schema)
  provides:
    - Dashboard webhooks page at /dashboard/webhooks
    - Server actions for webhook CRUD operations
    - Webhooks navigation link in dashboard sidebar
  affects:
    - Dashboard sidebar navigation structure
tech_stack:
  added: []
  patterns:
    - Server actions for webhook mutations with session auth
    - Client components for dialogs and action buttons
    - Show-secret-once pattern with copy-to-clipboard
    - Toggle switch for enable/disable webhook state
key_files:
  created:
    - editor/src/app/(protected)/dashboard/webhooks/actions.ts (server actions)
    - editor/src/app/(protected)/dashboard/webhooks/create-dialog.tsx (create webhook dialog)
    - editor/src/app/(protected)/dashboard/webhooks/page.tsx (main webhooks page)
    - editor/src/app/(protected)/dashboard/webhooks/webhook-actions.tsx (action buttons)
  modified:
    - editor/src/app/(protected)/dashboard-sidebar.tsx (added Webhooks link)
decisions:
  - Empty state with prominent create button when no webhooks configured
  - Consecutive failures shown with warning badges (amber 1-3, red 4+)
  - Rotate secret shows new secret once in dialog (not inline in card)
  - Toggle switch styled as custom button (not Radix Switch for simplicity)
  - Sidebar placement after API Keys under Developer section
metrics:
  duration: 5m 22s
  completed: 2026-02-09
---

# Phase 7 Plan 4: Dashboard Webhooks Management

Dashboard UI for webhook management with full CRUD operations via server actions.

## Tasks Completed

### Task 1: Create webhook server actions and create dialog
**Commit:** 554d3c3

Created `actions.ts` with four server actions following the established API keys pattern:
- `createWebhook(url)` - validates URL (SSRF protection), generates secret, returns secret once
- `deleteWebhook(id)` - verifies ownership, deletes webhook
- `rotateWebhookSecret(id)` - generates new secret, resets consecutive failures, returns secret once
- `toggleWebhook(id, enabled)` - enables/disables webhook

Created `create-dialog.tsx` as a client component with show-secret-once pattern:
- URL input with HTTPS validation (or http://localhost in development)
- Copy button for webhook secret with visual confirmation
- Prominent warning: "Copy this secret now. It will not be shown again."
- Auto-reset state on dialog close

All actions use session auth, organization scoping, and path revalidation for immediate UI updates.

**Files:**
- `editor/src/app/(protected)/dashboard/webhooks/actions.ts` (253 lines)
- `editor/src/app/(protected)/dashboard/webhooks/create-dialog.tsx` (213 lines)

### Task 2: Create webhook list page, action buttons, and sidebar link
**Commit:** b5c125d

Created `page.tsx` as a server component with webhook list display:
- Header with Webhook icon and subtitle
- Empty state with prominent create button when no webhooks configured
- Webhook cards showing:
  - URL (truncated if long)
  - Enabled/disabled badge with status indicator
  - Delivery metadata: created, last delivery, last success, last failure
  - Consecutive failures warning (amber for 1-3, red for 4+)
- Security notice section with webhook best practices

Created `webhook-actions.tsx` with three client components:
- `DeleteWebhookButton` - confirmation dialog, deletes webhook with toast notification
- `RotateSecretButton` - rotates secret, displays new one once in dialog with copy button
- `ToggleWebhookSwitch` - custom styled toggle switch for enable/disable

Updated `dashboard-sidebar.tsx`:
- Added Webhooks link under Developer section (after API Keys)
- Imported Webhook icon from lucide-react

**Files:**
- `editor/src/app/(protected)/dashboard/webhooks/page.tsx` (318 lines)
- `editor/src/app/(protected)/dashboard/webhooks/webhook-actions.tsx` (291 lines)
- `editor/src/app/(protected)/dashboard-sidebar.tsx` (modified)

## Implementation Details

### Server Actions Pattern
All server actions follow the established pattern from API keys:
```typescript
// 1. Get session with auth.api.getSession({ headers: await headers() })
// 2. Validate organization access
// 3. Perform operation with Prisma
// 4. Call revalidatePath('/dashboard/webhooks')
// 5. Return result or error
```

### Show-Secret-Once Pattern
Both create and rotate operations show the secret exactly once:
- Secret displayed in code block with copy button
- Prominent amber warning message
- Dialog reset on close to clear secret from memory
- Copy button with visual confirmation (check icon)

### Webhook Card Layout
Each webhook card displays comprehensive status information:
- URL in monospace font with bg-white/[0.04] background
- Status badge: green for enabled (with pulse), gray for disabled
- Metadata grid: created, last delivery, last success, last failure
- Failure warning: shows consecutive failures count with color-coded severity
- Action buttons: toggle switch, rotate secret, delete (all with loading states)

### Visual Design
Follows established dashboard patterns:
- Dark theme with bg-white/[0.02] card backgrounds
- Border colors: border-border/50 for consistency
- Animations: fade-in and slide-in-from-bottom with staggered delays
- Icons: Webhook icon from lucide-react for consistency
- Status colors: green for success, amber for warnings, red for critical

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:

1. **TypeScript compilation** - No new errors introduced
2. **Server component** - `page.tsx` has no 'use client' directive
3. **Client components** - `create-dialog.tsx` and `webhook-actions.tsx` have 'use client'
4. **Exports verified**:
   - actions.ts: createWebhook, deleteWebhook, rotateWebhookSecret, toggleWebhook
   - webhook-actions.tsx: DeleteWebhookButton, RotateSecretButton, ToggleWebhookSwitch
   - create-dialog.tsx: CreateWebhookDialog
5. **Sidebar link** - Webhooks appears under Developer section
6. **File structure** - All 4 webhook files created in webhooks directory

## Success Criteria

All criteria met:

- ✅ User can navigate to /dashboard/webhooks from sidebar
- ✅ User can register webhook URL and sees secret displayed once with copy-to-clipboard
- ✅ User sees webhook list with URL, status, delivery metadata
- ✅ User can delete webhooks with confirmation dialog
- ✅ User can rotate secrets and see new secret once
- ✅ User can toggle webhooks enabled/disabled
- ✅ All mutations use server actions with session auth and organization scoping
- ✅ Follows established API keys dashboard visual pattern

## Integration Points

### Upstream Dependencies
- Phase 07-01: Uses `generateWebhookSecret()`, `validateWebhookUrl()` from webhook foundation
- Uses Prisma `webhookConfig` model from 07-01 schema
- Leverages Better Auth session from Phase 02

### Downstream Impact
- Dashboard sidebar now includes Webhooks link for all users
- Webhook secrets can be rotated from dashboard (in addition to REST API)
- Users can manage webhooks without using curl/Postman

## Self-Check: PASSED

**Files created:**
- FOUND: editor/src/app/(protected)/dashboard/webhooks/actions.ts
- FOUND: editor/src/app/(protected)/dashboard/webhooks/create-dialog.tsx
- FOUND: editor/src/app/(protected)/dashboard/webhooks/page.tsx
- FOUND: editor/src/app/(protected)/dashboard/webhooks/webhook-actions.tsx

**Files modified:**
- FOUND: editor/src/app/(protected)/dashboard-sidebar.tsx

**Commits:**
- FOUND: 554d3c3 (Task 1: webhook server actions and create dialog)
- FOUND: b5c125d (Task 2: webhooks page, actions, and sidebar)

All claims verified successfully.
