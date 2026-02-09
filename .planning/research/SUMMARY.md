# Project Research Summary

**Project:** OpenVideo SaaS Platform
**Domain:** Media Automation SaaS (Video Rendering API)
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

OpenVideo is a media automation SaaS platform competing with Creatomate and Shotstack. The product combines a visual template editor with a REST API for programmatic video generation. Research shows this domain follows established patterns: Next.js for API gateway, BullMQ for async rendering queue, PostgreSQL with Row-Level Security for multi-tenant isolation, and Cloudflare R2 for zero-egress video storage. The core rendering engine already exists; the challenge is building production-grade SaaS infrastructure around it.

The recommended approach is incremental: start with multi-tenant foundation (auth, database, queue), add template system with JSON schema validation, implement async rendering with BullMQ workers, expose REST API with rate limiting, integrate Stripe for billing, and finally add third-party integrations via Zapier/Make. This order minimizes rework while addressing critical pitfalls early (multi-tenant data leakage, memory leaks, connection pool exhaustion).

Key risks include PixiJS memory leaks in the existing renderer (must fix in Phase 1), BullMQ job stalling (needs monitoring from day 1), and multi-tenant data leakage via incorrect tenant context (requires RLS at database level, not just application filtering). The stack research is high confidence with recent package versions and official documentation. Feature research clearly identifies table stakes (REST API, webhooks, bulk generation) versus differentiators (AI voiceover, smart templates). Architecture patterns are well-documented with proven implementations.

## Key Findings

### Recommended Stack

Next.js 15 App Router provides the foundation, using Server Actions for internal mutations and Route Handlers for external APIs. Prisma 7 with adapter pattern solves serverless connection pooling issues. Better Auth handles authentication with native multi-tenancy support (organizations, teams, member management). BullMQ on Redis manages async rendering jobs with retry logic and priority queues. Stripe provides subscription billing with metered usage. Cloudflare R2 offers S3-compatible storage with zero egress fees (critical for video delivery).

**Core technologies:**
- **Next.js 15 + React 19 + TypeScript 5:** Full-stack framework with App Router for clean API/UI separation, end-to-end type safety
- **PostgreSQL 15+ + Prisma 7:** Managed database (Neon/Vercel Postgres) with driver adapters for serverless, JSONB for template schemas, pgvector for future AI features
- **Better Auth 1.4.18:** Framework-agnostic auth with organizations/teams built-in, social login, 2FA, TypeScript-first
- **BullMQ 5.67.3 + Redis 6.2+:** Production-proven job queue for video transcoding, supports priorities/retries/rate limiting, scales to millions of jobs
- **Stripe 20.3.1:** Industry standard SaaS billing with metered usage, customer portal, webhook events for subscription lifecycle
- **Cloudflare R2:** S3-compatible storage with zero egress fees (S3 charges $0.09/GB), presigned URLs for direct client uploads
- **Upstash Rate Limiting:** HTTP-based rate limiting for serverless/edge, works in Vercel Edge Middleware
- **Google Genkit:** AI orchestration for text-to-speech (multi-speaker TTS), future video generation (Veo models)

**Critical version requirements:**
- Prisma 7 requires `@prisma/adapter-pg` for serverless (no more direct connections)
- Next.js 15 requires React 19 (Server Actions not fully compatible with React 18)
- BullMQ 5.x requires Redis 6.2+ for stability (works with 4+ but not recommended)

### Expected Features

Research identified clear feature tiers based on competitor analysis (Creatomate, Shotstack, Bannerbear, Placid).

**Must have (table stakes):**
- REST API with render endpoints (x-api-key auth, rate limiting, webhook callbacks)
- Visual template editor with drag-and-drop, merge fields, timeline view
- Template system with JSON schema for dynamic content (variable definition, type validation, preview)
- Webhook callbacks on render completion (POST with status: done/failed, retry logic)
- Multiple output formats (MP4, PNG initially; GIF, JPG in v1.x)
- Bulk/batch generation (CSV import, batch API, concurrent render limits)
- Usage-based pricing with tiers (credits per render, Stripe metered billing)
- Render status polling (GET /renders/:id, state machine: queued/active/completed/failed)
- Asset storage with CDN (30-day auto-delete standard, presigned URLs)
- Email support (shared inbox or ticketing system)

