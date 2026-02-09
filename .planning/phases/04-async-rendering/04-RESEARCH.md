# Phase 4: Async Rendering - Research

**Researched:** 2026-02-09
**Domain:** Async job queue systems, BullMQ, Redis, server-side video rendering
**Confidence:** HIGH

## Summary

Phase 4 implements asynchronous video rendering via REST API using BullMQ (Redis-backed job queue) with separate worker processes. The architecture follows the standard async request-reply pattern: API receives render request → enqueues job → returns 202 Accepted with job ID → worker processes job → client polls status endpoint. The existing `Renderer` class from `@designcombo/node` provides Playwright-based rendering infrastructure that workers can leverage.

BullMQ is the industry-standard Node.js queue solution with 87.1 benchmark score, offering job persistence, state management, graceful shutdown, stall recovery, and production-ready patterns. The Redis backing provides atomic operations and distributed coordination. Workers run as separate Node.js processes (via fork or npm script), enabling horizontal scaling and isolation from the web application.

Key architectural decisions are locked via user CONTEXT.md: MP4-only output, no cancellation, no auto-retry, 15-minute timeout, template-first workflow with eager merge validation, per-tier queue limits, and structured error categorization.

**Primary recommendation:** Use BullMQ 5.67+ with ioredis 5.4+ for queue infrastructure, leverage existing `Renderer` class for rendering backend, implement API with 202 Accepted pattern and polling, store job metadata in Prisma models for query/filter support, run workers via `npm run worker` script using fork pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API Contract Design:**
- Every POST /api/v1/renders creates a new render (no idempotency keys)
- Input: template ID + merge data only (no raw project data — forces template-first workflow)
- Output on completion: direct URL in poll response (not presigned URLs)
- Render options: allow overrides for resolution, format, quality params
- Output format: MP4 only at launch
- API versioning via URL path: /api/v1/
- GET /api/v1/renders supports full filtering (status, templateId, date range) + cursor pagination from day one
- Merge data validated against template schema on submit (eager) — instant 400 on invalid data, no wasted queue slot

**Job Lifecycle & States:**
- States: queued → active → completed | failed
- No cancellation — once submitted, the job runs to completion
- 15-minute job timeout before marked as stalled
- No auto-retry — failed renders require user resubmission
- Completed render outputs expire after 30 days (auto-delete)

**Worker Behavior:**
- 1 render at a time per worker (sequential processing, scale by adding workers)
- Workers run as separate Node process on same machine (npm run worker)
- Start/complete status only — no progress percentage (Phase 5 adds real-time progress)
- Rendered MP4 stored on local disk (Phase 6 adds R2 cloud storage)
- Per-tier queue limits: Free: 5 queued, Pro: 50, Enterprise: unlimited
- Structured console logging for render activity

**Failure & Error Reporting:**
- Detailed error messages with context (e.g., "Missing font: Roboto-Bold not available on server")
- Typed error categories: VALIDATION_ERROR, RENDER_TIMEOUT, RESOURCE_MISSING, INTERNAL_ERROR
- Render duration metrics (queuedAt, startedAt, completedAt) tracked internally but not exposed in API

### Claude's Discretion

- Submit response shape (render ID, status, any additional metadata)
- Rendering approach — evaluate existing Playwright-based Renderer from @designcombo/node vs alternatives
- Exact error code taxonomy beyond the four main categories
- Internal metrics storage approach
- Graceful shutdown and stall recovery strategy

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | 5.67+ | Redis-backed job queue with worker pattern | Industry standard for Node.js async jobs (87.1 benchmark, 1180+ code examples, high reputation) - supports job persistence, state tracking, graceful shutdown, stall recovery, horizontal scaling |
| ioredis | 5.4+ | High-performance Redis client for Node.js | Official BullMQ recommendation (73.9 benchmark, 241 examples) - supports connection pooling, clustering, pipeline operations, error handling |
| Playwright | 1.49.0 | Chromium automation for server-side rendering | Already in stack - existing `Renderer` class uses it for headless video rendering via WebCodecs |
| Prisma | 7.3.0 | Database ORM for job metadata persistence | Already in stack - needed for storing render records, filtering by status/date, and queue limit enforcement |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/ioredis | 5.x | TypeScript types for ioredis | Development - type safety for Redis operations |
| Redis server | 7.x+ | In-memory data store for BullMQ | Production - AOF persistence enabled, separate from application database |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ | Bull (predecessor) | Bull is older, less maintained, missing features like priorities and job dependencies - BullMQ is the recommended successor |
| BullMQ | Bee-Queue | Simpler but lacks features: no job priorities, no retries, no delayed jobs - too basic for production |
| ioredis | node-redis | node-redis has 86.6 benchmark vs ioredis 73.9, but BullMQ officially recommends ioredis and all examples use it |
| Separate workers | Worker threads | Worker threads share memory with main process - defeats isolation goal. Separate processes enable horizontal scaling and crash isolation |

