# Technology Stack

**Project:** OpenVideo SaaS Platform
**Researched:** 2026-02-09
**Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x | Full-stack framework | App Router with Server Actions for internal mutations, Route Handlers for public APIs, Edge Middleware support, built-in optimizations. De facto standard for React + TypeScript SaaS. |
| TypeScript | 5.x | Type safety | End-to-end type safety from database to UI. Zod schemas provide both compile-time types and runtime validation. |
| React | 19.x | UI library | Latest concurrent features, Server Components for optimal performance, extensive ecosystem. |

**Rationale:** Next.js 15 App Router provides the best DX for SaaS with Server Actions for internal app logic (mutations, revalidations) and Route Handlers for external-facing APIs (webhooks, public endpoints). This separation keeps architecture clean while maintaining end-to-end type safety.

**Important:** In Next.js 15, GET Route Handlers default to dynamic (uncached). Use `export const dynamic = 'force-static'` explicitly for static routes.

### Database Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PostgreSQL | 15+ | Primary database | Industry standard for SaaS, supports JSONB for template schemas, pgvector for AI embeddings, robust ACID guarantees. |
| Prisma | 7.3.0 | ORM | Type-safe queries, excellent DX, automatic migrations. v7 is Rust-free (better DX, no binary issues), 98% fewer types (faster), requires driver adapters for production. |
| @prisma/adapter-pg | latest | PostgreSQL adapter | Required for Prisma 7+ serverless deployments. Use with connection pooling. |
| Neon or Vercel Postgres | - | Managed PostgreSQL | Vercel Postgres now runs on Neon. Provides autoscaling, scale-to-zero, database branching, pgvector support. Perfect for serverless. |

**Connection Pooling:**
```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
```

**Vercel Pattern:** With Vercel's Fluid Compute, use `attachDatabasePool()` to ensure idle connections are released before functions suspend. Multiple invocations share a single function instance, enabling connection reuse without manual lifecycle management.

**Rationale:** Prisma 7 with adapter pattern solves serverless connection issues. Neon provides PostgreSQL with features SaaS needs: autoscaling, pgvector for AI, database branching for preview deployments. Single database for relational data + embeddings (no separate vector DB needed).

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Better Auth | 1.4.18 | Authentication framework | Framework-agnostic, comprehensive feature set (social login, 2FA, organizations, invitations), excellent TypeScript support, actively maintained, recommended by Next.js/Nuxt/Astro. |

**Key Features:**
- Social login: GitHub, Google, Discord, Twitter, etc.
- Multi-tenant: Organizations, teams, member management with access control
- Session management with secure defaults
- Email/password + passwordless options
- Two-factor authentication
- Built-in UI components for React/Vue/Svelte

**Rationale:** Better Auth is purpose-built for modern TypeScript SaaS. Unlike Auth.js (formerly NextAuth), it's designed for multi-tenancy from the ground up. Active development (v1.4.18 published 10 days ago), growing ecosystem, and official framework recommendations signal strong community momentum.

**Alternative Considered:** Auth.js - More established but lacks native multi-tenant features. Better Auth's organization/team APIs are critical for SaaS.

### Queue System

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| BullMQ | 5.67.3 | Job queue | Production-proven for video transcoding, built on Redis Streams (more scalable than Bull v3), supports priorities, retries, delayed jobs, rate limiting, events. Powers millions of jobs at scale. |
| Redis | 6.2+ (7+ recommended) | Queue backend | BullMQ requires Redis 4+, but 6.2+ recommended for production. Upstash Redis for serverless, or Redis Labs/AWS ElastiCache for dedicated. |
| ioredis | 5.x | Redis client | BullMQ's default client, excellent TypeScript support, connection pooling, cluster support. |

**Queue Architecture:**
```typescript
// Producer (Next.js API Route)
import { Queue } from 'bullmq'

const renderQueue = new Queue('video-render', {
  connection: { host: 'localhost', port: 6379 }
})

await renderQueue.add('render-video', {
  templateId: '...',
  data: {...}
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
})

// Worker (separate process/server)
import { Worker } from 'bullmq'

const worker = new Worker('video-render', async (job) => {
  // Headless rendering logic
}, { connection: { host: 'localhost', port: 6379 } })
```

**Scaling Pattern:** Run multiple workers across different machines. BullMQ distributes jobs round-robin. For millions of jobs/day, use Redis Cluster and monitor queue latency.

**Rationale:** BullMQ is the standard for async video processing. Built on Redis Streams (not lists like Bull v3), providing better reliability and performance. Active maintenance (5.67.3 published 3 days ago). Critical features: job retries with exponential backoff, priority queues, rate limiting, comprehensive events for monitoring.

