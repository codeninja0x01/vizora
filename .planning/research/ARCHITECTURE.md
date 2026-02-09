# Architecture Research

**Domain:** Media Automation SaaS Platform
**Researched:** 2026-02-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Editor UI  │  │   API Docs   │  │  Dashboard   │                  │
│  │  (Next.js)   │  │              │  │  (Next.js)   │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                  │                          │
├─────────┴──────────────────┴──────────────────┴──────────────────────────┤
│                         API GATEWAY LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              Next.js API Routes (/api/*)                        │    │
│  │  - Auth endpoints (/api/auth/[...all])                          │    │
│  │  - REST API (/api/v1/*)                                         │    │
│  │  - Webhooks receiver (/api/webhooks/*)                          │    │
│  │  - SSE progress stream (/api/v1/jobs/:id/progress)             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                        APPLICATION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Auth    │  │ Billing  │  │Template  │  │Job Mgmt  │               │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │             │              │             │                      │
├───────┴─────────────┴──────────────┴─────────────┴──────────────────────┤
│                         QUEUE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   BullMQ + Redis                                 │    │
│  │  - render-queue: Video rendering jobs                           │    │
│  │  - webhook-queue: Outbound webhook delivery                     │    │
│  │  - billing-queue: Stripe sync, usage tracking                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                        WORKER LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Render     │  │   Webhook    │  │   Billing    │                  │
│  │   Worker     │  │   Worker     │  │   Worker     │                  │
│  │ (Node.js)    │  │ (Node.js)    │  │ (Node.js)    │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │ (scale N)        │                  │                          │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  PostgreSQL  │  │    Redis     │  │Cloudflare R2 │                  │
│  │  + Prisma    │  │              │  │  (Storage)   │                  │
│  │  (RLS)       │  │              │  │              │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Next.js Monorepo** | Editor UI, API gateway, SSR pages | Next.js 16 App Router with React 19 Server Components |
| **API Routes** | REST API endpoints, webhook receivers, SSE streams | Next.js API routes with path versioning (`/api/v1/*`) |
| **Auth Service** | Authentication, session management, user context | Better Auth with PostgreSQL adapter, middleware-based protection |
| **Template Service** | Template CRUD, JSON schema validation, field resolution | TypeScript service with Zod schema validation |
| **Job Management Service** | Job creation, status tracking, progress updates | Service layer + BullMQ producer + Prisma queries |
| **BullMQ Queues** | Async job distribution, retry logic, priority queues | Redis-backed queues with separate queue per concern |
| **Render Workers** | Execute video rendering, update progress, upload results | Separate Node.js processes using packages/node renderer |
| **Webhook Workers** | Deliver webhooks with exponential backoff, idempotency | BullMQ workers with custom retry patterns |
| **Billing Service** | Stripe integration, usage metering, webhook handling | Stripe SDK + event-sourcing pattern for credit sync |
| **PostgreSQL + Prisma** | Multi-tenant data storage with RLS isolation | Prisma ORM with Row-Level Security policies |
| **Redis** | Queue backend, session cache, rate limiting | Shared Redis instance for queues and caching |
| **Cloudflare R2** | Video asset storage with presigned URL uploads | S3-compatible storage with direct browser uploads |

## Recommended Project Structure

```
/
├── packages/
│   ├── openvideo/           # Core rendering library (existing)
│   ├── node/                # Headless renderer (existing)
│   └── api-client/          # Generated TypeScript client for REST API
│
├── editor/                   # Next.js application root
│   ├── app/
│   │   ├── (auth)/          # Auth-protected routes
│   │   │   ├── dashboard/
│   │   │   ├── templates/
│   │   │   └── jobs/
│   │   ├── (public)/        # Public routes
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...all]/     # Better Auth handler
│   │   │   ├── v1/               # Versioned REST API
│   │   │   │   ├── templates/
│   │   │   │   ├── jobs/
│   │   │   │   └── renders/
│   │   │   └── webhooks/         # Inbound webhooks (Stripe, Zapier)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── auth/            # Better Auth setup, middleware
│   │   ├── db/              # Prisma client singleton
│   │   ├── queue/           # BullMQ queue producers
│   │   ├── services/        # Business logic services
│   │   │   ├── auth.service.ts
│   │   │   ├── template.service.ts
│   │   │   ├── job.service.ts
│   │   │   ├── billing.service.ts
│   │   │   └── webhook.service.ts
│   │   ├── storage/         # R2 presigned URL generation
│   │   └── utils/           # Shared utilities
│   ├── components/          # React components
│   └── middleware.ts        # Auth + rate limiting middleware
│
├── workers/                  # Separate worker processes
│   ├── render-worker.ts     # Render job processor
│   ├── webhook-worker.ts    # Webhook delivery processor
│   └── billing-worker.ts    # Billing sync processor
│
├── prisma/
│   ├── schema.prisma        # Database schema with multi-tenant support
│   └── migrations/
│
└── docs/                     # Documentation (existing)
```

### Structure Rationale

- **Monorepo with Next.js as API Gateway:** Keep API routes in Next.js rather than separate service. Simpler deployment, shared code, better DX. Microservices only justified when independent scaling or team ownership required.
- **Service Layer Pattern:** Business logic lives in `lib/services/`, not in API routes. Routes are thin controllers that call services. Enables reuse across routes, easier testing.
- **Separate Worker Processes:** Workers run as independent Node.js processes, not Next.js API routes. Enables horizontal scaling, isolates CPU-intensive work, prevents blocking web requests.
- **Path-based API Versioning:** Use `/api/v1/` instead of headers. Simpler for external integrations (Zapier, webhooks), better caching, easier documentation. Most SaaS platforms use this.
- **Multi-tenant RLS at Database:** Use PostgreSQL Row-Level Security with Prisma extensions. Security at lowest level, prevents accidental leaks, works with direct SQL queries.

## Architectural Patterns

### Pattern 1: Multi-Tenant Isolation via Row-Level Security

**What:** Use PostgreSQL's Row-Level Security (RLS) combined with Prisma Client Extensions to enforce tenant isolation at the database level.

**When to use:** For SaaS platforms requiring strong tenant data isolation with shared database/schema model.

**Trade-offs:**
- **Pros:** Security at lowest level, prevents accidental leaks, no application logic needed
- **Cons:** Requires PostgreSQL-specific features, slightly more complex setup

**Example:**
```typescript
// prisma/schema.prisma
model Job {
  id          String   @id @default(cuid())
  tenantId    String   // Required on all multi-tenant tables
  status      String
  templateId  String
  createdAt   DateTime @default(now())

  @@index([tenantId])
}

// lib/db/prisma-rls.ts
import { PrismaClient } from '@prisma/client'

export function createTenantPrisma(tenantId: string) {
  return prismaClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Set tenant context for this transaction
          await prismaClient.$executeRaw`
            SET LOCAL app.current_tenant_id = ${tenantId}
          `
          return query(args)
        }
      }
    }
  })
}

// PostgreSQL RLS Policy
// CREATE POLICY tenant_isolation ON jobs
//   USING (tenant_id = current_setting('app.current_tenant_id')::text)
```

### Pattern 2: Producer-Consumer with BullMQ

**What:** Separate job creation (producers) from job execution (workers/consumers) using Redis-backed queues.

**When to use:** For async operations (rendering, webhooks, billing sync) that shouldn't block API requests.

**Trade-offs:**
- **Pros:** Horizontal scaling, retry logic, priority queues, job persistence
- **Cons:** Additional infrastructure (Redis), eventual consistency

**Example:**
```typescript
// lib/queue/render-queue.ts
import { Queue } from 'bullmq'

export const renderQueue = new Queue('render', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
})

// Add job (producer)
export async function enqueueRenderJob(jobData: RenderJobData) {
  return renderQueue.add('render-video', jobData, {
    priority: jobData.priority || 10, // 0 = highest
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5s, 25s, 125s
    }
  })
}

// workers/render-worker.ts (consumer)
import { Worker } from 'bullmq'
import { renderVideo } from '../packages/node'

const worker = new Worker('render', async (job) => {
  const { templateId, fields, tenantId } = job.data

  // Update progress (triggers SSE update)
  await job.updateProgress(10)

  // Execute rendering
  const videoBuffer = await renderVideo(templateId, fields)
  await job.updateProgress(80)

  // Upload to R2
  const videoUrl = await uploadToR2(videoBuffer, tenantId)
  await job.updateProgress(100)

  return { videoUrl }
}, {
  connection: redisConnection,
  concurrency: 4 // Process 4 jobs in parallel per worker
})
```

### Pattern 3: Template System with JSON Schema

**What:** Store templates as structured JSON with schema-validated dynamic fields, enabling flexible rendering without code changes.

**When to use:** For user-generated or configurable content structures.

**Trade-offs:**
- **Pros:** Flexible, no code changes for new templates, validation built-in
- **Cons:** More complex than hardcoded structures, requires schema design

**Example:**
```typescript
// Template definition
interface Template {
  id: string
  name: string
  schema: {
    type: 'object'
    properties: Record<string, FieldSchema>
    required: string[]
  }
  composition: CompositionLayer[] // Rendering instructions
}

// Field types
type FieldSchema =
  | { type: 'text', maxLength?: number }
  | { type: 'image', formats: string[] }
  | { type: 'color', format: 'hex' | 'rgb' }
  | { type: 'number', min?: number, max?: number }

// Validation with Zod (generated from schema)
import { z } from 'zod'

const templateSchema = z.object({
  title: z.string().max(100),
  backgroundImage: z.string().url(),
  brandColor: z.string().regex(/^#[0-9A-F]{6}$/i)
})

// lib/services/template.service.ts
export class TemplateService {
  async validateFields(templateId: string, fields: unknown) {
    const template = await this.getTemplate(templateId)
    const schema = this.zodFromJsonSchema(template.schema)
    return schema.parse(fields) // Throws if invalid
  }

  async render(templateId: string, fields: Record<string, unknown>) {
    const validated = await this.validateFields(templateId, fields)
    // Pass to rendering engine
    return enqueueRenderJob({ templateId, fields: validated })
  }
}
```

### Pattern 4: Direct Browser Upload with Presigned URLs

**What:** Generate temporary presigned URLs that allow browsers to upload directly to Cloudflare R2 without proxying through your server.

**When to use:** For large file uploads (videos, images) where proxying wastes bandwidth.

**Trade-offs:**
- **Pros:** Reduces server load, lower latency, cost savings
- **Cons:** Requires CORS configuration, client handles upload errors

**Example:**
```typescript
// lib/storage/r2.service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export class R2Service {
  private client: S3Client

  async generateUploadUrl(
    tenantId: string,
    fileName: string,
    contentType: string
  ) {
    const key = `${tenantId}/uploads/${Date.now()}-${fileName}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: contentType
    })

    // URL valid for 1 hour
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 3600
    })

    return { uploadUrl, key }
  }
}

// API route: POST /api/v1/uploads/presigned
export async function POST(req: Request) {
  const { fileName, contentType } = await req.json()
  const session = await getSession(req)

  const { uploadUrl, key } = await r2Service.generateUploadUrl(
    session.user.tenantId,
    fileName,
    contentType
  )

  return Response.json({ uploadUrl, key })
}

// Client-side upload
async function uploadVideo(file: File) {
  // 1. Request presigned URL
  const { uploadUrl } = await fetch('/api/v1/uploads/presigned', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type
    })
  }).then(r => r.json())

  // 2. Upload directly to R2
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  })
}
```

### Pattern 5: Webhook Delivery with Exponential Backoff

**What:** Use a dedicated queue to deliver webhooks to external services with automatic retry, exponential backoff, and idempotency.

**When to use:** For notifying external systems (Zapier, Make, customer webhooks) of events.

**Trade-offs:**
- **Pros:** Reliable delivery, handles downstream failures, prevents blocking
- **Cons:** Eventual consistency, requires webhook consumer best practices

**Example:**
```typescript
// lib/queue/webhook-queue.ts
export async function deliverWebhook(
  event: string,
  payload: unknown,
  webhookUrl: string
) {
  return webhookQueue.add('deliver', {
    event,
    payload,
    webhookUrl,
    idempotencyKey: crypto.randomUUID()
  }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5s → 25s → 125s → 625s → 3125s
    }
  })
}

// workers/webhook-worker.ts
const webhookWorker = new Worker('webhooks', async (job) => {
  const { event, payload, webhookUrl, idempotencyKey } = job.data

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
      'X-Webhook-Signature': signPayload(payload),
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`)
  }

  // Log successful delivery
  await prisma.webhookDelivery.create({
    data: {
      event,
      webhookUrl,
      status: 'delivered',
      responseStatus: response.status,
      idempotencyKey
    }
  })
}, {
  connection: redisConnection
})
```

### Pattern 6: Real-Time Progress with Server-Sent Events

**What:** Stream rendering progress updates to clients using Server-Sent Events (SSE) instead of polling or WebSockets.

**When to use:** For unidirectional server-to-client updates (progress bars, notifications).

**Trade-offs:**
- **Pros:** Simpler than WebSockets, uses HTTP, auto-reconnects, works with CDNs
- **Cons:** One-way only, not suitable for bidirectional communication

**Example:**
```typescript
// app/api/v1/jobs/[jobId]/progress/route.ts
export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to Redis pub/sub for job updates
      const subscriber = redis.duplicate()
      await subscriber.subscribe(`job:${params.jobId}:progress`)

      subscriber.on('message', (channel, message) => {
        const data = JSON.parse(message)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )

        // Close stream when complete
        if (data.status === 'completed' || data.status === 'failed') {
          controller.close()
        }
      })

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        subscriber.unsubscribe()
        subscriber.quit()
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

// Client-side
const eventSource = new EventSource(`/api/v1/jobs/${jobId}/progress`)
eventSource.onmessage = (event) => {
  const { progress, status } = JSON.parse(event.data)
  updateProgressBar(progress)
  if (status === 'completed') {
    eventSource.close()
  }
}
```

### Pattern 7: Billing Sync with Event Sourcing

**What:** Track all billing events (usage, credits, charges) as immutable events that can be replayed, enabling audit trails and reconciliation with Stripe.

**When to use:** For SaaS billing systems requiring accurate usage tracking and debugging.

**Trade-offs:**
- **Pros:** Audit trail, debuggable, can replay to fix issues, handles race conditions
- **Cons:** More storage, requires event processing logic

**Example:**
```typescript
// prisma/schema.prisma
model BillingEvent {
  id         String   @id @default(cuid())
  tenantId   String
  type       String   // 'credit_purchased', 'credit_consumed', 'render_completed'
  amount     Int      // Credits or cents
  metadata   Json
  stripeId   String?  // Associated Stripe event ID
  createdAt  DateTime @default(now())

  @@index([tenantId, createdAt])
}

// lib/services/billing.service.ts
export class BillingService {
  async recordRenderUsage(jobId: string, tenantId: string, cost: number) {
    // Event-sourced: create immutable event
    await prisma.billingEvent.create({
      data: {
        tenantId,
        type: 'render_completed',
        amount: -cost, // Negative = consumption
        metadata: { jobId }
      }
    })

    // Sync to Stripe usage records
    await billingQueue.add('sync-usage', { tenantId, cost })
  }

  async getCurrentBalance(tenantId: string): Promise<number> {
    // Replay all events to compute balance
    const events = await prisma.billingEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    })

    return events.reduce((balance, event) => balance + event.amount, 0)
  }
}

// workers/billing-worker.ts - Sync to Stripe
const billingWorker = new Worker('billing', async (job) => {
  const { tenantId, cost } = job.data

  const subscription = await getStripeSubscription(tenantId)

  // Report usage to Stripe metered billing
  await stripe.subscriptionItems.createUsageRecord(
    subscription.items.data[0].id,
    {
      quantity: cost,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment'
    }
  )
})
```

## Data Flow

### Request Flow: Create Render Job

```
1. Client Request
   POST /api/v1/renders
   { templateId, fields }
        ↓
2. API Route
   - Authenticate (Better Auth middleware)
   - Extract tenantId from session
   - Call JobService.createJob()
        ↓
3. Job Service
   - Validate template exists (TemplateService)
   - Validate fields against schema
   - Create Job record (Prisma with RLS)
   - Enqueue render job (BullMQ)
   - Return job ID
        ↓
4. Response to Client
   { jobId, status: 'queued' }
        ↓
5. Background: Render Worker
   - Pick up job from queue
   - Load template composition
   - Execute rendering (packages/node)
   - Update progress via Redis pub/sub
   - Upload result to R2
   - Update Job record (status = 'completed')
   - Trigger webhook delivery
        ↓
6. Background: Webhook Worker
   - Pick up webhook job
   - POST to customer webhook URL
   - Retry on failure (exponential backoff)
```

### State Management: Job Lifecycle

```
Job States:
┌─────────┐  enqueue   ┌─────────┐  worker   ┌─────────┐
│ PENDING │ ─────────> │ QUEUED  │ ────────> │ ACTIVE  │
└─────────┘            └─────────┘           └────┬────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    ↓                             ↓
                              ┌───────────┐                 ┌─────────┐
                              │ COMPLETED │                 │ FAILED  │
                              └───────────┘                 └─────────┘
                                    │                             │
                                    ↓                             ↓
                              ┌───────────┐                 ┌─────────┐
                              │  Webhook  │                 │  Retry  │
                              │ Delivered │                 │  Queue  │
                              └───────────┘                 └─────────┘
```

### Key Data Flows

1. **Authentication Flow:** Browser → Next.js Middleware → Better Auth session check → Set tenantId context → Route handler
2. **Multi-tenant Query:** API route → Prisma with RLS extension → PostgreSQL (RLS enforces tenant filter) → Return filtered data
3. **Real-time Progress:** Render Worker → Redis Pub/Sub → SSE endpoint → Client EventSource → UI update
4. **Webhook Integration:** Job completed → Webhook Worker → External service (Zapier/Make) → Customer automation
5. **Billing Sync:** Render completed → BillingEvent created → Billing Worker → Stripe usage record → Subscription metering

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k users** | Single Next.js instance, single render worker, managed Postgres + Redis. R2 for storage. Total: ~$50-100/month on Vercel + Neon + Upstash. |
| **1k-10k users** | Horizontal worker scaling (2-4 render workers), connection pooling (Prisma Accelerate), Redis clustering. Separate worker dyno/container. Cost: ~$200-500/month. |
| **10k-100k users** | Multiple Next.js instances behind load balancer, 5-10 render workers with auto-scaling, separate Redis for cache vs. queue, read replicas for Postgres, CDN for static assets. Consider separate API service. Cost: ~$1k-5k/month. |
| **100k+ users** | Microservices split (Auth, Billing, Render as separate services), dedicated queue management service, horizontal database sharding by tenantId, multi-region deployment, dedicated render farm with GPU acceleration. Cost: $10k+/month. |

### Scaling Priorities

1. **First bottleneck: Render workers exhausted**
   - **Symptom:** Jobs queued for minutes, API responsive
   - **Fix:** Horizontal worker scaling (add more worker processes)
   - **When:** Queue depth > 50 jobs consistently

2. **Second bottleneck: Database connections exhausted**
   - **Symptom:** "Too many connections" errors
   - **Fix:** Connection pooling (Prisma Accelerate or PgBouncer), reduce per-instance pool size
   - **When:** Connection pool warnings in logs

3. **Third bottleneck: Redis memory/throughput**
   - **Symptom:** Slow job enqueue/dequeue
   - **Fix:** Redis clustering, separate Redis for cache vs. queue
   - **When:** Redis memory > 80% or latency spikes

4. **Fourth bottleneck: API response time**
   - **Symptom:** Slow API responses under load
   - **Fix:** Horizontal Next.js scaling, optimize Prisma queries, add caching
   - **When:** P95 latency > 500ms

## Anti-Patterns

### Anti-Pattern 1: Running Render Workers in Next.js API Routes

**What people do:** Execute long-running rendering inside API route handlers or server actions.

**Why it's wrong:**
- Blocks Next.js event loop
- Timeout limits (10s on Vercel)
- Can't horizontally scale independently
- Memory leaks accumulate in web process

**Do this instead:** Use BullMQ queues with separate worker processes that can scale independently. API routes only enqueue jobs, workers execute them.

### Anti-Pattern 2: Storing Tenant ID in JWT/Session Only

**What people do:** Extract tenantId from session in every query, manually filter: `where: { tenantId }`.

**Why it's wrong:**
- Easy to forget filter = data leak
- Doesn't protect direct SQL queries
- No defense against SQL injection or ORM bugs

**Do this instead:** Use PostgreSQL Row-Level Security (RLS) with Prisma extensions. Set tenant context once per request, database enforces isolation automatically.

### Anti-Pattern 3: Polling for Job Status

**What people do:** Client polls `GET /api/v1/jobs/:id` every 2 seconds to check status.

**Why it's wrong:**
- Wastes API requests and database queries
- Adds latency (2s average delay)
- Scales poorly (1000 concurrent jobs = 500 req/sec)

**Do this instead:** Use Server-Sent Events (SSE) to stream progress updates. Client subscribes once, server pushes updates as they happen.

### Anti-Pattern 4: Synchronous Webhook Delivery

**What people do:** Send webhooks in API route handler before responding: `await sendWebhook(url, data)`.

**Why it's wrong:**
- Blocks API response on external service latency
- No retry logic when webhook fails
- User waits for webhook delivery

**Do this instead:** Enqueue webhook delivery jobs with BullMQ. API responds immediately, worker handles delivery with retries.

### Anti-Pattern 5: Hardcoding Template Structure

**What people do:** Create separate code paths for each template type: `if (template === 'promo') { ... } else if (template === 'demo') { ... }`.

**Why it's wrong:**
- Code change required for new templates
- Doesn't scale to user-generated templates
- Difficult to test all permutations

**Do this instead:** Use JSON schema-based templates with validated dynamic fields. Rendering engine interprets composition, no code changes needed.

### Anti-Pattern 6: Mixing Authentication Libraries

**What people do:** Use Better Auth for web, then add separate API key system with custom middleware.

**Why it's wrong:**
- Duplicate auth logic
- Inconsistent session handling
- Hard to maintain

**Do this instead:** Use Better Auth for both web sessions and API keys. It supports both patterns natively.

### Anti-Pattern 7: Not Versioning API from Day 1

**What people do:** Start with `/api/jobs`, add breaking changes, realize clients break.

**Why it's wrong:**
- Can't introduce breaking changes
- Forces immediate migration for all clients
- No deprecation path

**Do this instead:** Start with `/api/v1/` from day 1. v2 can coexist, gradual migration, deprecation timeline.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Stripe** | Webhook receiver + SDK | Receive webhooks at `/api/webhooks/stripe`. Verify signature. Use Stripe SDK for API calls. Sync usage with metered billing. |
| **Better Auth** | Next.js API route + middleware | Mount at `/api/auth/[...all]`. Use middleware for route protection. Call `auth.api.getSession()` in server components. |
| **Zapier** | Outbound webhooks + catch hook | Deliver webhooks to Zapier catch hooks. User configures Zap with provided URL. Supports trigger + action patterns. |
| **Make (formerly Integromat)** | Outbound webhooks | Similar to Zapier. Make webhook module receives POST requests. |
| **Cloudflare R2** | S3-compatible SDK | Use AWS SDK v3 with R2 endpoint. Generate presigned URLs for direct uploads. Configure CORS on bucket. |
| **Google Genkit (AI)** | Direct SDK integration | Call Genkit flows from API routes or workers. Used for AI-powered template suggestions. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Editor UI ↔ API Routes** | HTTP (fetch), typed client | Generate TypeScript client from OpenAPI spec. Type-safe API calls. |
| **API Routes ↔ Services** | Direct function calls | Services are TypeScript modules, not separate processes. Shared business logic. |
| **Services ↔ BullMQ** | Queue.add() (producer) | Services enqueue jobs, don't wait for completion. Return job ID immediately. |
| **BullMQ ↔ Workers** | Redis pub/sub | Workers subscribe to queues. BullMQ handles job distribution, retries. |
| **Workers ↔ Rendering Engine** | Direct module import | Workers import `packages/node` renderer. Same process, no RPC. |
| **Workers ↔ Prisma** | Prisma Client with RLS | Workers create their own Prisma client with tenant context. Same RLS as web. |
| **Real-time Progress** | Redis pub/sub → SSE | Workers publish to Redis channel. SSE endpoint subscribes and streams to client. |

## Build Order Recommendations

Suggested incremental build phases based on component dependencies:

### Phase 1: Foundation (Core Infrastructure)
**Build:** Prisma schema, multi-tenant RLS policies, Better Auth integration, basic API structure
**Why first:** Everything depends on auth + database. Get multi-tenancy right from day 1.
**Estimated:** 1-2 weeks

### Phase 2: Template System
**Build:** Template CRUD, JSON schema validation, field types
**Why second:** Needed before rendering can work. Independent of queue/workers.
**Estimated:** 1 week

### Phase 3: Synchronous Rendering (MVP)
**Build:** Job creation API, inline rendering (no queue yet), direct response
**Why third:** Proves rendering works before adding queue complexity. Fast feedback.
**Estimated:** 1 week

### Phase 4: Queue + Workers (Production)
**Build:** BullMQ setup, render queue, separate worker process, job status API
**Why fourth:** Refactor Phase 3 to use queues. Now handles scale + failures.
**Estimated:** 1-2 weeks

### Phase 5: Real-time Progress
**Build:** Redis pub/sub, SSE endpoint, progress updates from workers
**Why fifth:** Nice UX improvement, depends on queue architecture.
**Estimated:** 3-5 days

### Phase 6: Storage Integration
**Build:** R2 presigned URLs, direct browser upload, asset management
**Why sixth:** Enables user uploads for templates. Depends on auth + multi-tenancy.
**Estimated:** 3-5 days

### Phase 7: Webhook System
**Build:** Webhook queue, delivery worker, retry logic, signature verification
**Why seventh:** Depends on job completion events. Integrations come after core features.
**Estimated:** 1 week

### Phase 8: Billing Integration
**Build:** Stripe webhooks, usage metering, credit system, event sourcing
**Why eighth:** Monetization layer. Depends on job tracking for usage.
**Estimated:** 1-2 weeks

### Phase 9: External Integrations
**Build:** Zapier triggers, Make integration, API documentation
**Why ninth:** Polish for third-party ecosystem. Depends on webhook system.
**Estimated:** 1 week

### Dependency Graph
```
Phase 1 (Foundation)
  ├─> Phase 2 (Templates)
  │     └─> Phase 3 (Sync Rendering)
  │           └─> Phase 4 (Queue + Workers)
  │                 ├─> Phase 5 (Real-time Progress)
  │                 ├─> Phase 7 (Webhooks)
  │                 │     └─> Phase 9 (Integrations)
  │                 └─> Phase 8 (Billing)
  └─> Phase 6 (Storage)
```

## Sources

**BullMQ Architecture:**
- [BullMQ Documentation - Architecture](https://docs.bullmq.io/guide/architecture)
- [BullMQ Patterns](https://docs.bullmq.io/bull/patterns)
- [How to Build a Job Queue in Node.js with BullMQ and Redis](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view)

**Multi-Tenant Patterns:**
- [Securing Multi-Tenant Applications Using Row Level Security in PostgreSQL with Prisma ORM](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Multi-Tenancy Implementation Approaches With Prisma and ZenStack](https://zenstack.dev/blog/multi-tenant)
- [Complete Guide: Build Multi-Tenant SaaS with NestJS, Prisma and Row-Level Security](https://js.elitedev.in/js/complete-guide-build-multi-tenant-saas-with-nestjs-prisma-and-row-level-security-96c123c5/)

**Next.js Architecture:**
- [The Ultimate Guide to Software Architecture in Next.js: From Monolith to Microservices](https://dev.to/shayan_saed/the-ultimate-guide-to-software-architecture-in-nextjs-from-monolith-to-microservices-i2c)
- [Building Scalable Microservice Architecture in Next.js](https://dev.to/hamzakhan/building-scalable-microservice-architecture-in-nextjs-1p21)

**Better Auth Integration:**
- [Next.js integration | Better Auth](https://www.better-auth.com/docs/integrations/next)
- [Top 5 authentication solutions for secure Next.js apps in 2026](https://workos.com/blog/top-authentication-solutions-nextjs-2026)

**Webhook Patterns:**
- [Webhook Retry Best Practices | Svix Resources](https://www.svix.com/resources/webhook-best-practices/retries/)
- [Design a Webhook System: Step-by-Step Guide](https://www.systemdesignhandbook.com/guides/design-a-webhook-system/)
- [Hookdeck Review January 2026](https://hookdeck.com/blog/hookdeck-review-january-2026)

**Cloudflare R2:**
- [Presigned URLs · Cloudflare R2 docs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Uploading Files to Cloudflare R2 with Pre-Signed URLs](https://ruanmartinelli.com/blog/cloudflare-r2-pre-signed-urls/)

**Real-time Patterns:**
- [Server-Sent Events vs WebSockets: Key Differences and Use Cases in 2026](https://www.nimbleway.com/blog/server-sent-events-vs-websockets-what-is-the-difference-2026-guide)
- [Server-Sent Events Beat WebSockets for 95% of Real-Time Apps](https://dev.to/polliog/server-sent-events-beat-websockets-for-95-of-real-time-apps-heres-why-a4l)

**Stripe Billing:**
- [Integrate a SaaS business on Stripe](https://docs.stripe.com/saas)
- [Architecture Patterns for SaaS Platforms: Billing, RBAC, and Onboarding](https://medium.com/appfoster/architecture-patterns-for-saas-platforms-billing-rbac-and-onboarding-964ea071f571)

**Prisma Connection Pooling:**
- [Connection pool | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [Prisma ORM Production Guide: Next.js Complete Setup 2025](https://www.digitalapplied.com/blog/prisma-orm-production-guide-nextjs)

**API Versioning:**
- [API Versioning Strategies for SaaS Platforms](https://antler.digital/blog/api-versioning-strategies-for-saas-platforms)
- [Versioning Best Practices in REST API Design](https://www.speakeasy.com/api-design/versioning)

---
*Architecture research for: OpenVideo Media Automation SaaS Platform*
*Researched: 2026-02-09*