**Installation:**
```bash
pnpm add bullmq ioredis
pnpm add -D @types/ioredis
```

## Architecture Patterns

### Recommended Project Structure

```
editor/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── v1/
│   │           └── renders/
│   │               ├── route.ts           # POST /api/v1/renders (submit)
│   │               └── [id]/
│   │                   └── route.ts       # GET /api/v1/renders/:id (poll)
│   ├── lib/
│   │   ├── queue.ts                       # BullMQ queue initialization
│   │   └── redis.ts                       # ioredis connection singleton
│   └── workers/
│       └── render-worker.ts               # Worker process entry point
├── prisma/
│   └── schema.prisma                      # Add Render model
└── package.json                           # Add "worker" script
```

### Pattern 1: Async Request-Reply with Polling

**What:** HTTP 202 Accepted response with job ID, client polls status endpoint until completion

**When to use:** Long-running operations (video rendering 10s-5min) where immediate response isn't feasible

**Example:**
```typescript
// Source: Microsoft Azure Architecture - Async Request-Reply Pattern
// https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply

// Submit endpoint returns 202 Accepted with Location header
export const POST = withApiAuth(async (request, context) => {
  // Validate input
  const body = await request.json();
  const { templateId, mergeData, options } = body;

  // Add job to queue
  const job = await renderQueue.add('render-video', {
    templateId,
    mergeData,
    options,
    userId: context.userId,
    organizationId: context.organizationId,
  });

  // Store job metadata in database for filtering/pagination
  await prisma.render.create({
    data: {
      id: job.id,
      status: 'queued',
      templateId,
      userId: context.userId,
      organizationId: context.organizationId,
      queuedAt: new Date(),
    },
  });

  // Return 202 Accepted with Location header
  return new Response(
    JSON.stringify({
      id: job.id,
      status: 'queued',
      createdAt: new Date().toISOString(),
    }),
    {
      status: 202,
      headers: {
        'Location': `/api/v1/renders/${job.id}`,
        'Retry-After': '5', // Suggest polling every 5 seconds
      },
    }
  );
});

// Poll endpoint returns current status
export const GET = withApiAuth(async (request, context) => {
  const renderId = getIdFromPath(request.url);

  // Fetch from database (primary source of truth for API responses)
  const render = await prisma.render.findUnique({
    where: { id: renderId },
  });

  if (!render || render.organizationId !== context.organizationId) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Return status based on database record
  if (render.status === 'completed') {
    return Response.json({
      id: render.id,
      status: 'completed',
      outputUrl: render.outputUrl,
      completedAt: render.completedAt?.toISOString(),
    });
  } else if (render.status === 'failed') {
    return Response.json({
      id: render.id,
      status: 'failed',
      error: {
        category: render.errorCategory,
        message: render.errorMessage,
      },
      failedAt: render.failedAt?.toISOString(),
    });
  } else {
    return Response.json(
      {
        id: render.id,
        status: render.status, // 'queued' or 'active'
        queuedAt: render.queuedAt.toISOString(),
        startedAt: render.startedAt?.toISOString(),
      },
      {
        status: 200,
        headers: {
          'Retry-After': '5',
        },
      }
    );
  }
});
```

### Pattern 2: BullMQ Worker Process

**What:** Separate Node.js process that picks jobs from queue and processes them sequentially

**When to use:** Isolate rendering workload from web server, enable horizontal scaling, prevent crashes from affecting API

