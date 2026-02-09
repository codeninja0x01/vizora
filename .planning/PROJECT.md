# OpenVideo Platform

## What This Is

A media automation SaaS platform — a more affordable alternative to Creatomate — that lets developers generate videos programmatically via API and lets creators design templates in a visual editor. Built on an existing high-performance browser-based video rendering engine with WebGL/WebCodecs, expanding into a full platform with authentication, billing, render queues, no-code integrations, and AI-native features like text-to-video and smart templates.

## Core Value

Developers and creators can create, templatize, and mass-produce professional videos at a fraction of Creatomate's cost, with AI-powered generation as the differentiator.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Video rendering engine with WebGL/WebCodecs — existing (packages/openvideo)
- ✓ Interactive editor with multi-track timeline, playback, selection — existing (editor/)
- ✓ Multiple media types: Video, Audio, Image, Text, Caption, Effect, Transition — existing
- ✓ GSAP-based animation system with keyframes — existing
- ✓ GLSL-based effects (blur, brightness, distort, chromakey) — existing
- ✓ GL-based transitions between clips (40+ presets) — existing
- ✓ Undo/redo with microdiff-based history — existing
- ✓ JSON serialization for project save/load — existing
- ✓ Node.js headless renderer for server-side rendering — existing (packages/node)
- ✓ AI assistant integration with Gemini (Google Genkit) — existing
- ✓ Speech-to-text transcription with Deepgram — existing
- ✓ Text-to-speech and audio generation with ElevenLabs — existing
- ✓ Stock media search via Pexels API — existing
- ✓ Cloud storage with Cloudflare R2 — existing
- ✓ Real-time preview in browser — existing
- ✓ Mirror animation support for edge-gap filling — existing (v0.1.2)

### Active

<!-- Current scope. Building toward these. -->

- [ ] REST API for programmatic video generation
- [ ] Template system — create, save, expose dynamic fields, render with data
- [ ] Pre-built template gallery for quick start
- [ ] User authentication with Better Auth (email/password + OAuth)
- [ ] User dashboard for managing projects, templates, and renders
- [ ] Tiered billing/subscriptions (Free/Pro/Enterprise) with Stripe
- [ ] Multi-tenant architecture with workspace isolation
- [ ] API key management for developer access
- [ ] Async render queue with job processing (BullMQ + Redis)
- [ ] Render worker infrastructure (separate from web app)
- [ ] Webhook notifications on render completion
- [ ] CSV bulk generation — upload spreadsheet, map to template, render all rows
- [ ] API batch endpoint — POST array of data objects, get batch renders
- [ ] Zapier integration for no-code automation
- [ ] Make (Integromat) integration for no-code automation
- [ ] Webhook triggers for third-party integrations
- [ ] AI text-to-video generation from prompts
- [ ] AI smart templates — auto-generate templates from descriptions
- [ ] AI voiceover generation integrated into render pipeline
- [ ] Usage tracking and rate limiting per tier
- [ ] Render status tracking and history

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Image-only generation (PNG/JPG) — Video-first for v1, add static image output later
- GIF output — Defer to v2, video MP4 covers primary use cases
- Mobile app — Web-first platform, mobile later
- Real-time collaborative editing — High complexity, not needed for automation-focused platform
- White-label/reseller — Focus on direct users first
- Custom domain for hosted forms — Defer to post-launch
- n8n / Pabbly integrations — Zapier + Make covers 90% of no-code users

## Context

OpenVideo started as an open-source video rendering library and editor. The rendering engine is mature — WebGL compositing, WebCodecs encoding, 40+ transitions, GLSL effects, GSAP animations, and a full interactive editor with timeline UI.

The Node.js headless renderer (`packages/node`) already provides server-side rendering capability, which becomes the foundation for the render worker infrastructure.

AI features (Gemini assistant, Deepgram transcription, ElevenLabs audio) are integrated but need expansion toward text-to-video and smart template generation.

The project is transitioning from open-source library to closed-source SaaS platform. The AGPL license was recently removed.

**Known technical debt:**
- Studio class is 2100+ lines with a 2000+ line `updateFrame()` method
- Playback speed control is non-functional
- Memory leak risks in video texture cache
- Limited test coverage (no E2E render pipeline tests)
- O(n) linear search in timeline model

## Constraints

- **Tech Stack**: TypeScript monorepo with Next.js, Pixi.js, WebCodecs — preserve existing architecture
- **Auth**: Better Auth for authentication
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel for web app, separate infrastructure for render workers
- **Storage**: Cloudflare R2 (already integrated)
- **Output Format**: MP4 video only for v1
- **Rendering**: Server-side via Node.js headless renderer (packages/node)
- **Queue**: BullMQ + Redis for async render job processing
- **Billing**: Stripe for tiered subscriptions

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Better Auth over Clerk/NextAuth | Modern OSS, good balance of control and convenience | — Pending |
| PostgreSQL + Prisma over Supabase | Proven stack, type safety, works with any deployment | — Pending |
| Vercel + separate workers | Web app and render workers have different scaling profiles | — Pending |
| Server-side render queue over serverless | No time limits, horizontal scaling, deterministic output | — Pending |
| Tiered plans over usage-based | Simpler to implement and understand, predictable revenue | — Pending |
| MP4-only for v1 | Focus on core video output, add image/GIF later | — Pending |
| AI as core differentiator | Text-to-video and smart templates differentiate from Creatomate | — Pending |
| Fully closed source | Monetize through SaaS, no OSS core | — Pending |
| Zapier + Make for no-code | Covers 90%+ of no-code automation users | — Pending |

---
*Last updated: 2026-02-09 after initialization*