### Billing & Subscriptions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Stripe | 20.3.1 (Node.js SDK) | Payment processing | Industry standard for SaaS billing, comprehensive subscription APIs, Stripe Checkout for hosted payment pages, Customer Portal for self-service, webhooks for lifecycle events. |
| @stripe/stripe-js | latest | Client-side Stripe | For embedding payment forms, type-safe Stripe.js wrapper. |

**Key Integration Pattern:**
```typescript
// API Route: Create checkout session
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  success_url: 'https://...',
  cancel_url: 'https://...',
})

// Webhook handler for events
const event = stripe.webhooks.constructEvent(
  body, signature, process.env.STRIPE_WEBHOOK_SECRET
)

switch (event.type) {
  case 'customer.subscription.created':
  case 'customer.subscription.updated':
  case 'customer.subscription.deleted':
  case 'invoice.payment_failed':
    // Update database via Prisma
}
```

**Critical:** Backend MUST stay in sync with Stripe via webhooks. Subscriptions are long-lived objects that change over time (renewals, cancellations, upgrades, failed payments). Never rely on client-side state alone.

**Rationale:** Stripe is the de facto SaaS billing solution. Handles complex subscription logic (prorations, trials, coupons), regulatory compliance (SCA, tax), and provides production-grade webhooks. Active SDK updates (20.3.1 published 2 days ago). Templates like `vercel/nextjs-subscription-payments` provide battle-tested patterns.

### Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Cloudflare R2 | - | Object storage | S3-compatible, zero egress fees (critical for video delivery), global CDN included, presigned URLs for secure uploads/downloads. |
| @aws-sdk/client-s3 | 3.x | S3 client | R2 is S3-compatible, use official AWS SDK. Mature, type-safe, comprehensive. |
| @aws-sdk/s3-request-presigner | 3.x | Presigned URLs | Generate temporary upload/download URLs without exposing credentials. For direct client-to-R2 uploads. |
| @aws-sdk/lib-storage | 3.x | Multipart uploads | Required for files >5MB. Handles chunking automatically. |

**Presigned URL Pattern:**
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

// Generate upload URL (server-side)
const command = new PutObjectCommand({
  Bucket: 'videos',
  Key: `renders/${videoId}.mp4`,
})
const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
// Send uploadUrl to client for direct upload
```

**Rationale:** R2's zero egress fees make it ideal for video SaaS (S3 charges 0.09/GB egress). S3 compatibility means using AWS SDK (most mature ecosystem). Presigned URLs enable secure client uploads without proxying through server. For video streaming, R2 supports range requests.

**Note:** Some community sources suggest R2 may discourage high-volume streaming, but official docs don't indicate restrictions. Monitor usage and confirm with Cloudflare for production scale.

### AI Features

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Google Genkit | 1.x | AI orchestration | Production-ready AI framework from Google/Firebase, supports video generation (Veo models), text-to-speech with multiple voices, middleware for retries/fallbacks, TypeScript-first. |
| @genkit-ai/google-genai | latest | Google AI plugin | Access to Gemini models, Veo video generation, multi-speaker TTS with voice config. |

**Key Capabilities:**
- **Video Generation:** Veo models generate videos from text prompts or manipulate images
- **Voice Synthesis:** Multi-speaker TTS with configurable voices (Puck, Charon, Kore, etc.), pitch/speed control, auto language detection
- **Middleware:** Retry logic, fallback models, rate limiting built-in

**Example:**
```typescript
import { genkit } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'

const ai = genkit({
  plugins: [googleAI()],
})

// Text-to-speech with voice config
const audio = await ai.generate({
  model: 'gemini-2.0-flash-exp',
  config: {
    response_modalities: ['AUDIO'],
    speech_config: {
      voice_config: { prebuilt_voice_config: { voice_name: 'Puck' } }
    }
  },
  prompt: 'Script for video voiceover...'
})
```

**Rationale:** Genkit is Google's production AI SDK, used internally. Better suited for video SaaS than generic SDKs (OpenAI, Anthropic) because it includes video generation models (Veo) and multi-speaker TTS. Middleware system handles production concerns (retries, fallbacks). Built by Firebase team = long-term support.

### API Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js Route Handlers | - | Public APIs | For webhooks, external API endpoints, OAuth callbacks. Standard HTTP with Request/Response APIs. |
| Server Actions | - | Internal mutations | For app mutations (form submissions, revalidations). Automatic type safety, simpler than API routes for internal use. |
| tRPC | 11.x (optional) | Type-safe internal APIs | For complex internal APIs or monorepo architectures. End-to-end type inference, no code generation, Zod integration. |
| Zod | 3.x | Schema validation | Runtime validation + compile-time type inference. Critical for public APIs and Server Actions. |

**Decision Matrix:**

| Use Case | Technology | Why |
|----------|-----------|-----|
| External API (developers consume) | Route Handlers | RESTful HTTP, OpenAPI docs, broad compatibility |
| Webhooks (Stripe, Zapier, Make) | Route Handlers | Standard HTTP POST, signature verification |
| Internal app mutations | Server Actions | Simplest, automatic type safety, no boilerplate |
| Complex internal APIs | tRPC (optional) | If monorepo or many client-server calls, tRPC reduces boilerplate |

**Route Handler Pattern (External API):**
```typescript
// app/api/render/route.ts
import { z } from 'zod'