**Example:**
```typescript
// Source: BullMQ official docs - Worker setup
// https://docs.bullmq.io/guide/workers

// workers/render-worker.ts
import { Worker, Job } from 'bullmq';
import { Renderer } from '@designcombo/node';
import { prisma } from '../lib/db';
import { redisConnection } from '../lib/redis';

const worker = new Worker(
  'render-queue',
  async (job: Job) => {
    console.log(`[Worker] Processing render ${job.id}`);

    // Update database status to 'active'
    await prisma.render.update({
      where: { id: job.id },
      data: {
        status: 'active',
        startedAt: new Date(),
      },
    });

    try {
      // Fetch template with projectData (not exposed in API)
      const template = await prisma.template.findUnique({
        where: { id: job.data.templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Merge template data with user's merge data
      const projectData = applyMergeData(
        template.projectData,
        job.data.mergeData
      );

      // Use existing Renderer class
      const outputPath = `/tmp/renders/${job.id}.mp4`;
      const renderer = new Renderer({
        json: projectData,
        outputPath,
        browserOptions: {
          headless: true,
          timeout: 900000, // 15 minutes
        },
      });

      await renderer.render();

      // Update database with success
      await prisma.render.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          outputUrl: `/renders/${job.id}.mp4`,
          completedAt: new Date(),
        },
      });

      console.log(`[Worker] Render ${job.id} completed`);
      return { outputPath };
    } catch (error) {
      const errorCategory = categorizeError(error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update database with failure
      await prisma.render.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorCategory,
          errorMessage,
          failedAt: new Date(),
        },
      });

      console.error(`[Worker] Render ${job.id} failed:`, errorMessage);
      throw error; // Let BullMQ mark job as failed
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process 1 job at a time per worker
    lockDuration: 900000, // 15 minutes lock duration
    stalledInterval: 60000, // Check for stalled jobs every minute
    maxStalledCount: 1, // Fail job after 1 stall
  }
);

// Event listeners
worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('[Worker] Worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, closing worker...');
  await worker.close();
  await prisma.$disconnect();
  console.log('[Worker] Worker closed successfully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] SIGINT received, closing worker...');
  await worker.close();
  await prisma.$disconnect();
  console.log('[Worker] Worker closed successfully');
  process.exit(0);
});

console.log('[Worker] Render worker started, waiting for jobs...');
```

### Pattern 3: Queue Limit Enforcement

**What:** Check queue size before adding job, reject if tier limit reached

**When to use:** Prevent free users from submitting unlimited jobs

**Example:**
```typescript
// Source: BullMQ official docs - Job counts
// https://docs.bullmq.io/guide/jobs/getters

// Submit endpoint with tier limit check
export const POST = withApiAuth(async (request, context) => {
  const body = await request.json();
  const { templateId, mergeData, options } = body;

  // Get tier limits
  const tierLimits = {
    free: 5,
    pro: 50,
    enterprise: Infinity,
  };
  const maxQueuedJobs = tierLimits[context.tier as keyof typeof tierLimits] || 5;

  // Count queued + active jobs for this organization
  const counts = await prisma.render.count({
    where: {
      organizationId: context.organizationId,
      status: { in: ['queued', 'active'] },
    },
  });

  if (counts >= maxQueuedJobs) {
    return Response.json(
      {
        error: 'Queue limit reached',
        message: `Your ${context.tier} plan allows up to ${maxQueuedJobs} concurrent render jobs. Please wait for existing jobs to complete.`,
        limit: maxQueuedJobs,
        current: counts,
      },
      { status: 429 }
    );
  }

  // Proceed with job submission...
});
```

### Pattern 4: Cursor Pagination for Job Listing

**What:** Use offset-based pagination with filters for status, templateId, date range

**When to use:** GET /api/v1/renders endpoint with query parameters

