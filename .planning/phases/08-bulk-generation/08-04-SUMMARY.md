---
phase: 08-bulk-generation
plan: 04
subsystem: dashboard-ui
tags: [bulk-generation, csv-upload, field-mapping, validation]

dependency_graph:
  requires:
    - 08-02-batch-api
    - lib/batch/field-matcher
    - lib/batch/queue
  provides:
    - dashboard/bulk-generate-wizard
    - csv-to-template-mapping-ui
  affects:
    - dashboard-sidebar
    - template-cards

tech_stack:
  added:
    - papaparse (client-side CSV parsing)
    - ajv (JSON Schema validation)
  patterns:
    - Multi-step wizard with state machine
    - Client-side CSV parsing with BOM handling
    - Auto-mapping with confidence scoring
    - Per-row validation with flag-and-continue strategy

key_files:
  created:
    - editor/src/app/(protected)/dashboard/bulk-generate/page.tsx
    - editor/src/app/(protected)/dashboard/bulk-generate/csv-uploader.tsx
    - editor/src/app/(protected)/dashboard/bulk-generate/field-mapper.tsx
    - editor/src/app/(protected)/dashboard/bulk-generate/preview-table.tsx
    - editor/src/app/(protected)/dashboard/bulk-generate/actions.ts
  modified:
    - editor/src/app/(protected)/dashboard-sidebar.tsx
    - editor/src/app/(protected)/dashboard/templates/template-card.tsx
    - editor/package.json

