# Phase 10: External Integrations - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Build integration modules for n8n, Zapier, and Make that let users trigger video renders and receive completion events from external automation workflows. Leverages existing REST API and webhook system from Phases 7-8.

</domain>

<decisions>
## Implementation Decisions

### Auth in integrations
- API key authentication — users paste their `sk_live_` key from the OpenVideo dashboard
- Connection test endpoint required — hit a lightweight endpoint (e.g., GET /api/v1/me) to verify the key before saving
- After connecting, show organization name + plan tier (e.g., "Acme Corp (Pro)")
- Clear rate limit errors with retry guidance — Zapier/n8n can auto-retry on 429s

### Actions & triggers
- **Actions exposed:**
  - Render Video — submit single render with template ID + merge data (maps to POST /api/v1/renders). Returns immediately (async, not polling)
  - List Templates — fetch available templates for dynamic dropdown selection
  - Get Render Status — poll a specific render by ID
- **Triggers exposed:**
  - Render Completed — fires when a render finishes successfully. Maps to existing webhook system
- **Not included this phase:** Batch Render action, Render Failed trigger, generic Any Render Event trigger
- Render Completed trigger payload: minimal — render ID and status URL only (not full payload with video URL and merge data)

### Dynamic field mapping
- Dynamic fields loaded per template — after user selects a template, integration fetches its merge fields and renders them as input fields
- Template dropdown shows org-owned templates plus cloned gallery templates
- All merge fields shown including optional ones, with default values as placeholder hints
- Merge field types map to platform-native input types where supported (color picker for color, number input for numbers, text for text)

### Platform priority & approach
- **Build order:** n8n first, then Zapier, then Make
- **n8n:** Community node published as npm package (n8n-nodes-openvideo). No approval process needed
- **Zapier:** Private/invite-only first for beta validation, then submit for public App Directory listing
- **Make:** Third priority, built after Zapier using same patterns

### Claude's Discretion
- Exact n8n node implementation patterns (credential type, node type structure)
- Zapier CLI vs Platform UI for app development
- Make module packaging format
- Shared integration logic abstraction between platforms
- Error message formatting per platform conventions
- Webhook subscription management (REST hooks vs polling)

</decisions>

<specifics>
## Specific Ideas

- n8n prioritized because OpenVideo targets developers — aligns with open-source, self-hosted audience
- API key auth (not OAuth) keeps it simple and matches existing API auth pattern
- Minimal trigger payload to keep integrations lightweight — users fetch details with Get Render Status if needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-external-integrations*
*Context gathered: 2026-02-09*