**Example:**
```typescript
// Source: Prisma pagination docs
// https://www.prisma.io/docs/concepts/components/prisma-client/pagination

// GET /api/v1/renders with filtering and pagination
export const GET = withApiAuth(async (request, context) => {
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || '0';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const status = url.searchParams.get('status'); // 'queued', 'active', 'completed', 'failed'
  const templateId = url.searchParams.get('templateId');
  const fromDate = url.searchParams.get('fromDate');
  const toDate = url.searchParams.get('toDate');

  // Build where clause
  const where: any = {
    organizationId: context.organizationId,
  };

  if (status) {
    where.status = status;
  }

  if (templateId) {
    where.templateId = templateId;
  }

  if (fromDate || toDate) {
    where.queuedAt = {};
    if (fromDate) {
      where.queuedAt.gte = new Date(fromDate);
    }
    if (toDate) {
      where.queuedAt.lte = new Date(toDate);
    }
  }

  // Fetch renders with pagination
  const renders = await prisma.render.findMany({
    where,
    orderBy: { queuedAt: 'desc' },
    skip: parseInt(cursor),
    take: limit + 1, // Fetch one extra to determine if there are more
  });

  const hasMore = renders.length > limit;
  const items = hasMore ? renders.slice(0, -1) : renders;
  const nextCursor = hasMore ? (parseInt(cursor) + limit).toString() : null;

  return Response.json({
    items: items.map((r) => ({
      id: r.id,
      status: r.status,
      templateId: r.templateId,
      queuedAt: r.queuedAt.toISOString(),
      startedAt: r.startedAt?.toISOString(),
      completedAt: r.completedAt?.toISOString(),
      outputUrl: r.status === 'completed' ? r.outputUrl : undefined,
      error:
        r.status === 'failed'
          ? { category: r.errorCategory, message: r.errorMessage }
          : undefined,
    })),
    pagination: {
      cursor: nextCursor,
      hasMore,
      limit,
    },
  });
});
```

### Anti-Patterns to Avoid

- **Storing large blobs in Redis:** BullMQ jobs should contain IDs/references only, not full project data or video files. Use Prisma to fetch full data in worker.
- **Blocking the event loop:** Don't run rendering in API route handler - always enqueue and return 202 immediately.
- **Missing graceful shutdown:** Workers MUST handle SIGTERM/SIGINT to finish current job before exit - prevents stalled jobs.
- **Polling without Retry-After:** Always include Retry-After header to prevent client hammering.
- **Using job ID as primary key:** BullMQ job IDs can be custom strings - ensure database ID generation is independent.
- **Forgetting Redis persistence:** Enable AOF persistence in Redis config - default is no persistence, jobs lost on restart.
- **Too many queues:** Use single queue for renders - multiple queues increase Redis connections and complexity without benefit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job queue system | Custom queue with database polling | BullMQ | Job queues have subtle edge cases: atomic job claiming, stall detection, retry backoff, graceful shutdown, distributed locks. BullMQ solves these with Redis atomic operations. |
| Worker process management | Custom fork() logic with IPC | BullMQ Worker class + npm script | BullMQ handles worker lifecycle, job fetching, error handling, graceful shutdown. Custom implementations miss edge cases like SIGTERM during job processing. |
| Stall detection | Custom timeout tracking | BullMQ stalledInterval config | Detecting stalled jobs in distributed system requires Redis locks with TTL and heartbeat renewal. BullMQ implements this correctly. |
| Cursor pagination | String-based cursors with encoding | Prisma skip/take with numeric offset | Numeric offset pagination is simpler for small-medium datasets (< 10k records). String cursors add complexity without benefit at this scale. |
| Job state tracking | In-memory state machine | Database + BullMQ events | State must survive crashes and be queryable via API. Database is source of truth, BullMQ events trigger updates. |
| Merge data validation | Manual schema validation | Zod + template.mergeSchema | Template defines JSON schema for merge fields - use Zod to parse and validate against it. Catches errors before queuing. |

**Key insight:** Async job processing has decades of learned patterns (queue design, stall recovery, graceful shutdown). BullMQ encodes these patterns correctly. Custom solutions inevitably rediscover the same problems and spend months debugging race conditions.

## Common Pitfalls

### Pitfall 1: Stalled Jobs from Long CPU Operations

**What goes wrong:** Worker performs CPU-intensive operation (video encoding) exceeding lockDuration (default 30s), BullMQ marks job as stalled and requeues it, causing duplicate renders

**Why it happens:** BullMQ expects workers to send heartbeat by renewing lock. Long synchronous operations block event loop, preventing heartbeat renewal.

**How to avoid:** Set `lockDuration` to match worst-case render time (15 minutes = 900000ms). Set `stalledInterval` to check less frequently (60000ms = 1 minute). Configure `maxStalledCount: 1` to fail after first stall.

**Warning signs:** Jobs appear in active state then jump back to waiting, duplicate renders for same input, "job stalled more than allowable limit" errors

