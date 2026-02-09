# Requirements: OpenVideo Platform

**Defined:** 2026-02-09
**Core Value:** Developers and creators can create, templatize, and mass-produce professional videos at a fraction of Creatomate's cost, with AI-powered generation as the differentiator.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Access

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in with GitHub or Google OAuth
- [ ] **AUTH-03**: User session persists across browser refresh
- [ ] **AUTH-04**: User can generate API keys for programmatic access
- [ ] **AUTH-05**: User can revoke API keys
- [ ] **AUTH-06**: API requests are rate limited per user's subscription tier
- [ ] **AUTH-07**: Rate-limited requests receive 429 response with Retry-After header

### Template System

- [ ] **TMPL-01**: User can create a template from an existing project
- [ ] **TMPL-02**: User can define merge fields with types (text, image, color, number)
- [ ] **TMPL-03**: User can preview template with sample data
- [ ] **TMPL-04**: User can edit and update saved templates
- [ ] **TMPL-05**: User can delete templates they own
- [ ] **TMPL-06**: User can browse pre-built template gallery
- [ ] **TMPL-07**: User can clone a gallery template to their account
- [ ] **TMPL-08**: Template merge fields are validated via JSON schema

### Rendering & API

- [ ] **RNDR-01**: User can submit render via REST API (POST /api/v1/renders)
- [ ] **RNDR-02**: Render jobs are processed asynchronously via BullMQ queue
- [ ] **RNDR-03**: User can poll render status (GET /api/v1/renders/:id)
- [ ] **RNDR-04**: Render workers run as separate processes from web app
- [ ] **RNDR-05**: User can stream real-time render progress via SSE
- [ ] **RNDR-06**: Render output is MP4 video
- [ ] **RNDR-07**: Failed renders return error details in status response

### Storage & Delivery

- [ ] **STOR-01**: Rendered videos are stored in Cloudflare R2 with CDN delivery
- [ ] **STOR-02**: Rendered videos auto-delete after 30 days
- [ ] **STOR-03**: User can upload assets via presigned URL (direct browser-to-R2)
- [ ] **STOR-04**: User can list and delete their uploaded assets

### Webhooks & Integrations

- [ ] **WHBK-01**: User can register webhook URL for render completion callbacks
- [ ] **WHBK-02**: Webhook payloads include render status and output URL
- [ ] **WHBK-03**: Webhooks include signature for verification
- [ ] **WHBK-04**: Failed webhooks retry with exponential backoff
- [ ] **WHBK-05**: User can trigger renders from Zapier
- [ ] **WHBK-06**: User can trigger renders from Make (Integromat)
- [ ] **WHBK-07**: Render completion triggers Zapier/Make workflows

### Bulk Generation

- [ ] **BULK-01**: User can submit batch renders via API (POST /api/v1/renders/batch)
- [ ] **BULK-02**: User can upload CSV to map rows to template fields and render all
- [ ] **BULK-03**: User can track batch progress (overall + individual jobs)
- [ ] **BULK-04**: Batch renders respect concurrent limits per tier

### Billing & Usage

- [ ] **BILL-01**: User can subscribe to a plan (Free/Pro/Enterprise) via Stripe
- [ ] **BILL-02**: Each render deducts credits from user's balance
- [ ] **BILL-03**: User receives clear error when credits exhausted
- [ ] **BILL-04**: User can manage subscription via Stripe Customer Portal
- [ ] **BILL-05**: Usage resets on billing cycle
- [ ] **BILL-06**: Failed payments suspend rendering access with notification

### AI Features

- [ ] **AI-01**: User can add AI voiceover to renders via TTS
- [ ] **AI-02**: Auto-generated subtitles with word-level timing
- [ ] **AI-03**: User can choose subtitle styles (font, color, position)
- [ ] **AI-04**: User can generate video from text prompt (text-to-video)
- [ ] **AI-05**: User can auto-generate templates from text descriptions

### Dashboard & UX

- [ ] **DASH-01**: User can view dashboard with projects, templates, and renders
- [ ] **DASH-02**: User can view render history with statuses and download links
- [ ] **DASH-03**: User can view API usage analytics (calls, credits, rate limits)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Tenancy