const schema = z.object({
  templateId: z.string().uuid(),
  data: z.record(z.unknown()),
})

export async function POST(req: Request) {
  // Validate
  const body = await req.json()
  const validated = schema.parse(body) // Throws on invalid

  // Add to queue
  await renderQueue.add('render-video', validated)

  return Response.json({ success: true, jobId: '...' })
}
```

**Server Action Pattern (Internal):**
```typescript
'use server'
import { z } from 'zod'

const schema = z.object({ name: z.string() })

export async function createTemplate(formData: FormData) {
  const validated = schema.parse({
    name: formData.get('name')
  })

  const template = await prisma.template.create({ data: validated })
  revalidatePath('/templates')
  return { success: true, template }
}
```

**Rationale:** Next.js 15 provides two API patterns optimized for different use cases. Server Actions are simpler for internal mutations (form submissions, database updates) because they eliminate API route boilerplate and provide automatic type safety. Route Handlers are necessary for external APIs, webhooks, and scenarios requiring explicit HTTP control. tRPC is optional but valuable for monorepos or complex internal APIs where round-trip type safety reduces bugs.

**Alternative Considered:** Full REST with OpenAPI - More boilerplate but better for public API-first products. Use `next-openapi-gen` or `next-rest-framework` if public API is primary feature.

### Rate Limiting

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @upstash/ratelimit | 2.0.8 | Rate limiting | Designed for serverless/edge, HTTP-based (works in all runtimes), supports sliding window/token bucket/fixed window algorithms, Upstash Redis backend. |
| @upstash/redis | latest | Serverless Redis | REST API (works from edge), only managed Redis accessible from Vercel Edge. |

**Implementation:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

// In middleware or route handler
const identifier = getUserId() // or IP for anonymous
const { success, limit, remaining } = await ratelimit.limit(identifier)

if (!success) {
  return Response.json({ error: 'Rate limit exceeded' }, {
    status: 429,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
    }
  })
}
```

**Edge Middleware Pattern:**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  return NextResponse.next()
}
```

**Rationale:** Upstash is purpose-built for serverless. Traditional Redis clients use TCP (not available in edge runtimes). Upstash uses REST API, enabling rate limiting in Vercel Edge Middleware (runs before API routes, minimal cold start). Supports tiered limits (anonymous, free, premium users) by using different identifiers. Analytics dashboard for monitoring.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pixi.js | 8.15.0 | WebGL rendering | Already in use. v8 improves performance (reactive render loop, render groups for hardware-accelerated camera, WebGPU support). Video layer rendering. |
| Zod | 3.x | Schema validation | EVERYWHERE. API inputs, form data, env vars, config. Provides both runtime validation and TypeScript types from single source of truth. |
| date-fns | 3.x | Date utilities | Preferred over moment.js (deprecated) or Luxon. Tree-shakeable, immutable, TypeScript-first. |
| nanoid | 5.x | ID generation | Secure, URL-safe, shorter than UUIDs. For public-facing IDs (job IDs, short links). |
| sharp | 0.33.x | Image processing | For thumbnail generation, image optimization. Native performance, supports all formats. |
| next-swagger-doc | latest | API documentation | Generate OpenAPI/Swagger docs from JSDoc annotations on Route Handlers. For public API documentation. |

**Development Tools:**

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | 5.x | Type safety | Enable strict mode, noUncheckedIndexedAccess |
| Prettier | latest | Code formatting | Consistent style |
| ESLint | latest | Linting | Use `@typescript-eslint` rules |
| Playwright | latest | E2E testing | For critical user flows (signup, render job, payment) |
| Vitest | latest | Unit testing | Faster than Jest, native ESM, Vite-compatible |

## Installation

```bash
# Core
npm install next@latest react@latest react-dom@latest typescript@latest