**Example:**
```typescript
// Source: BullMQ stalled jobs docs
// https://docs.bullmq.io/guide/workers/stalled-jobs

const worker = new Worker('render-queue', processor, {
  lockDuration: 900000,    // 15 minutes - matches render timeout
  stalledInterval: 60000,  // Check every 1 minute (not every 30s)
  maxStalledCount: 1,      // Fail after 1 stall, don't retry
});
```

### Pitfall 2: Lack of Idempotency Causing Duplicate Jobs

**What goes wrong:** Client retries POST request due to network error, creates duplicate jobs, wastes render credits

**Why it happens:** User constraints specify no idempotency keys, so each POST creates new job unconditionally

**How to avoid:** Client-side: Disable submit button after click until response. Server-side: Accept that duplicates can occur, document in API that POST is not idempotent. For future: Add optional `idempotencyKey` parameter.

**Warning signs:** Multiple render records with identical templateId + mergeData within seconds, user complaints about double-charges

### Pitfall 3: Missing Redis Persistence Causing Job Loss

**What goes wrong:** Redis crashes or restarts, all queued jobs disappear, users complain about lost renders

**Why it happens:** Redis defaults to no persistence (save only on shutdown). Production deployments often disable persistence for performance.

**How to avoid:** Enable AOF (Append Only File) persistence in Redis config: `appendonly yes`, `appendfsync everysec`. Test recovery by killing Redis and restarting.

**Warning signs:** Jobs disappear after Redis restart, queue emptied after server reboot, "where did my job go?" support tickets

**Example Redis config:**
```conf
# redis.conf
appendonly yes
appendfsync everysec
```

### Pitfall 4: Memory Leaks from Unclosed Browser Contexts

**What goes wrong:** Playwright browser contexts accumulate over time, worker process memory grows unbounded, OOM crash after ~50 renders

**Why it happens:** Existing `Renderer` class should close browser/page in cleanup, but if error occurs before cleanup, resources leak

**How to avoid:** Verify `Renderer.cleanup()` is called in finally block. Monitor worker memory with `process.memoryUsage()`. Restart workers after N jobs (e.g., 100) as safety measure.

**Warning signs:** Worker memory increases linearly with job count, eventual OOM crash, Chromium zombie processes

**Example:**
```typescript
// Source: Playwright best practices
// https://playwright.dev/docs/browser-contexts

// Ensure cleanup always runs
try {
  await renderer.render();
} finally {
  // Renderer.cleanup() should close browser/page
  // Add extra safety: kill entire process after job
  if (process.memoryUsage().heapUsed > 1024 * 1024 * 1024) {
    console.warn('[Worker] Memory high, restarting worker after this job');
    // Let job complete, then exit - process manager restarts
  }
}
```

### Pitfall 5: Database Concurrency Issues with Status Updates

**What goes wrong:** Race condition between worker status update and API poll query, API returns stale status, user sees "queued" when actually "active"

**Why it happens:** Worker updates BullMQ job state in Redis, then updates Prisma database - brief window where Redis is ahead of database

**How to avoid:** Accept eventual consistency - database is source of truth for API, lags Redis by <1s. Use database status, not BullMQ job state, in API responses. Add index on `(organizationId, status, queuedAt)` for fast queries.

**Warning signs:** Status sometimes lags by 1-2 seconds, API returns "queued" briefly after worker starts processing

### Pitfall 6: Queue Limit Check Race Condition

**What goes wrong:** Two requests arrive simultaneously, both check queue count (e.g., 4/5), both add job, queue now 6/5 (over limit)

**Why it happens:** Check-then-act pattern without lock - count check and job add are not atomic

**How to avoid:** Accept that limit can be slightly exceeded during race window. Enforce limit at 90% threshold to provide buffer. For strict enforcement: Use Redis atomic INCR with TTL or Prisma transaction with row lock.

**Warning signs:** Queue sometimes exceeds limit by 1-2 jobs, users report getting "limit reached" inconsistently

## Code Examples

Verified patterns from official sources:

### Redis Connection Singleton

```typescript
// Source: ioredis GitHub README
// https://github.com/redis/ioredis

// lib/redis.ts
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redisConnection =
  globalForRedis.redis ??
  new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false, // Recommended for BullMQ
  });

// Attach to globalThis in non-production to survive HMR
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redisConnection;
}

// Error handling
redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connected');
});
```

### Queue Initialization

