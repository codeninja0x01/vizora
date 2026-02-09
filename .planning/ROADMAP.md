# Roadmap: OpenVideo Platform

## Overview

OpenVideo transforms from an open-source rendering library into a production SaaS platform competing with Creatomate. The journey begins with a full visual overhaul of the existing editor, then builds multi-tenant infrastructure (auth, database, queue monitoring), the template system with JSON schema validation, async rendering with BullMQ workers, real-time progress tracking, storage with Cloudflare R2, API hardening with webhooks and rate limiting, bulk generation for automation, Stripe billing with usage metering, third-party platform connectivity via Zapier/Make, and AI features (voiceover, auto-subtitles, text-to-video) as the differentiator.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Editor Polish** - Full visual overhaul with modern design system (completed 2026-02-09)
- [ ] **Phase 2: Foundation & Auth** - Multi-tenant infrastructure with authentication
- [ ] **Phase 3: Template System** - Template CRUD with merge fields and validation
- [ ] **Phase 4: Async Rendering** - Queue-based rendering with worker processes
- [ ] **Phase 5: Render Progress & History** - Real-time updates and dashboard integration
- [ ] **Phase 6: Storage Integration** - Asset uploads and video delivery via R2
- [ ] **Phase 7: Webhooks** - Callback system for render completion
- [ ] **Phase 8: Bulk Generation** - Batch rendering and CSV import
- [ ] **Phase 9: Billing & Usage** - Stripe integration with metered usage
- [ ] **Phase 10: External Integrations** - Zapier and Make connectivity
- [ ] **Phase 11: AI Features** - Voiceover, subtitles, and text-to-video

## Phase Details

### Phase 1: Editor Polish
**Goal**: Editor has a modern, professional visual design that matches contemporary creative tools

**Depends on**: Nothing (first phase — pure frontend, no backend dependencies)

**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07

**Constraints**:
- MUST invoke `/frontend-design` skill before starting any UI implementation work in this phase
- All UI work in this phase follows the design direction established by the frontend-design skill

**Success Criteria** (what must be TRUE):
  1. Editor uses cohesive design system with consistent color palette, typography, and spacing across all panels
  2. All panels (timeline, properties, canvas, layers) have clear visual hierarchy with refined layout
  3. Toolbar, buttons, dropdowns, sliders, and inputs are polished with modern styling
  4. Timeline tracks have clear clip boundaries, smooth interactions, and professional appearance
  5. Dark theme with professional color palette suitable for creative work is applied throughout

**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md -- Design system foundation (tokens, theme, button variants)
- [x] 01-02-PLAN.md -- Activity bar and seamless panel layout
- [x] 01-03-PLAN.md -- Header and timeline toolbar polish
- [x] 01-04-PLAN.md -- Properties panel progressive disclosure
- [x] 01-05-PLAN.md -- Timeline canvas clip color coding and waveforms
- [x] 01-06-PLAN.md -- Visual verification checkpoint

---

### Phase 2: Foundation & Auth
**Goal**: Users can securely access the platform with multi-tenant isolation

**Depends on**: Nothing (independent of Phase 1)

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07

**Success Criteria** (what must be TRUE):
  1. User can create account with email/password and verify via email
  2. User can log in with GitHub or Google OAuth and session persists across browser refresh
  3. User can generate API keys from dashboard and use them to authenticate API requests
  4. User can revoke API keys and subsequent requests with revoked keys receive 401 response
  5. API requests are rate limited per tier with 429 responses including Retry-After header

**Plans**: 5 plans

Plans:
- [ ] 02-01-PLAN.md -- Database schema and Better Auth core configuration
- [ ] 02-02-PLAN.md -- Authentication UI pages and route protection
- [ ] 02-03-PLAN.md -- API key management utilities and dashboard
- [ ] 02-04-PLAN.md -- Rate limiting and API auth middleware
- [ ] 02-05-PLAN.md -- Integration verification checkpoint

---

### Phase 3: Template System
**Goal**: Users can create reusable templates with dynamic merge fields

**Depends on**: Phase 2

**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07, TMPL-08, DASH-01

**Success Criteria** (what must be TRUE):
  1. User can create a template from existing project and define merge fields with types (text, image, color, number)
  2. User can preview template with sample data before saving
  3. User can edit, update, and delete templates they own
  4. User can browse pre-built template gallery and clone templates to their account
  5. Template merge fields are validated via JSON schema and invalid data returns clear error

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 3`

---

### Phase 4: Async Rendering
**Goal**: Users can submit render jobs that process asynchronously via queue

**Depends on**: Phase 3

**Requirements**: RNDR-01, RNDR-02, RNDR-03, RNDR-04, RNDR-06, RNDR-07

**Success Criteria** (what must be TRUE):
  1. User can submit render via REST API (POST /api/v1/renders) with template ID and merge data
  2. Render jobs are queued with BullMQ and processed by separate worker processes
  3. User can poll render status (GET /api/v1/renders/:id) and receive queued/active/completed/failed state
  4. Render workers run as separate processes from web app and can scale horizontally
  5. Completed renders return MP4 video URL, failed renders return detailed error messages

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 4`

