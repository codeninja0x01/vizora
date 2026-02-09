---
phase: 08-bulk-generation
plan: 05
subsystem: batch-ui
tags: [batch-progress, ui, sse-events, bulk-generation]
dependency_graph:
  requires: [08-02-batch-api, 08-03-batch-events]
  provides: [batch-dashboard-ui, batch-notifications]
  affects: [renders-dashboard]
tech_stack:
  added: []
  patterns: [collapsible-ui, batch-grouping, event-driven-updates]
key_files:
  created:
    - editor/src/components/render/batch-card.tsx
  modified:
    - editor/src/app/(protected)/dashboard/renders/actions.ts
    - editor/src/app/(protected)/dashboard/renders/render-list.tsx
    - editor/src/app/(protected)/dashboard/renders/render-filters.tsx
    - editor/src/components/render/render-event-provider.tsx
    - editor/src/hooks/use-render-events.ts
decisions:
  - "Batches appear as grouped entries in existing renders dashboard (not separate page)"
  - "Batch card collapsible UI: collapsed shows summary, expanded shows individual renders"
  - "Both individual per-render downloads AND Download All ZIP option provided"
  - "Retry Failed button re-queues only failed renders without re-uploading CSV"
  - "Batch completion triggers single toast with success/failure summary, not per-render toasts"
  - "Batch progress events are silent (no toasts), only state updates for live progress"
  - "Individual batch renders hidden from standalone render list to prevent duplication"
metrics:
  duration: 5m 19s
  completed_at: 2026-02-09T20:34:14Z
  tasks_completed: 2
  files_created: 1
  files_modified: 5
---

# Phase 08 Plan 05: Batch Progress Dashboard Integration Summary

Batch progress tracking integrated into renders dashboard with grouped entries, retry/download actions, and completion notifications.

## What Was Built

### BatchCard Component (New)
- **Collapsed state**: Shows template thumbnail, batch name, total count, progress bar, status badge, relative time
- **Expanded state**: Grid of individual renders with row index badges, status icons, error messages, download links
- **Progress bar**: Always visible showing completion percentage and counts
- **Action buttons**:
  - "Retry X Failed": Re-queues only failed renders via `retryFailedBatch` server action
  - "Download All (ZIP)": Direct link to `/api/v1/batches/{id}/zip` endpoint
  - Individual download links for each completed render within expanded view

### Server Actions (actions.ts)
- **`getBatches(filters)`**: Fetches batches with template info and all renders, computes progress aggregation
- **`retryFailedBatch(batchId)`**: Resets failed renders to queued, re-queues via `queueBatchRenders`, updates batch status to processing
- **`getRenders` extended**: Now includes `batchId` and `batchIndex` fields for batch association

### Render List Updates
- **Batch/render merging**: Fetches both batches and renders, filters out batch renders from standalone list, merges and sorts by `createdAt`
- **SSE event handling**: Handles `batch.progress` (silent state update) and `batch.completed` (triggers toast/refetch)
- **Refetch on update**: BatchCard retry action triggers batch refetch for immediate UI sync

### Event Provider Notifications
- **`batch.completed` handler**: Shows success toast with completion sound if all succeeded, error toast with counts if partial failure
- **Toast deduplication**: Uses `batch-complete-{batchId}` and `batch-partial-{batchId}` IDs to prevent duplicates
- **Completion sound**: Reuses existing Web Audio playCompletionSound (880Hz sine, 150ms) for batch completions

### Filter Enhancement
- **Optional batchId filter**: Infrastructure added (hidden by default, shows chip when active with clear button)
- **Filter chip UI**: Displays truncated batch ID with X button to clear filter

## Technical Implementation

### Batch Grouping Pattern
```typescript
// Filter standalone renders (exclude batch renders)
const standaloneRenders = useMemo(() => {
  return renders.filter((r) => !r.batchId);
}, [renders]);

// Merge batches and standalone renders, sorted by date
const mergedItems = useMemo(() => {
  const items = [
    ...standaloneRenders.map((r) => ({ type: 'render', data: r })),
    ...batches.map((b) => ({ type: 'batch', data: b })),
  ];
  return items.sort((a, b) =>
    new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
  );
}, [standaloneRenders, batches]);
```

### Retry Failed Pattern
```typescript
// Fetch failed renders with merge data
const batch = await prisma.batch.findFirst({
  where: { id: batchId, organizationId: activeOrgId },
  include: {
    renders: {
      where: { status: 'failed' },
      select: { id: true, mergeData: true, batchIndex: true },
    },
  },
});

// Reset to queued and re-queue
await prisma.render.updateMany({
  where: { id: { in: failedRenderIds } },
  data: { status: 'queued', failedAt: null, errorCategory: null, errorMessage: null },
});

await queueBatchRenders(
  failedRenders.map(r => ({ id: r.id, mergeData: r.mergeData, batchIndex: r.batchIndex })),
  batchId, templateId, userId, organizationId
);
```