```typescript
// Source: BullMQ Queue documentation
// https://docs.bullmq.io/guide/queues

// lib/queue.ts
import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const renderQueue = new Queue('render-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // No auto-retry per user constraints
    removeOnComplete: {
      age: 30 * 24 * 60 * 60, // Keep completed jobs 30 days
      count: 10000, // Keep at most 10k completed jobs
    },
    removeOnFail: {
      age: 30 * 24 * 60 * 60, // Keep failed jobs 30 days
      count: 5000, // Keep at most 5k failed jobs
    },
  },
});

console.log('[Queue] Render queue initialized');
```

### Error Categorization Helper

```typescript
// lib/error-categorization.ts

export type ErrorCategory =
  | 'VALIDATION_ERROR'
  | 'RENDER_TIMEOUT'
  | 'RESOURCE_MISSING'
  | 'INTERNAL_ERROR';

export function categorizeError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message : String(error);

  // Template or resource not found
  if (message.includes('not found') || message.includes('does not exist')) {
    return 'RESOURCE_MISSING';
  }

  // Timeout from Playwright
  if (
    message.includes('timeout') ||
    message.includes('Timeout') ||
    message.includes('exceeded')
  ) {
    return 'RENDER_TIMEOUT';
  }

  // Validation errors (should be caught earlier, but just in case)
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'VALIDATION_ERROR';
  }

  // Everything else is internal error
  return 'INTERNAL_ERROR';
}
```

### Prisma Model for Render Records

```prisma
// Source: Prisma schema best practices
// https://www.prisma.io/docs/concepts/components/prisma-schema

// prisma/schema.prisma

model Render {
  id             String    @id @default(cuid())
  status         String    // 'queued' | 'active' | 'completed' | 'failed'
  templateId     String
  userId         String
  organizationId String
  outputUrl      String?
  errorCategory  String?   // ErrorCategory enum values
  errorMessage   String?
  queuedAt       DateTime  @default(now())
  startedAt      DateTime?
  completedAt    DateTime?
  failedAt       DateTime?

  // Relations
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  template     Template     @relation(fields: [templateId], references: [id], onDelete: Restrict)

  // Indexes for filtering and pagination
  @@index([organizationId, status, queuedAt])
  @@index([organizationId, templateId])
  @@index([status, queuedAt])
}
```

### Worker NPM Script

```json
// package.json
{
  "scripts": {
    "worker": "tsx src/workers/render-worker.ts"
  }
}
```

### Merge Data Application Helper