---

### Phase 5: Render Progress & History
**Goal**: Users can track render progress in real-time and view historical renders

**Depends on**: Phase 4

**Requirements**: RNDR-05, DASH-02

**Success Criteria** (what must be TRUE):
  1. User can stream real-time render progress updates (0-100%) via Server-Sent Events
  2. User can view dashboard showing all their renders with status and download links
  3. User can filter render history by status (completed, failed, in-progress) and search by template

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 5`

---

### Phase 6: Storage Integration
**Goal**: Users can upload assets and rendered videos are delivered via CDN

**Depends on**: Phase 4

**Requirements**: STOR-01, STOR-02, STOR-03, STOR-04

**Success Criteria** (what must be TRUE):
  1. User can upload assets via presigned URL for direct browser-to-R2 transfer
  2. User can list their uploaded assets and delete assets they no longer need
  3. Rendered videos are stored in Cloudflare R2 with CDN delivery URLs
  4. Rendered videos auto-delete after 30 days with notification before deletion

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 6`

---

### Phase 7: Webhooks
**Goal**: Users can receive automated callbacks when renders complete

**Depends on**: Phase 4

**Requirements**: WHBK-01, WHBK-02, WHBK-03, WHBK-04

**Success Criteria** (what must be TRUE):
  1. User can register webhook URL in dashboard for render completion callbacks
  2. Webhook payloads include render status (done/failed), output URL, and metadata
  3. Webhooks include HMAC signature that user can verify for authenticity
  4. Failed webhooks retry with exponential backoff (5s, 25s, 125s, 625s, 3125s)

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 7`

---

### Phase 8: Bulk Generation
**Goal**: Users can generate videos in bulk from CSV data or batch API

**Depends on**: Phase 7

**Requirements**: BULK-01, BULK-02, BULK-03, BULK-04

**Success Criteria** (what must be TRUE):
  1. User can submit batch renders via API (POST /api/v1/renders/batch) with array of merge data
  2. User can upload CSV file, map columns to template fields, and render all rows
  3. User can track batch progress showing overall completion and individual job statuses
  4. Batch renders respect concurrent limits per subscription tier

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 8`

---

### Phase 9: Billing & Usage
**Goal**: Users can subscribe to paid plans with usage-based credit tracking

**Depends on**: Phase 8

**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06, DASH-03

**Success Criteria** (what must be TRUE):
  1. User can subscribe to a plan (Free/Pro/Enterprise) via Stripe Checkout
  2. Each render deducts credits from user's balance with clear notification when credits low
  3. User receives clear error when credits exhausted and cannot submit renders until refilled
  4. User can manage subscription via Stripe Customer Portal (upgrade, downgrade, cancel)
  5. Failed payments suspend rendering access with email notification and retry prompts

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 9`

---

### Phase 10: External Integrations
**Goal**: Users can trigger renders from Zapier/Make and receive completion events

**Depends on**: Phase 7

**Requirements**: WHBK-05, WHBK-06, WHBK-07

**Success Criteria** (what must be TRUE):
  1. User can trigger renders from Zapier workflows using OpenVideo action
  2. User can trigger renders from Make (Integromat) scenarios using OpenVideo module
  3. Render completion triggers Zapier/Make workflows via webhook callback
  4. Integration modules are published in Zapier App Directory and Make platform

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 10`

---

### Phase 11: AI Features
**Goal**: Users can enhance videos with AI voiceover, auto-subtitles, and text-to-video

**Depends on**: Phase 4

**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05

**Success Criteria** (what must be TRUE):
  1. User can add AI voiceover to renders via TTS with voice selection and script input
  2. Auto-generated subtitles appear with word-level timing synced to audio
  3. User can choose subtitle styles (font, color, position) from preset templates
  4. User can generate video from text prompt using text-to-video AI
  5. User can auto-generate templates from text descriptions

**Plans**: TBD

Plans:
- Plans to be defined during `/gsd:plan-phase 11`

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Editor Polish | 6/6 | ✓ Complete | 2026-02-09 |
| 2. Foundation & Auth | 0/5 | Planned | - |
| 3. Template System | 0/TBD | Not started | - |
| 4. Async Rendering | 0/TBD | Not started | - |
| 5. Render Progress & History | 0/TBD | Not started | - |
| 6. Storage Integration | 0/TBD | Not started | - |
| 7. Webhooks | 0/TBD | Not started | - |
| 8. Bulk Generation | 0/TBD | Not started | - |
| 9. Billing & Usage | 0/TBD | Not started | - |
| 10. External Integrations | 0/TBD | Not started | - |
| 11. AI Features | 0/TBD | Not started | - |