decisions:
  - CSV upload is dashboard-only (API is JSON-only per user decision)
  - PapaParse client-side parsing (not server-side)
  - BOM stripping for Excel compatibility (research pitfall #1)
  - Auto-mapping threshold 0.4 Dice coefficient (balances precision and coverage)
  - Flag-and-continue validation strategy (invalid rows unchecked by default, not blocked)
  - URL param ?templateId enables template card shortcuts
  - Tier enforcement uses most recent API key (Organization model has no tier field)

metrics:
  duration: 398s
  completed_at: "2026-02-09T20:35:16Z"
---

# Phase 8 Plan 4: Bulk Generate Dashboard Page Summary

CSV upload wizard with auto-mapping, per-row validation, and batch submission integrated into dashboard navigation and template shortcuts.

## What Was Built

**Multi-step wizard** (5 steps):
1. Select Template (dropdown with merge field count, URL param pre-select)
2. Upload CSV (PapaParse client-side parsing, BOM stripping, drag-and-drop)
3. Map Fields (auto-match with confidence badges, manual override dropdowns)
4. Preview (validation table, row toggles, summary bar, flag-and-continue)
5. Submitted (success screen with batch ID and navigation)

**Server actions** (`actions.ts`):
- `getTemplatesForBulk()`: Fetch user templates with merge fields/schema for dropdown
- `submitBatch()`: Create Batch + Render records, queue via queueBatchRenders, enforce tier limits

**CSV uploader** (`csv-uploader.tsx`):
- Drag-and-drop + file input
- PapaParse with `header: true`, `dynamicTyping: true`, `skipEmptyLines: 'greedy'`
- BOM stripping via `transformHeader: (h) => h.replace(/^\uFEFF/, '').trim()`
- File info display (filename, row count, column count)

**Field mapper** (`field-mapper.tsx`):
- Auto-mapping on mount via `autoMapFields` (string-similarity)
- Confidence badges (green > 0.7, yellow > 0.4)
- Manual override dropdowns (all template fields + "Unmapped")
- Mapping output: `Record<string, string>` of csvColumn → templateFieldKey

**Preview table** (`preview-table.tsx`):
- Per-row validation against merge schema (ajv)
- Status indicators (green checkmark / red X with error tooltip)
- Row toggle checkboxes (valid rows checked by default, invalid unchecked)
- Summary bar: "X of Y rows valid" + "Z selected for submission"
- "Submit X renders" button filters to selected valid rows

**Navigation updates**:
- Sidebar: Added "Bulk Generate" link (FileSpreadsheet icon) after Renders
- Template cards: Added Bulk Generate button linking to `/dashboard/bulk-generate?templateId=xxx`

## Verification

1. TypeScript compilation: ✅ No errors after installing ajv
2. Multi-step wizard: ✅ 5 steps with state machine (select-template → upload-csv → map-fields → preview → submitted)
3. PapaParse: ✅ Client-side parsing with BOM stripping (`transformHeader`)
4. Auto-mapping: ✅ Confidence badges, pre-selected dropdowns
5. Preview validation: ✅ Per-row status, row toggles, summary bar
6. Server actions: ✅ getTemplatesForBulk and submitBatch
7. Navigation: ✅ Sidebar link and template card shortcuts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing ajv dependency**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** ajv is a transitive dependency via @genkit-ai but not directly in package.json, causing import errors
- **Fix:** Installed ajv@^8.17.1 via pnpm
- **Files modified:** editor/package.json, pnpm-lock.yaml
- **Commit:** b247097

**2. [Rule 1 - Bug] Organization.tier field does not exist**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** actions.ts tried to read tier from Organization model, but tier only exists on ApiKey model
- **Fix:** Changed submitBatch to query most recent API key for tier (or default to 'free')
- **Files modified:** editor/src/app/(protected)/dashboard/bulk-generate/actions.ts
- **Commit:** b247097

**3. [Rule 1 - Bug] Batch.userId field does not exist**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** actions.ts tried to set userId on Batch creation, but Batch model only has organizationId and templateId
- **Fix:** Removed userId from Batch.create data
- **Files modified:** editor/src/app/(protected)/dashboard/bulk-generate/actions.ts
- **Commit:** b247097

**4. [Rule 2 - Critical] PreviewTable component created early**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** page.tsx imports PreviewTable, but plan designated it for Task 2
- **Fix:** Created PreviewTable component during Task 1 to enable compilation (logical dependency)
- **Files modified:** editor/src/app/(protected)/dashboard/bulk-generate/preview-table.tsx
- **Commit:** b247097 (Task 1)

## Key Decisions

1. **CSV parsing**: Client-side with PapaParse (not server-side) for immediate feedback and no file upload delays
2. **BOM handling**: Strip `\uFEFF` from first header via transformHeader for Excel compatibility (research pitfall #1)
3. **Auto-mapping threshold**: 0.4 Dice coefficient (per 08-01 decision, balances precision and coverage)
4. **Validation strategy**: Flag-and-continue (invalid rows unchecked but not blocked, per user decision)
5. **Tier enforcement**: Use most recent API key tier (Organization has no tier field)
6. **URL parameter**: ?templateId enables template card shortcuts to pre-select template and auto-advance

## Integration Points

**Upstream dependencies:**
- `lib/batch/field-matcher.ts`: autoMapFields for column-to-field suggestions
- `lib/batch/queue.ts`: queueBatchRenders for batch submission
- `lib/batch/types.ts`: BATCH_SIZE_LIMITS, ValidationResult
- Prisma models: Batch, Render, Template, ApiKey

**Downstream consumers:**
- Sidebar navigation links to `/dashboard/bulk-generate`
- Template cards link to `/dashboard/bulk-generate?templateId=xxx`
- Server actions create Batch + Render records consumed by render queue worker

## Testing Notes

**Manual testing checklist:**
- [ ] Navigate to /dashboard/bulk-generate via sidebar
- [ ] Navigate via template card shortcut (pre-selects template)
- [ ] Upload CSV with various encodings (UTF-8, UTF-8 BOM, Excel)
- [ ] Verify auto-mapping with similar column names (confidence badges)
- [ ] Override auto-mapping with dropdowns
- [ ] Verify per-row validation (valid/invalid status)
- [ ] Toggle row selection (valid rows checked by default)
- [ ] Submit batch and verify redirect to renders page
- [ ] Check batch creation in database
- [ ] Verify tier limits enforced (free: 10, pro: 100, enterprise: 1000)

**Edge cases:**
- Empty CSV (should show error)
- CSV with no headers (should show error)
- CSV with mismatched column counts (PapaParse handles gracefully)
- All rows invalid (submit button disabled when no rows selected)
- Mixed valid/invalid rows (flag-and-continue strategy)

## Performance Considerations

- Client-side CSV parsing (no server upload delay)
- Auto-mapping runs once on mount (not per keystroke)
- Validation runs once on mount (not per checkbox toggle)
- Tier query uses most recent API key (single DB query)

## Next Steps

After this plan, Phase 8 (Bulk Generation) is complete:
- ✅ 08-01: Batch processing utilities
- ✅ 08-02: Batch REST API endpoints
- ✅ 08-03: Batch SSE events and ZIP download
- ✅ 08-04: Dashboard bulk generate page

Phase 9 (AI Generation) or Phase 10 (Video Trimming) would follow per roadmap.

---

## Self-Check: PASSED

**Files created:**
- ✅ editor/src/app/(protected)/dashboard/bulk-generate/page.tsx
- ✅ editor/src/app/(protected)/dashboard/bulk-generate/csv-uploader.tsx
- ✅ editor/src/app/(protected)/dashboard/bulk-generate/field-mapper.tsx
- ✅ editor/src/app/(protected)/dashboard/bulk-generate/preview-table.tsx
- ✅ editor/src/app/(protected)/dashboard/bulk-generate/actions.ts

**Commits verified:**
- ✅ b247097: Task 1 (CSV uploader, field mapper, preview table, server actions)
- ✅ a82f412: Task 2 (sidebar navigation, template card shortcuts)
