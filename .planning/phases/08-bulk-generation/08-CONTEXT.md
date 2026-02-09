# Phase 8: Bulk Generation - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Batch video rendering from CSV data or API arrays. Users can submit multiple renders at once, map CSV columns to template merge fields, track batch progress, and handle partial failures. Individual render infrastructure (Phase 4) and webhooks (Phase 7) are prerequisites.

</domain>

<decisions>
## Implementation Decisions

### CSV Mapping Flow
- Accessible from both a dedicated "Bulk Generate" dashboard page AND as a shortcut action from template detail pages
- Preview/dry-run required before rendering — show table of all rows with mapped data and validation status, user confirms before any renders start
- CSV upload is dashboard-only; the API accepts JSON arrays only (dashboard converts CSV to JSON internally)

### Batch Progress Tracking
- Batch progress integrated into existing Renders dashboard — batches appear as grouped entries, not a separate page
- Reuse existing SSE infrastructure — extend render SSE events to include batch-level aggregations via same connection with new event types
- Both individual downloads per render AND a "Download All" ZIP option for the full batch
- Batch completion notifications reuse existing toast/sound system — single notification when batch completes with success/failure summary

### Failure Handling
- "Retry Failed" button re-queues only failed renders — no need to re-upload CSV or re-render successes
- Each failed render shows its specific per-row error message (e.g., "Invalid image URL in row 47") for direct diagnosis

### Batch API Shape
- JSON-only API — POST /api/v1/renders/batch accepts array of merge data objects
- Tier-based batch size limits: Free: 10, Pro: 100, Enterprise: 1000 renders per request
- 202 Accepted returns batch ID immediately; client can poll GET /api/v1/batches/:id for status AND webhook fires if configured — flexible for different integration styles
- Individual renders within a batch appear in the regular /renders list tagged with batch ID, filterable by batch

### Claude's Discretion
- Column-to-field mapping approach (auto-match by name similarity vs manual mapping)
- CSV validation strategy (block entire upload vs flag rows and render valid ones)
- Batch progress display layout (summary with drill-down vs flat list)
- Batch failure policy (keep going vs stop on threshold)

</decisions>

<specifics>
## Specific Ideas

- CSV preview table should show validation status per row before submitting — users need confidence that their data is correct before burning render credits
- ZIP download for batch results mirrors the "export all" pattern users expect from bulk tools
- Reusing SSE and toast infrastructure keeps the experience consistent with individual render monitoring from Phase 5

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-bulk-generation*
*Context gathered: 2026-02-09*