### Event Type Extension
```typescript
interface RenderEvent {
  type: 'connected' | 'progress' | 'completed' | 'failed' | 'batch.progress' | 'batch.completed';
  data?: {
    batchId?: string;
    batchProgress?: {
      total: number;
      queued: number;
      processing: number;
      completed: number;
      failed: number;
      percentComplete: number;
    };
  };
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

### Created
- `editor/src/components/render/batch-card.tsx` (351 lines)
  - Collapsible batch card component with progress, actions, and individual render list

### Modified
- `editor/src/app/(protected)/dashboard/renders/actions.ts`
  - Added `getBatches()` server action returning batches with computed progress
  - Added `retryFailedBatch(batchId)` server action for re-queuing failed renders
  - Extended `getRenders()` to include `batchId` and `batchIndex` fields

- `editor/src/app/(protected)/dashboard/renders/render-list.tsx`
  - Added `batches` state and `getBatches()` fetch on filter change
  - Implemented batch/render merging with `standaloneRenders` filter and `mergedItems` sort
  - Added `batch.progress` and `batch.completed` SSE event handlers
  - Conditional rendering for BatchCard vs RenderCard based on item type

- `editor/src/app/(protected)/dashboard/renders/render-filters.tsx`
  - Added optional `batchId` prop and filter chip UI
  - Added `onBatchIdChange` callback for clearing batch filter

- `editor/src/components/render/render-event-provider.tsx`
  - Added `batch.progress` event listener (silent)
  - Added `batch.completed` event listener with success/error toast and completion sound

- `editor/src/hooks/use-render-events.ts`
  - Extended `RenderEvent` interface with `batch.progress` and `batch.completed` types
  - Added `batchId` and `batchProgress` fields to event data

## Commits

1. **03b5626** - `feat(08-05): batch card component and updated render list with batch grouping`
   - BatchCard component with collapsible UI
   - getBatches and retryFailedBatch server actions
   - Render list merging logic
   - Batch filter infrastructure
   - Extended RenderEvent types

2. **5dc472e** - `feat(08-05): batch completion notifications and event handling`
   - batch.completed event handler with toasts
   - Success/error notification logic
   - Completion sound integration

## Self-Check: PASSED

**Created files verified:**
```bash
[ -f "editor/src/components/render/batch-card.tsx" ] && echo "FOUND"
```
✅ FOUND: editor/src/components/render/batch-card.tsx

**Commits verified:**
```bash
git log --oneline --all | grep "03b5626\|5dc472e"
```
✅ FOUND: 03b5626 feat(08-05): batch card component and updated render list with batch grouping
✅ FOUND: 5dc472e feat(08-05): batch completion notifications and event handling

**Key features verified:**
✅ BatchCard component shows collapsed summary with progress bar
✅ BatchCard expands to show individual renders
✅ Retry Failed button calls retryFailedBatch server action
✅ Download All ZIP link present in BatchCard
✅ Render list merges batches and standalone renders by date
✅ Batch renders filtered from standalone list (no duplication)
✅ batch.completed event triggers toast with success/failure summary
✅ Completion sound plays for successful batch completion

## Integration Points

### Upstream Dependencies
- **08-02 (Batch REST API)**: Uses `/api/v1/batches/{id}/zip` endpoint for Download All
- **08-03 (Batch SSE Events)**: Consumes `batch.progress` and `batch.completed` events from render-events SSE stream
- **05-04 (Render Progress)**: Extends existing render-events infrastructure and RenderEventProvider pattern

### Downstream Effects
- **Renders Dashboard**: Now shows batches as grouped entries alongside individual renders
- **User Workflow**: Batch management (view progress, retry failures, download outputs) fully integrated into existing renders page

## Success Criteria Met

✅ Batches appear as grouped entries in renders dashboard (not separate page)
✅ Batch card shows template name, progress bar, status badge, expand/collapse
✅ Expanded view shows individual renders with status, errors, download links
✅ "Retry Failed" re-queues only failed renders with one click
✅ "Download All" links to ZIP endpoint for direct download
✅ Batch completion triggers single toast with success/failure summary
✅ Render list merges batches and standalone renders by date
✅ Individual batch renders hidden from standalone list

## Notes

- **Per-render error display**: Each failed render within expanded batch card shows its specific error message (e.g., "Invalid image URL in row 47") with row badge
- **Download flexibility**: Users can download individual renders OR entire batch ZIP, providing both granular and bulk access
- **Silent progress updates**: `batch.progress` events update UI state without toasting to avoid notification spam during active batch processing
- **Retry optimization**: Failed renders retain their original merge data and batch index, enabling efficient re-queue without CSV re-upload
- **Event-driven consistency**: SSE events ensure batch state updates in real-time across all tabs/windows viewing the dashboard