**Should have (competitive):**
- AI voiceover + auto-subtitles (project already has TTS, add subtitle generation with word-level timestamps)
- Stock media search integration (already implemented, tight editor integration is differentiator)
- Bulk data feed system (spreadsheet UI, CSV import, map fields to template variables like Creatomate's "feed rows")
- Custom fonts & brand kit (font upload, brand asset management, apply-to-all)
- Template version control (Git-like versioning, diff view, rollback)
- Interactive preview SDK (embed template preview in customer's app with iframe + postMessage)
- Multi-language support (translation API + multi-language TTS)

**Defer (v2+):**
- Smart templates (AI-powered layout adaptation based on content length, aspect ratio, duration - HIGH complexity)
- Speech-to-text editing (edit video by editing transcript like Descript - niche audience)
- Render acceleration (priority queue, dedicated workers - unclear if customers pay premium)
- Real-time collaborative editing (Figma-style - high complexity, minimal value per competitor analysis)

**Anti-features to avoid:**
- Built-in video hosting platform (bandwidth costs explode; Shotstack auto-deletes after 30 days for this reason)
- Team collaboration with roles/permissions (both Creatomate and Shotstack explicitly don't offer this)
- White-label fully customizable UI (maintenance nightmare; prefer Embed SDK approach like Shotstack Studio SDK)
- Direct Google Sheets/Airtable integrations (auth maintenance burden; route through Zapier/Make for 8,000 apps)

### Architecture Approach

Standard Next.js monorepo with separate worker processes. Next.js handles API gateway (Route Handlers for public APIs, Server Actions for internal mutations) and serves Editor UI. BullMQ queues distribute async jobs (render, webhook delivery, billing sync) to separate Node.js worker processes that can scale independently. PostgreSQL with Row-Level Security enforces multi-tenant isolation at database level. Redis serves dual purpose: queue backend and rate limiting. Cloudflare R2 stores rendered videos with presigned URLs for direct browser uploads.

**Major components:**
1. **Next.js Monorepo** — Editor UI, API gateway, SSR pages with App Router + React Server Components
2. **Auth Service** — Better Auth with PostgreSQL adapter, middleware-based route protection, organizations/teams
3. **Template Service** — Template CRUD, JSON schema validation with Zod, field resolution, dynamic composition
4. **Job Management Service** — Job creation, status tracking, progress updates via Redis pub/sub + SSE
5. **BullMQ Queues** — Async job distribution (render-queue, webhook-queue, billing-queue), retry logic, priority handling
6. **Render Workers** — Separate Node.js processes consuming render-queue, execute rendering with packages/node, upload to R2
7. **Webhook Workers** — Deliver webhooks with exponential backoff (5s → 25s → 125s → 625s → 3125s), idempotency via event IDs
8. **Billing Service** — Stripe integration with event-sourcing pattern for credit tracking, usage metering, webhook handling
9. **Storage Service** — R2 presigned URL generation for uploads, CDN integration, 30-day TTL cleanup
10. **PostgreSQL + Prisma** — Multi-tenant data with RLS policies, connection pooling via adapters, JSONB for template schemas

**Key patterns:**
- Multi-tenant isolation via PostgreSQL Row-Level Security (not just application filtering)
- Producer-consumer with BullMQ (API enqueues, workers process)
- Template system with JSON schema (flexible, no code changes for new templates)
- Direct browser upload with presigned URLs (reduces server load, cost savings)
- Webhook delivery with exponential backoff (reliable integration with Zapier/Make)
- Real-time progress with Server-Sent Events (simpler than WebSockets for unidirectional updates)
- Billing sync with event sourcing (immutable events, audit trail, Stripe reconciliation)

### Critical Pitfalls

Research identified 7 critical pitfalls from production deployments of similar systems.

1. **Render Queue Jobs Stuck in Active State** — BullMQ jobs get stuck when workers crash without cleanup. Without proper monitoring, queue stops processing while failed jobs accumulate. **Prevention:** Set explicit `lockDuration`/`stalledInterval`, implement health checks monitoring active job age, use separate worker processes (not sandboxed mode which leaks memory), add job timeouts, monitor Redis memory with `maxmemory-policy allkeys-lru`.

2. **Video Texture Memory Leaks in PixiJS/WebCodecs** — PixiJS instances remain in memory after views close. TextureCache accumulates textures. RenderTexture GPU memory leaks even after destroy(). Causes crashes after 10-50 videos. **Prevention:** Manually call `PIXI.utils.clearTextureCache()` after each render, destroy with cleanup options, manually null `renderGroup`, always call `videoFrame.close()` in finally blocks, implement memory monitoring with 80% threshold alerts, force GC between renders.

3. **Multi-Tenant Data Leakage via Tenant Context** — Single forgotten WHERE clause leaks data cross-tenant. Connection pool reuse with wrong tenant context. Admin paths bypass RLS. Silent failures. **Prevention:** Set `tenant_id` session variable on every request, use Prisma middleware to inject tenant filter, enable `FORCE ROW LEVEL SECURITY` on all tables, never use superuser for app queries, add integration tests verifying tenant isolation.

4. **Stripe Webhook Retries Failing Silently** — Webhooks arrive out of order, duplicate webhooks cause double-billing, failed handlers delay ALL invoice finalization for 72 hours, no idempotency checks cause access grants without payment. **Prevention:** Return 200 immediately and queue for async processing, store `event.id` to detect duplicates, verify webhook signature with `stripe.webhooks.constructEvent()`, handle failed payments explicitly, monitor webhook failures in Stripe Dashboard.

5. **Prisma Connection Pool Exhaustion in Serverless** — Each Lambda creates PrismaClient with pool (default 2-10 connections). Traffic spike spawns 100 instances = 200-1000 connections. Database hits max connections, API returns 500s. **Prevention:** Set `connection_limit=1` per function in DATABASE_URL, use PgBouncer or Prisma Accelerate, set Lambda concurrency limit, reuse PrismaClient across invocations, monitor connection count.

6. **Template Duration Calculation Requires Pre-Probing** — Like Shotstack, if you require FFmpeg probing for clip durations before rendering, template system becomes complex. Can't build dynamic slideshow templates without two-pass rendering. **Prevention:** Design template system with relative timestamps and auto-duration like Creatomate, let engine calculate clip end times, support "fill remaining time" for last clip, probe assets once during upload and cache duration in database.

7. **No Rate Limiting on Resource-Intensive Render Endpoint** — User sends 1000 concurrent render requests, queue fills, all workers busy, Redis memory explodes, database connections exhausted, system crashes. **Prevention:** Multi-level rate limiting (per user/tier, per endpoint, system-wide), use Redis for distributed limiting, return 429 with Retry-After header, show queue position in API response, implement priority queue by tier, monitor with alerts at queue size > 500.

## Implications for Roadmap

Based on research, suggested phase structure follows ARCHITECTURE.md build order recommendations while addressing PITFALLS.md warnings early.

### Phase 1: Foundation (Core Infrastructure)
**Rationale:** Everything depends on auth + database. Multi-tenant isolation must be correct from day 1. Address memory leaks in existing renderer before adding SaaS features. BullMQ monitoring prevents queue stalling issues.

**Delivers:**
- Prisma schema with multi-tenant RLS policies (tenant_id on all tables)
- Better Auth integration (GitHub/Google OAuth, organizations, teams, API keys)
- Connection pooling setup (Prisma adapters, PgBouncer if needed)
- BullMQ infrastructure with health monitoring (Redis, job watchdog, stalled job alerts)
- Memory leak fixes in PixiJS renderer (manual texture cache clearing, destroy cleanup)
- Basic API structure (/api/v1/*, versioned from day 1)

**Addresses:**
- Pitfall 3: Multi-tenant data leakage (RLS at database level)
- Pitfall 5: Connection pool exhaustion (adapter pattern, pool limits)
- Pitfall 2: Memory leaks (fix before scale)
- Pitfall 1: Queue stalling (monitoring from start)

**Stack elements:** PostgreSQL + Prisma 7 + Better Auth + BullMQ + Redis + Next.js 15

**Estimated:** 2-3 weeks

**Research needs:** Standard patterns, skip `/gsd:research-phase`

### Phase 2: Template System
**Rationale:** Needed before rendering can work. Independent of queue/workers. Design with relative timestamps (not absolute) to avoid Shotstack's probing complexity. JSON schema provides flexibility without code changes.

**Delivers:**
- Template CRUD API (create, read, update, delete templates)
- JSON schema validation with Zod (field types: text, image, color, number)
- Template field definition UI (merge fields, type validation, sample data)
- Template preview with sample data
- Template storage in PostgreSQL JSONB column

**Addresses:**
- Pitfall 6: Template duration complexity (design with auto-duration, not probing)
- Feature requirement: Template system with merge fields (table stakes)

**Stack elements:** Zod for validation, PostgreSQL JSONB, TypeScript types

**Estimated:** 1-2 weeks

**Research needs:** Standard patterns, skip `/gsd:research-phase`

### Phase 3: Async Rendering (Queue + Workers)
**Rationale:** Proves rendering works end-to-end. Async architecture from start (no synchronous MVP). Addresses queue stalling with proper monitoring. Separate worker processes for horizontal scaling.

**Delivers:**
- Job creation API (POST /api/v1/renders)
- Render queue with BullMQ (priority, retries, backoff)
- Separate render worker process (consumes queue, executes packages/node)
- Job status API (GET /api/v1/renders/:id)
- Progress updates via Redis pub/sub
- Worker auto-restart with PM2 or equivalent
- Queue health monitoring dashboard

**Addresses:**
- Pitfall 1: Queue job stalling (monitoring, health checks, timeouts)
- Pitfall 2: Memory leaks during rendering (cleanup between jobs)
- Feature requirement: Render status polling (table stakes)

**Stack elements:** BullMQ, Redis pub/sub, separate Node.js worker processes

**Estimated:** 2 weeks

**Research needs:** Standard patterns, skip `/gsd:research-phase`

### Phase 4: Real-Time Progress
**Rationale:** Nice UX improvement, depends on queue architecture. Server-Sent Events simpler than WebSockets for unidirectional updates.

**Delivers:**
- SSE endpoint (GET /api/v1/jobs/:id/progress)
- Progress streaming from Redis pub/sub
- Client EventSource integration
- Progress percentage updates (0% → 100%)

**Addresses:**
- Feature requirement: Real-time progress indicator (UX improvement)
- Architecture pattern: SSE for unidirectional server-to-client updates

**Stack elements:** Server-Sent Events, Redis pub/sub

**Estimated:** 3-5 days

**Research needs:** Standard patterns, skip `/gsd:research-phase`

### Phase 5: Storage Integration
**Rationale:** Enables asset uploads for templates. Presigned URLs reduce server bandwidth costs. 30-day TTL matches industry standard (Shotstack, Creatomate).

**Delivers:**
- R2 presigned URL generation for uploads (POST /api/v1/uploads/presigned)
- Direct browser-to-R2 uploads
- Rendered video storage in R2
- CDN configuration for video delivery
- 30-day auto-delete TTL
- Asset management API (list, delete user uploads)

**Addresses:**
- Feature requirement: Asset storage with CDN (table stakes)
- Cost optimization: Zero egress fees with R2 vs. S3
- Architecture pattern: Presigned URLs for direct uploads

**Stack elements:** Cloudflare R2, AWS SDK v3, presigned URLs

**Estimated:** 3-5 days

**Research needs:** Standard patterns, skip `/gsd:research-phase`

### Phase 6: API Layer Hardening
**Rationale:** Before public launch, API needs rate limiting to prevent abuse. Webhook callbacks required for async notification pattern.

**Delivers:**
- Rate limiting with Upstash (per user, per tier, system-wide)
- Edge Middleware for rate limiting (lightweight, fast)
- 429 responses with Retry-After headers
- Queue position in API responses
- Priority queues by subscription tier
- Webhook callback system (POST to customer URL on completion)
- Webhook delivery worker with retry logic
- Webhook signature generation for security

**Addresses:**
- Pitfall 7: No rate limiting (prevent abuse, queue overflow)
- Feature requirement: Webhook callbacks (table stakes)
- Architecture pattern: Webhook delivery with exponential backoff

**Stack elements:** Upstash Rate Limiting, BullMQ webhook queue

**Estimated:** 1 week

**Research needs:** Standard patterns, skip `/gsd:research-phase`

### Phase 7: Bulk Generation
**Rationale:** High-value feature for customers. Requires queue system from Phase 3. CSV import reduces friction for non-technical users.

**Delivers:**
- Batch API (POST /api/v1/renders/batch with array of render configs)
- CSV import endpoint (parse CSV, map columns to template fields)
- Batch status tracking (overall progress, individual job statuses)
- Concurrent render limits per user/tier
- Batch completion webhook (when all jobs done)

**Addresses:**
- Feature requirement: Bulk/batch generation (table stakes)
- Feature requirement: CSV import for batch (should have)

**Stack elements:** BullMQ batch processing, CSV parser

**Estimated:** 1 week

**Research needs:** Standard patterns, skip `/gsd:research-phase`

### Phase 8: Billing Integration
**Rationale:** Monetization layer. Depends on job tracking for usage metering. Event sourcing pattern enables audit trail and Stripe reconciliation.

**Delivers:**
- Stripe subscription setup (Checkout Sessions, Customer Portal)
- Usage metering (credit tracking, Stripe usage records)
- Webhook receiver (POST /api/webhooks/stripe)
- Webhook signature verification
- Event sourcing for billing events (immutable, audit trail)
- Failed payment handling (suspend access, retry logic)
- Billing worker for Stripe sync
- Credit system (deduct credits per render, track balance)

**Addresses:**
- Pitfall 4: Webhook retry failures (idempotency, async processing)
- Feature requirement: Usage-based pricing (table stakes)
- Architecture pattern: Event sourcing for billing

**Stack elements:** Stripe SDK, webhook verification, BullMQ billing queue

**Estimated:** 1-2 weeks

**Research needs:** Stripe best practices well-documented, skip `/gsd:research-phase`

### Phase 9: External Integrations
**Rationale:** Polish for third-party ecosystem. Depends on webhook system from Phase 6. Zapier/Make provide 8,000 apps with single integration.

**Delivers:**
- Zapier integration module (trigger on render complete, action to create render)
- Make (Integromat) integration module
- API documentation for integrations
- Webhook testing UI for customers
- Integration examples and templates

**Addresses:**
- Feature requirement: Zapier/Make integrations (table stakes)
- Architecture pattern: Outbound webhooks to no-code platforms

**Stack elements:** Zapier Developer Platform, Make webhook modules

**Estimated:** 1 week

**Research needs:** Zapier/Make docs are comprehensive, skip `/gsd:research-phase`

### Phase 10: AI Features (Differentiators)
**Rationale:** Leverages existing TTS capability. Auto-subtitles are high-value social media feature. Differentiates from competitors.

**Delivers:**
- AI voiceover with Google Genkit (multi-speaker TTS, configurable voices)
- Auto-subtitle generation (word-level timestamps, style presets)
- Subtitle timing sync with audio waveform
- Template fields for voiceover script
- Subtitle style editor (font, color, position, trending social media styles)

**Addresses:**
- Feature requirement: AI voiceover + auto-subtitles (differentiator)
- Stack element: Google Genkit for TTS

**Stack elements:** Google Genkit, @genkit-ai/google-genai

**Estimated:** 1-2 weeks

**Research needs:** Google Genkit integration for TTS + subtitle generation may need `/gsd:research-phase` for timing sync complexity

### Phase Ordering Rationale

Phase order follows dependency graph from ARCHITECTURE.md:
- Phase 1 (Foundation) enables all other phases (auth, database, queue infrastructure)
- Phase 2 (Templates) required before rendering
- Phase 3 (Async Rendering) depends on Phase 1 + 2
- Phase 4 (Real-time Progress) enhances Phase 3 (optional but valuable UX)
- Phase 5 (Storage) parallel to rendering, enables asset uploads
- Phase 6 (API Hardening) required before public launch (rate limiting, webhooks)
- Phase 7 (Bulk Generation) builds on Phase 3 + 6
- Phase 8 (Billing) monetization after core features work
- Phase 9 (Integrations) depends on Phase 6 webhooks
- Phase 10 (AI Features) differentiators after table stakes complete

This grouping avoids pitfalls by:
- Fixing memory leaks (Phase 1) before scaling rendering (Phase 3)
- Implementing RLS (Phase 1) before adding features that query data
- Adding rate limiting (Phase 6) before public API launch
- Building webhook infrastructure (Phase 6) correctly with idempotency before billing (Phase 8)

### Research Flags

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1:** Foundation patterns well-documented (Prisma RLS, Better Auth, BullMQ)
- **Phase 2:** Template CRUD is standard REST API pattern
- **Phase 3:** BullMQ worker patterns extensively documented
- **Phase 4:** SSE patterns standard for progress updates
- **Phase 5:** Presigned URL patterns well-established (AWS SDK docs)
- **Phase 6:** Rate limiting and webhook delivery are proven patterns
- **Phase 7:** CSV parsing and batch processing are standard
- **Phase 8:** Stripe integration extremely well-documented
- **Phase 9:** Zapier/Make integration docs comprehensive

Phases likely needing deeper research:
- **Phase 10 (AI Features):** Google Genkit TTS integration is newer technology (v1.x). Auto-subtitle generation with word-level timestamp sync may have complexity. Recommend `/gsd:research-phase` for subtitle timing sync approach.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs (Next.js 15, Prisma 7, BullMQ), npm package versions verified (published 2-10 days ago), active maintenance. Better Auth is newer (MEDIUM-HIGH) but officially recommended by Next.js/Nuxt/Astro. |
| Features | MEDIUM-HIGH | Based on competitor analysis (Creatomate, Shotstack, Bannerbear, Placid) and their pricing pages. Clear patterns emerge. Table stakes vs. differentiators validated across 4 competitors. Anti-features confirmed by absence in competitor offerings. |
| Architecture | HIGH | Standard Next.js SaaS patterns with extensive documentation. BullMQ, multi-tenant RLS, presigned URLs are proven patterns with production case studies. Phase build order from architecture research is dependency-based and logical. |
| Pitfalls | MEDIUM | Verified with official documentation where available (BullMQ GitHub issues, PixiJS issues, AWS/Stripe docs). Some findings from community blog posts and troubleshooting guides (UX pitfalls, performance traps). Memory leak warnings specific to PixiJS v8 require verification during implementation. |

**Overall confidence:** HIGH

The stack is modern and well-documented. The feature set is validated by competitor analysis. The architecture follows proven patterns. The main uncertainty is PixiJS memory leak severity - requires load testing during Phase 1 to quantify and potentially consider Diffusion Studio's approach (replace PixiJS with custom 2D context + WebCodecs).

### Gaps to Address

Gaps that need validation during implementation:

- **PixiJS Memory Leak Severity:** Research shows memory leaks exist, but unclear if manual cleanup (clearTextureCache, destroy options) is sufficient or if architectural change (replace PixiJS) is required. **Action:** Load test in Phase 1 with 100-video render sequence, monitor memory, decide whether cleanup is sufficient or replacement needed.

- **Cloudflare R2 Streaming Restrictions:** Some 2024 community sources suggest R2 may discourage high-volume streaming, but 2026 official docs don't indicate restrictions. **Action:** Confirm with Cloudflare during Phase 5 storage integration whether video streaming at scale (TB/month) has undocumented restrictions.

- **Better Auth Multi-Tenant Edge Cases:** Better Auth is newer than Auth.js. While it has native organization/team support, edge cases (member role changes, invitation expiry, organization transfer) may have less battle-testing than Auth.js. **Action:** Review Better Auth organization API docs closely during Phase 1, add integration tests for multi-tenant scenarios, have fallback plan to Auth.js if critical gaps found.

- **Google Genkit TTS Subtitle Timing:** Genkit provides TTS with voice config, but word-level timestamp generation for subtitle sync is unclear from research. **Action:** Research during Phase 10 planning whether Genkit provides timestamps or if separate speech recognition needed (Google Speech-to-Text API).

- **Next.js 15 Production Stability:** Next.js 15 is recent (released 2025). While App Router is stable, serverless deployment patterns with Prisma 7 adapters may have edge cases. **Action:** Deploy test project to Vercel in Phase 1 to verify serverless function + Prisma adapter + connection pooling works as expected.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Next.js 15 Documentation](https://nextjs.org/docs) — App Router, Server Actions, Route Handlers, Edge Middleware
- [Prisma ORM 7.2.0 Release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) — Driver adapters, serverless patterns
- [BullMQ Documentation](https://docs.bullmq.io) — Queue architecture, worker patterns, job lifecycle
- [Better Auth Documentation](https://www.better-auth.com/docs/introduction) — Authentication framework, multi-tenant setup
- [Stripe API Documentation](https://docs.stripe.com) — Subscriptions, webhooks, metered billing
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/) — S3-compatible API, presigned URLs
- [Google Genkit Documentation](https://genkit.dev/docs/integrations/google-genai/) — AI orchestration, TTS models

**npm Package Versions (verified 2026-02-09):**
- better-auth: 1.4.18 (published 10 days ago)
- prisma: 7.3.0 (published 18 days ago)
- bullmq: 5.67.3 (published 3 days ago)
- stripe: 20.3.1 (published 2 days ago)
- pixi.js: 8.15.0 (published 3 hours ago)
- @upstash/ratelimit: 2.0.8 (published 1 month ago)

### Secondary (MEDIUM confidence)

**Competitor Research:**
- [Creatomate Pricing 2026](https://creatomate.com/pricing) — Tier structure, credit pricing, feature breakdown
- [Shotstack API Reference](https://shotstack.io/docs/api/) — REST API patterns, webhook format
- [Bannerbear Features](https://www.bannerbear.com/) — Batch generation, integrations
- [Placid Features](https://placid.app/features) — Template system, output formats

**Architecture Patterns:**
- [Multi-tenant PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) — AWS blog on RLS patterns
- [BullMQ Production Patterns](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view) — 2026 implementation guide
- [Stripe SaaS Integration](https://docs.stripe.com/saas) — Official SaaS architecture patterns
- [Next.js SaaS Architecture](https://dev.to/shayan_saed/the-ultimate-guide-to-software-architecture-in-nextjs-from-monolith-to-microservices-i2c) — Monolith to microservices guide

**Pitfall Sources:**
- [BullMQ Stalled Jobs Debug](https://upqueue.io/blog/bullmq-stalled-jobs-debug-guide/) — Production troubleshooting guide
- [PixiJS Memory Leak Issues](https://github.com/pixijs/pixijs/issues/10533) — GitHub issue thread with workarounds
- [Stripe Failed Payments Handling](https://benfoster.io/blog/stripe-failed-payments-how-to/) — Production patterns
- [Webhook Best Practices](https://www.svix.com/resources/webhook-best-practices/retries/) — Idempotency, retries

### Tertiary (LOW confidence)

**Community Comparisons:**
- [Creatomate vs Shotstack Comparison](https://www.plainlyvideos.com/blog/creatomate-review) — Feature comparison (marketing content)
- [Best Video Automation Tools 2026](https://thinkpeak.ai/top-10-best-video-automation-tools-2026/) — Industry landscape
- [Diffusion Studio replacing PixiJS](https://github.com/diffusionstudio/core/releases) — Alternative rendering approach (needs verification)

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