- **MTNT-01**: User can create organizations with workspace isolation
- **MTNT-02**: User can invite team members to organization
- **MTNT-03**: Organization data isolated via Row-Level Security

### Template Enhancements

- **TMPE-01**: User can upload custom fonts for templates
- **TMPE-02**: User can create brand kits (colors, logos, fonts)
- **TMPE-03**: User can view template version history and rollback

### Rendering Enhancements

- **RNDE-01**: User can request priority rendering (higher tier)
- **RNDE-02**: User can export GIF output format
- **RNDE-03**: User can export PNG/JPG image output from video frame

### Bulk Enhancements

- **BLKE-01**: User can manage feed data sources (spreadsheet-like UI)
- **BLKE-02**: User can schedule recurring bulk generations

### AI Enhancements

- **AIE-01**: User can edit video by editing transcript (speech-to-text editing)
- **AIE-02**: Templates auto-adapt layout based on content length/aspect ratio

### Integrations

- **INTE-01**: User can test webhooks from dashboard UI
- **INTE-02**: Interactive preview SDK for embedding in customer apps

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | High complexity, minimal value — most templates designed by one person then automated |
| Built-in video hosting platform | Bandwidth costs explode — 30-day TTL + export to user storage instead |
| Team roles/permissions | Creatomate and Shotstack explicitly skip this — API keys per user sufficient |
| White-label customizable UI | Maintenance nightmare — prefer Embed SDK approach |
| Direct Google Sheets/Airtable integrations | Auth maintenance burden — Zapier/Make covers 8,000 apps |
| Mobile app | Web-first platform, mobile later |
| GIF output (v1) | Video MP4 covers primary use cases, add in v2 |
| Image-only generation (v1) | Video-first for v1, add static image output in v2 |
| n8n / Pabbly integrations | Zapier + Make covers 90% of no-code users |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| TMPL-01 | Phase 2 | Pending |
| TMPL-02 | Phase 2 | Pending |
| TMPL-03 | Phase 2 | Pending |
| TMPL-04 | Phase 2 | Pending |
| TMPL-05 | Phase 2 | Pending |
| TMPL-06 | Phase 2 | Pending |
| TMPL-07 | Phase 2 | Pending |
| TMPL-08 | Phase 2 | Pending |
| RNDR-01 | Phase 3 | Pending |
| RNDR-02 | Phase 3 | Pending |
| RNDR-03 | Phase 3 | Pending |
| RNDR-04 | Phase 3 | Pending |
| RNDR-05 | Phase 4 | Pending |
| RNDR-06 | Phase 3 | Pending |
| RNDR-07 | Phase 3 | Pending |
| STOR-01 | Phase 5 | Pending |
| STOR-02 | Phase 5 | Pending |
| STOR-03 | Phase 5 | Pending |
| STOR-04 | Phase 5 | Pending |
| WHBK-01 | Phase 6 | Pending |
| WHBK-02 | Phase 6 | Pending |
| WHBK-03 | Phase 6 | Pending |
| WHBK-04 | Phase 6 | Pending |
| WHBK-05 | Phase 9 | Pending |
| WHBK-06 | Phase 9 | Pending |
| WHBK-07 | Phase 9 | Pending |
| BULK-01 | Phase 7 | Pending |
| BULK-02 | Phase 7 | Pending |
| BULK-03 | Phase 7 | Pending |
| BULK-04 | Phase 7 | Pending |
| BILL-01 | Phase 8 | Pending |
| BILL-02 | Phase 8 | Pending |
| BILL-03 | Phase 8 | Pending |
| BILL-04 | Phase 8 | Pending |
| BILL-05 | Phase 8 | Pending |
| BILL-06 | Phase 8 | Pending |
| AI-01 | Phase 10 | Pending |
| AI-02 | Phase 10 | Pending |
| AI-03 | Phase 10 | Pending |
| AI-04 | Phase 10 | Pending |
| AI-05 | Phase 10 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0

**Coverage validated:** All 51 v1 requirements mapped to exactly one phase.

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after roadmap creation*