```typescript
// lib/merge-data.ts

/**
 * Applies user's merge data to template's project data
 * Replaces merge field placeholders with actual values
 */
export function applyMergeData(
  projectData: any,
  mergeData: Record<string, any>
): any {
  // Deep clone to avoid mutating template
  const result = structuredClone(projectData);

  // Walk projectData tree and replace {{fieldName}} placeholders
  function walk(obj: any) {
    if (Array.isArray(obj)) {
      obj.forEach(walk);
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          // Replace {{fieldName}} with mergeData.fieldName
          obj[key] = value.replace(/\{\{(\w+)\}\}/g, (_, fieldName) => {
            return mergeData[fieldName] ?? '';
          });
        } else {
          walk(value);
        }
      }
    }
  }

  walk(result);
  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bull queue library | BullMQ | 2020+ | BullMQ is the modern successor with better TypeScript support, job priorities, flows, and improved reliability. Bull is in maintenance mode. |
| QueueScheduler class | Built-in scheduler | BullMQ 2.0+ (2021) | QueueScheduler no longer needed for delayed jobs, retries, rate limiting - functionality moved into queue/worker itself |
| node-redis client | ioredis | Current | Both work, but BullMQ examples use ioredis. ioredis has better TypeScript types and Lua scripting support. |
| String-based job IDs | CUID/UUID generation | Current | BullMQ allows custom job IDs, but using CUID matches Prisma ID generation pattern and ensures uniqueness |
| Chromium full build | chromium-headless-shell | Playwright recent | Playwright uses lightweight headless shell build for better memory efficiency (~40% reduction) |

**Deprecated/outdated:**
- **Bull queue library:** Predecessor to BullMQ, now in maintenance mode. Use BullMQ for new projects.
- **QueueScheduler class:** Removed in BullMQ v2.0+, functionality integrated into Worker.
- **Separate QueueEvents class:** Events moved to Worker/Queue classes directly.

## Open Questions

1. **Redis Hosting & Scaling**
   - What we know: Redis server needed for BullMQ, should enable AOF persistence
   - What's unclear: Local Redis vs managed (Upstash/Railway), scaling strategy for multiple workers
   - Recommendation: Start with local Redis (docker-compose), migrate to managed service before production. Single Redis instance handles ~10k jobs/sec.

2. **File Cleanup Strategy**
   - What we know: Rendered MP4s stored on local disk, Phase 6 moves to R2
   - What's unclear: Who deletes local files after 30 days? Worker, cron job, or manual?
   - Recommendation: Add scheduled job (BullMQ repeatable or system cron) to delete files older than 30 days. For Phase 4, manual cleanup acceptable.

3. **Worker Scaling & Process Management**
   - What we know: Workers run via `npm run worker`, scale by adding more workers
   - What's unclear: Use process manager (PM2/systemd) or manual? How many workers per machine?
   - Recommendation: Start with 1-2 workers manually. For production, use PM2 or systemd. Rule of thumb: 1 worker per 2 CPU cores (rendering is CPU-bound).

4. **Job Retry Strategy Future**
   - What we know: Phase 4 has no auto-retry per user constraints
   - What's unclear: Will Phase 5+ add retry logic? Should architecture accommodate it?
   - Recommendation: Design allows adding `attempts: 3` in Phase 5 without migration. Current `attempts: 1` setting is easily changed.

5. **Render Options Validation**
   - What we know: API accepts render options (resolution, format, quality)
   - What's unclear: What options does `Renderer` class support? Need validation schema?
   - Recommendation: Inspect `Renderer` interface in Phase 4 planning, create Zod schema for `options` field, validate before queuing.

## Sources

### Primary (HIGH confidence)

- **/taskforcesh/bullmq** (Context7) - Queue setup, worker patterns, job lifecycle, graceful shutdown, stall recovery
  - Topics: Worker configuration, job states, concurrency, rate limiting, error handling
  - Code examples: 1180+ verified patterns
- **/redis/ioredis** (Context7) - Redis connection setup, error handling, configuration
  - Topics: Connection options, error handling, singleton pattern
  - Code examples: 241 patterns
- **Existing Renderer class** (`/packages/node/src/renderer.ts`) - Server-side rendering implementation
  - Confirmed: Playwright-based, progress events, graceful cleanup, event emitter pattern
  - Direct inspection of codebase

### Secondary (MEDIUM confidence)

- [BullMQ Stalled Jobs Documentation](https://docs.bullmq.io/guide/workers/stalled-jobs) - Stall detection, recovery, configuration
- [BullMQ Auto-removal of Jobs](https://docs.bullmq.io/guide/queues/auto-removal-of-jobs) - Job retention, cleanup patterns
- [Microsoft Azure Async Request-Reply Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply) - API design for long-running operations
- [BullMQ Going to Production](https://docs.bullmq.io/guide/going-to-production) - Redis persistence, monitoring, best practices
- [OneUptime BullMQ Guides (2026-01-21)](https://oneuptime.com/blog/post/2026-01-21-bullmq-stalled-jobs/view) - Stalled jobs, worker crashes, error handling
- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html) - fork vs spawn, IPC, process management

### Tertiary (LOW confidence, marked for validation)

- [BullMQ pagination GitHub issues](https://github.com/taskforcesh/bullmq/issues/1007) - Pagination limitations noted, not officially documented solution
- Playwright memory optimization - WebSearch found headless-shell build reduces memory, but exact numbers vary by workload

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - BullMQ and ioredis are industry standard with extensive documentation
- Architecture: HIGH - Async request-reply pattern is well-established, existing Renderer class is proven
- Pitfalls: MEDIUM-HIGH - Stalled jobs and Redis persistence issues are documented, but specific numbers (lock duration, memory limits) depend on workload

**Research date:** 2026-02-09
**Valid until:** 90 days (2026-05-10) - BullMQ is mature (v5.67), stable release cycle, patterns unlikely to change. Redis 7.x is LTS.

**Key validation needed in planning:**
- Inspect `Renderer` class interface for supported options (resolution, format, quality)
- Confirm Chromium memory usage per render (estimate worker scaling)
- Verify Redis connection string from environment (DATABASE_URL vs REDIS_URL)
- Test merge data application with actual template schema