# Database
npm install prisma @prisma/client @prisma/adapter-pg pg

# Authentication
npm install better-auth

# Queue
npm install bullmq ioredis

# Billing
npm install stripe @stripe/stripe-js

# Storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage

# AI
npm install genkit @genkit-ai/google-genai

# API/Validation
npm install zod
# Optional: npm install @trpc/server @trpc/client @trpc/next @trpc/react-query

# Rate Limiting
npm install @upstash/ratelimit @upstash/redis

# Supporting
npm install pixi.js date-fns nanoid sharp

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin playwright vitest
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Better Auth | Auth.js (NextAuth) | Lacks native multi-tenant features critical for SaaS. Better Auth designed for organizations/teams from ground up. |
| Queue | BullMQ | Quirrel | Unmaintained since 2022. BullMQ actively developed, battle-tested at scale. |
| Queue | BullMQ | Inngest | More expensive, vendor lock-in. BullMQ open-source, self-hosted option. Good for complex workflows but overkill for render queue. |
| ORM | Prisma | Drizzle | Drizzle is faster, more SQL-like. But Prisma has better DX (Prisma Studio, migrations, broader community). Drizzle better for SQL experts. |
| Storage | Cloudflare R2 | AWS S3 | Egress fees ($0.09/GB). R2 zero egress = massive savings for video delivery. |
| Storage | Cloudflare R2 | Backblaze B2 | Cheaper storage, but R2 has Cloudflare CDN integration, better global performance. |
| API | Route Handlers + Server Actions | Full tRPC | tRPC adds complexity. Only add if monorepo or >50 internal API calls. For external API, tRPC doesn't help (only works TypeScript client). |
| Rate Limiting | Upstash | Redis in VPS | VPS Redis doesn't work in Vercel Edge. Upstash REST API works everywhere. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| NextAuth (Auth.js) | Multi-tenant features are afterthought. Better Auth purpose-built for SaaS. | Better Auth |
| Bull (v3) | Deprecated, replaced by BullMQ. Built on Redis lists (less reliable than Streams). | BullMQ v5 |
| Moment.js | Deprecated since 2020. Mutable API, large bundle. | date-fns or Day.js |
| class-validator | Reflects decorators, requires experimental TypeScript features. Not type-safe. | Zod (type inference + runtime validation) |
| Pages Router (Next.js) | Legacy. App Router is the future, better performance (RSC), simpler data fetching. | App Router (Next.js 13+) |
| Vercel Edge Functions for video rendering | 10s execution limit, CPU-bound tasks slow on edge. Not suitable for rendering. | Separate render workers (Docker, Railway, Fly.io) |
| Firebase Auth | Vendor lock-in, limited customization. Migration path difficult. | Better Auth (self-hosted, full control) |

## Stack Patterns by Variant

**If building developer API-first product:**
- Use Route Handlers for all endpoints
- Generate OpenAPI docs with `next-openapi-gen` or `next-rest-framework`
- Add API versioning (/v1/, /v2/)
- Provide SDKs (TypeScript, Python) using generated OpenAPI spec

**If building no-code editor-first product:**
- Use Server Actions for all internal mutations
- Route Handlers only for webhooks and public embed endpoints
- tRPC optional (probably not needed if editor is primary interface)

**If monorepo (multiple apps sharing API):**
- Use tRPC for internal API (shared between apps)
- Route Handlers for external webhooks
- Validate all inputs with Zod (define schemas in shared package)

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15 | React 19 | Requires React 19.x (18.x not fully compatible with Server Actions) |
| Prisma 7.x | @prisma/adapter-pg | Required for serverless, use adapter pattern |
| BullMQ 5.x | Redis 6.2+ | Works with 4+, but 6.2+ recommended for stability |
| Better Auth 1.4.x | Prisma, Drizzle, Kysely | Database-agnostic, provides adapters |
| Stripe 20.x | Node.js 16+ | Supports all LTS versions |
| @upstash/ratelimit 2.x | @upstash/redis 1.x+ | Must use Upstash Redis (REST-based) |
| Pixi.js 8.x | WebGL 2.0 browsers | Falls back to WebGL 1.0, experimental WebGPU support |

## Configuration Best Practices

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="..." # For migrations (Neon)

# Auth
BETTER_AUTH_SECRET="..." # openssl rand -base64 32
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Redis (BullMQ + Rate Limiting)
REDIS_URL="redis://..."
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Storage (R2)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="videos"

# AI
GOOGLE_GENAI_API_KEY="..."

# App
NEXT_PUBLIC_APP_URL="https://..."
NODE_ENV="production"
```

### TypeScript Config

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Prisma Config (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED") // For migrations
}
```

## Deployment Architecture

**Next.js App (Vercel):**
- Edge Middleware: Rate limiting (lightweight, fast)
- Serverless Functions: API routes, Server Actions
- Static Pages: Landing, docs, pricing

**Render Workers (Separate):**
- Containerized Node.js workers (Docker)
- BullMQ consumers processing video render jobs
- Deploy to Railway, Fly.io, AWS ECS, or Render.com
- Auto-scale based on queue length

**Redis (Upstash or Redis Labs):**
- Job queue storage (BullMQ)
- Rate limiting counters
- Session cache (optional)

**PostgreSQL (Neon):**
- Users, organizations, templates, jobs
- Autoscales with traffic
- Database branching for preview deployments

**Storage (Cloudflare R2):**
- Rendered videos
- Template assets (images, audio)
- User uploads

## Confidence Assessment

| Technology | Confidence | Sources |
|------------|-----------|---------|
| Next.js 15 | HIGH | Official docs, Next.js blog, community best practices (2026) |
| Prisma 7 | HIGH | Official Prisma blog (v7.2.0 announcement), GitHub releases |
| Better Auth | MEDIUM-HIGH | npm (v1.4.18), GitHub stars (15k+), official framework recommendations, but newer than Auth.js |
| BullMQ | HIGH | npm (v5.67.3, published 3 days ago), production use cases, official docs |
| Stripe | HIGH | npm (v20.3.1, published 2 days ago), official Stripe docs, Vercel templates |
| Cloudflare R2 | MEDIUM-HIGH | Official Cloudflare docs, community examples. Note: Some 2024 sources suggest streaming restrictions, but 2026 official docs don't indicate this. Verify with Cloudflare for high-volume streaming. |
| Google Genkit | MEDIUM | Official Firebase/Google docs, production-ready but less community adoption than OpenAI SDK |
| Pixi.js 8 | HIGH | npm (v8.15.0, published today), official PixiJS blog (v8 launch) |
| Upstash | HIGH | npm (@upstash/ratelimit 2.0.8), official Upstash docs, Vercel best practices |
| tRPC | MEDIUM | Strong for monorepos, but adds complexity. Not needed for simple CRUD. |

## Sources

### Official Documentation (HIGH Confidence)
- [Better Auth](https://www.better-auth.com/docs/introduction) - Authentication framework docs
- [Prisma ORM 7.2.0 Release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0) - Latest version features
- [BullMQ Documentation](https://docs.bullmq.io) - Job queue patterns
- [Stripe API Documentation](https://docs.stripe.com) - Payment integration
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/) - Object storage
- [Google Genkit Documentation](https://genkit.dev/docs/integrations/google-genai/) - AI orchestration
- [Next.js 15 Documentation](https://nextjs.org/docs) - App Router, Server Actions, Route Handlers
- [PixiJS v8 Launch](https://pixijs.com/blog/pixi-v8-launches) - WebGL rendering improvements

### npm Package Versions (HIGH Confidence)
- better-auth: 1.4.18 (published 10 days ago)
- prisma: 7.3.0 (published 18 days ago)
- bullmq: 5.67.3 (published 3 days ago)
- stripe: 20.3.1 (published 2 days ago)
- pixi.js: 8.15.0 (published 3 hours ago)
- @upstash/ratelimit: 2.0.8 (published 1 month ago)

### Community Resources (MEDIUM Confidence)
- [Vercel Next.js Subscription Payments Template](https://github.com/vercel/nextjs-subscription-payments) - Stripe + Next.js patterns
- [How to Build a Job Queue in Node.js with BullMQ and Redis](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view) - 2026 implementation guide
- [REST vs GraphQL vs tRPC: The Ultimate API Design Guide for 2026](https://dev.to/dataformathub/rest-vs-graphql-vs-trpc-the-ultimate-api-design-guide-for-2026-8n3) - API architecture comparison
- [Neon Vercel Postgres Transition Guide](https://neon.com/docs/guides/vercel-postgres-transition-guide) - Database hosting changes
- [Upstash Rate Limiting Blog](https://upstash.com/blog/nextjs-ratelimiting) - Serverless rate limiting patterns

---

*Stack research for: OpenVideo SaaS Platform*
*Researched: 2026-02-09*
*Confidence: HIGH*
*Next Step: Use this stack to inform roadmap phase structure and identify integration complexity*
