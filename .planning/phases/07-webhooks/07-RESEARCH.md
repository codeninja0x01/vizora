# Phase 7: Webhooks - Research

**Researched:** 2026-02-09
**Domain:** Webhook delivery system with HMAC signatures and retry logic
**Confidence:** HIGH

## Summary

Webhooks enable automated callbacks when renders complete, requiring secure delivery with HMAC-SHA256 signatures, exponential backoff retries, and protection against SSRF/replay attacks. The phase builds on existing BullMQ infrastructure from Phase 4 (async rendering) to add a parallel webhook delivery queue.

**Core requirements:**
- User-configurable webhook URLs stored in database (per organization)
- HMAC-SHA256 signature generation using Node.js crypto module
- Exponential backoff retry pattern (5s, 25s, 125s, 625s, 3125s) via BullMQ
- SSRF protection to prevent internal network exploitation
- Idempotency handling to safely process duplicate deliveries

**Primary recommendation:** Use Node.js native crypto module for HMAC signatures, BullMQ with custom exponential backoff for delivery queue, and undici HTTP client for webhook POST requests. Follow Standard Webhooks spec for header naming and payload structure. Implement SSRF protection by blocking private/loopback IPs and using allowlist validation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js crypto | Native | HMAC-SHA256 signature generation | Built-in, zero dependencies, timing-safe comparison (crypto.timingSafeEqual) prevents timing attacks |
| BullMQ | ^5.x (existing) | Webhook delivery queue with retry | Already used for async rendering, supports custom backoff strategies |
| undici | ^6.x | HTTP client for webhook delivery | 3x faster than axios, maintained by Node.js core, HTTP/2 support, used as foundation for native fetch |
| Prisma | 7.x (existing) | Webhook configuration storage | Existing ORM, supports JSONB for metadata |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.x (existing) | Webhook URL validation | Already in stack for input validation |
| crypto.randomBytes | Native | Webhook secret generation | Cryptographically secure random values |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js crypto | webhook-hmac-kit | Adds typed error handling, but introduces dependency for problem already solved by native module |
| undici | axios | Axios more popular (40M weekly downloads) but 3x slower, larger bundle |
| Custom retry | Svix (hosted service) | Managed service handles delivery/retries but adds external dependency, cost, and data privacy concerns |
| BullMQ custom backoff | Built-in exponential | Built-in formula `2^(attempts-1) * delay` doesn't match required delays (5s→25s→125s→625s→3125s) which is 5^n pattern |

**Installation:**
```bash
npm install undici
# No additional deps needed - crypto, BullMQ, Prisma already present
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   └── v1/
│       └── webhooks/
│           ├── route.ts              # POST/GET/DELETE webhook registration
│           └── [id]/
│               └── rotate-secret/
│                   └── route.ts      # POST to rotate webhook secret
lib/
├── webhooks/
│   ├── queue.ts                      # BullMQ webhook delivery queue setup
│   ├── worker.ts                     # Webhook delivery worker (HTTP POST with retry)
│   ├── signature.ts                  # HMAC signature generation/verification
│   ├── validator.ts                  # URL validation + SSRF protection
│   └── types.ts                      # Webhook payload types
prisma/
└── schema.prisma                     # WebhookConfig model
```

### Pattern 1: Database Schema for Webhook Registration
**What:** Store webhook configurations per organization with secret, URL, enabled status, and delivery metadata
**When to use:** Always - foundation for webhook system
**Example:**
```typescript
// Source: Prisma patterns + webhook storage best practices
// prisma/schema.prisma
model WebhookConfig {
  id            String    @id @default(cuid())
  organizationId String
  organization  Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  url           String    // Validated webhook endpoint
  secret        String    // Base64 encoded secret for HMAC
  enabled       Boolean   @default(true)

  // Metadata
  lastDeliveryAt     DateTime?
  lastSuccessAt      DateTime?
  lastFailureAt      DateTime?
  consecutiveFailures Int      @default(0)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([organizationId])
  @@index([enabled])
}
```

### Pattern 2: HMAC Signature Generation with Timing-Safe Verification
**What:** Generate HMAC-SHA256 signatures using Standard Webhooks format and verify with timing attack protection
**When to use:** For every webhook delivery and verification
**Example:**
```typescript
// Source: https://nodejs.org/api/crypto.html + Standard Webhooks spec
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

interface WebhookPayload {
  webhookId: string      // Unique delivery attempt ID
  timestamp: number      // Unix timestamp (seconds)
  data: {
    type: 'render.completed' | 'render.failed'
    renderId: string
    status: 'done' | 'failed'
    outputUrl?: string
    error?: string
    metadata: Record<string, unknown>
  }
}

/**
 * Generate HMAC-SHA256 signature following Standard Webhooks spec
 * Format: msg_id.timestamp.payload
 */
export function generateWebhookSignature(
  webhookId: string,
  timestamp: number,
  payload: string,
  secret: string
): string {
  const toSign = `${webhookId}.${timestamp}.${payload}`
  const signature = createHmac('sha256', secret)
    .update(toSign)
    .digest('base64')

  return `v1,${signature}` // v1 indicates HMAC-SHA256
}

/**
 * Verify webhook signature with timing-safe comparison
 * Prevents timing attacks by using crypto.timingSafeEqual
 */
export function verifyWebhookSignature(
  webhookId: string,
  timestamp: number,
  payload: string,
  secret: string,
  providedSignature: string
): boolean {
  // Check timestamp tolerance (5 minutes) to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000)
  const timeDiff = Math.abs(currentTime - timestamp)
  if (timeDiff > 300) return false // 5 minutes tolerance

  const expectedSignature = generateWebhookSignature(webhookId, timestamp, payload, secret)

  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
    const providedBuffer = Buffer.from(providedSignature, 'utf8')

    // timingSafeEqual requires equal-length buffers
    if (expectedBuffer.length !== providedBuffer.length) return false

    return timingSafeEqual(expectedBuffer, providedBuffer)
  } catch {
    return false
  }
}

/**
 * Generate cryptographically secure webhook secret
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('base64') // 256-bit secret
}
```

### Pattern 3: BullMQ Custom Exponential Backoff (5^n Pattern)
**What:** Implement custom backoff matching required delays: 5s, 25s, 125s, 625s, 3125s
**When to use:** For webhook delivery queue worker configuration
**Example:**
```typescript
// Source: https://docs.bullmq.io/guide/retrying-failing-jobs + Custom backoff strategy
import { Worker, Job } from 'bullmq'
import { redisConnection } from '@/lib/redis'

interface WebhookJob {
  webhookConfigId: string
  renderId: string
  payload: WebhookPayload
  deliveryAttempt: number
}

/**
 * Custom backoff: 5s → 25s → 125s → 625s → 3125s (5^n pattern)
 * Required by phase spec, differs from standard exponential (2^n)
 */
function customWebhookBackoff(attemptsMade: number): number {
  // attemptsMade is 1-indexed (first failure = 1)
  // Formula: 5^attemptsMade * 1000ms
  const delaySeconds = Math.pow(5, attemptsMade)
  return delaySeconds * 1000 // Convert to milliseconds
}

export const webhookWorker = new Worker<WebhookJob>(
  'webhook-delivery',
  async (job: Job<WebhookJob>) => {
    const { webhookConfigId, renderId, payload } = job.data

    // Fetch webhook config
    const config = await prisma.webhookConfig.findUnique({
      where: { id: webhookConfigId }
    })

    if (!config || !config.enabled) {
      throw new Error('Webhook config not found or disabled')
    }

    // Generate signature
    const webhookId = payload.webhookId
    const timestamp = payload.timestamp
    const payloadString = JSON.stringify(payload.data)
    const signature = generateWebhookSignature(webhookId, timestamp, payloadString, config.secret)

    // Deliver webhook using undici for performance
    const { request } = await import('undici')
    const response = await request(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': webhookId,
        'webhook-timestamp': timestamp.toString(),
        'webhook-signature': signature,
        'user-agent': 'OpenVideo-Webhooks/1.0'
      },
      body: payloadString,
      bodyTimeout: 30000, // 30s timeout per attempt
      headersTimeout: 30000
    })

    // Consider 2xx successful, everything else retry
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Webhook delivery failed with status ${response.statusCode}`)
    }

    // Update success metadata
    await prisma.webhookConfig.update({
      where: { id: webhookConfigId },
      data: {
        lastDeliveryAt: new Date(),
        lastSuccessAt: new Date(),
        consecutiveFailures: 0
      }
    })
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 webhook deliveries in parallel
    settings: {
      backoffStrategy: customWebhookBackoff
    }
  }
)

// Error handler for failed jobs (after all retries exhausted)
webhookWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= 5) {
    // All retries exhausted - update failure metadata
    await prisma.webhookConfig.update({
      where: { id: job.data.webhookConfigId },
      data: {
        lastDeliveryAt: new Date(),
        lastFailureAt: new Date(),
        consecutiveFailures: { increment: 1 }
      }
    })
  }
})
```

### Pattern 4: SSRF Protection for User-Provided URLs
**What:** Validate webhook URLs to prevent Server-Side Request Forgery attacks targeting internal networks
**When to use:** Before saving webhook URL to database, before every delivery attempt
**Example:**
```typescript
// Source: https://www.getconvoy.io/docs/webhook-guides/tackling-ssrf + OWASP SSRF Prevention
import { URL } from 'node:url'
import { isIP } from 'node:net'

/**
 * Validate webhook URL to prevent SSRF attacks
 * Blocks: private IPs, loopback, localhost, metadata endpoints
 */
export function validateWebhookUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString)

    // Require HTTPS in production
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return { valid: false, error: 'HTTPS required for webhook URLs in production' }
    }

    // Allow http://localhost in development only
    if (process.env.NODE_ENV === 'development' && url.hostname === 'localhost') {
      return { valid: true }
    }

    // Block private/reserved IP ranges
    const ipVersion = isIP(url.hostname)
    if (ipVersion !== 0) {
      // It's an IP address
      const ip = url.hostname
      if (isPrivateOrReservedIP(ip)) {
        return { valid: false, error: 'Private/reserved IP addresses not allowed' }
      }
    }

    // Block localhost, loopback, link-local
    const blockedHostnames = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254', // AWS metadata
      'metadata.google.internal' // GCP metadata
    ]

    if (blockedHostnames.includes(url.hostname.toLowerCase())) {
      return { valid: false, error: 'Localhost and metadata endpoints not allowed' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Check if IP is in private/reserved range
 * Covers: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
 */
function isPrivateOrReservedIP(ip: string): boolean {
  const parts = ip.split('.').map(Number)

  // Class A private: 10.0.0.0/8
  if (parts[0] === 10) return true

  // Class B private: 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true

  // Class C private: 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true

  // Loopback: 127.0.0.0/8
  if (parts[0] === 127) return true

  // Link-local: 169.254.0.0/16
  if (parts[0] === 169 && parts[1] === 254) return true

  return false
}
```

### Pattern 5: Idempotency with Unique Event IDs
**What:** Use stable webhook IDs to deduplicate deliveries, preventing double-processing
**When to use:** Webhook receiver implementation (user's endpoint), optional for provider side
**Example:**
```typescript
// Source: https://hookdeck.com/webhooks/guides/implement-webhook-idempotency
// This is how USERS should implement their webhook receivers

interface ProcessedWebhook {
  id: string // webhook-id from header
  processedAt: Date
}

/**
 * Idempotent webhook processing pattern
 * Store processed webhook IDs to prevent duplicate handling
 */
export async function processWebhookIdempotently(
  webhookId: string,
  timestamp: number,
  payload: WebhookPayload['data']
): Promise<void> {
  // Check if already processed
  const existing = await prisma.processedWebhook.findUnique({
    where: { id: webhookId }
  })

  if (existing) {
    console.log(`Webhook ${webhookId} already processed at ${existing.processedAt}`)
    return // Idempotent - safe to ignore duplicate
  }

  // Process webhook (business logic)
  await handleRenderCompletion(payload)

  // Mark as processed with TTL (match webhook retry window + buffer)
  await prisma.processedWebhook.create({
    data: {
      id: webhookId,
      processedAt: new Date()
    }
  })

  // Clean up old records (older than 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await prisma.processedWebhook.deleteMany({
    where: {
      processedAt: { lt: sevenDaysAgo }
    }
  })
}
```

### Pattern 6: Webhook Registration API with Secret Management
**What:** REST API for users to register/update/delete webhook configurations with secure secret handling
**When to use:** Dashboard webhook management UI
**Example:**
```typescript
// Source: Dashboard API patterns + secret rotation best practices
// app/api/v1/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const webhookConfigSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean().optional().default(true)
})

export async function POST(req: NextRequest) {
  const session = await auth() // Assuming Better Auth session
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = webhookConfigSchema.parse(body)

  // Validate URL for SSRF protection
  const validation = validateWebhookUrl(parsed.url)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Generate secure secret
  const secret = generateWebhookSecret()

  // Create webhook config
  const config = await prisma.webhookConfig.create({
    data: {
      organizationId: session.user.organizationId,
      url: parsed.url,
      secret,
      enabled: parsed.enabled
    }
  })

  return NextResponse.json({
    id: config.id,
    url: config.url,
    secret, // Return ONCE on creation - never exposed again
    enabled: config.enabled,
    createdAt: config.createdAt
  })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configs = await prisma.webhookConfig.findMany({
    where: { organizationId: session.user.organizationId },
    select: {
      id: true,
      url: true,
      enabled: true,
      lastDeliveryAt: true,
      lastSuccessAt: true,
      lastFailureAt: true,
      consecutiveFailures: true,
      createdAt: true,
      updatedAt: true
      // Note: secret NOT included for security
    }
  })

  return NextResponse.json({ webhooks: configs })
}
```

### Anti-Patterns to Avoid
- **Returning webhook secret in GET endpoints:** Secret should only be shown once on creation, never exposed in list/detail endpoints
- **Synchronous webhook delivery in API route:** Always queue webhooks, never block API response on delivery (serverless timeout risk)
- **Using string comparison (`===`) for signature verification:** Use `crypto.timingSafeEqual` to prevent timing attacks
- **No SSRF protection:** Validates URLs allow attackers to probe internal networks via webhook delivery
- **No idempotency:** Without unique webhook IDs, retries cause duplicate processing (double charges, duplicate emails, etc.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signature generation | Custom crypto wrapper | Node.js crypto.createHmac | Native module, zero deps, timing-safe comparison built-in, used by GitHub/Stripe/etc. |
| Exponential backoff | Custom retry loop | BullMQ custom backoff strategy | Battle-tested queue, Redis persistence, handles crashes/restarts, DLQ for exhausted retries |
| SSRF protection | Regex-based URL filtering | Comprehensive IP range validation | Private IP ranges complex (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, link-local, loopback, metadata endpoints) |
| Timing-safe comparison | String equality (`===`) | crypto.timingSafeEqual | Prevents timing attacks where attacker measures response time to guess signature |
| HTTP client | Node.js http.request | undici | 3x faster, HTTP/2, connection pooling, maintained by Node.js core team |
| Webhook delivery service | Full managed service (Svix, Hookdeck) | BullMQ + custom code | Phase requires control over retry pattern (5^n), payload format, and infrastructure |

**Key insight:** Webhook systems appear simple ("just POST JSON") but have subtle security/reliability requirements. HMAC timing attacks, SSRF exploits, and replay attacks are real threats that need proper mitigation. However, modern tools (Node.js crypto, BullMQ, undici) provide building blocks without requiring heavyweight libraries or hosted services.

## Common Pitfalls

### Pitfall 1: SSRF Vulnerability via User-Provided URLs
**What goes wrong:** Attacker registers webhook URL pointing to internal network (e.g., `http://169.254.169.254/latest/meta-data/` on AWS) and your server makes request, leaking cloud credentials or internal data
**Why it happens:** Webhook URLs are user-controlled, and without validation, delivery system will POST to ANY URL including localhost, private IPs, cloud metadata endpoints
**How to avoid:** Implement comprehensive URL validation blocking private IPs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.0/8), link-local (169.254.0.0/16), and cloud metadata endpoints
**Warning signs:** Security scan flags webhook endpoint, internal network accessible from webhook worker, AWS credentials leaked in logs

### Pitfall 2: Timing Attacks on HMAC Signature Verification
**What goes wrong:** Using string equality (`===`) to compare signatures leaks timing information - attacker can guess signature byte-by-byte by measuring response time
**Why it happens:** String comparison short-circuits on first mismatch - `"abc" === "def"` returns faster than `"abc" === "aef"` because first byte differs
**How to avoid:** Always use `crypto.timingSafeEqual` which compares ALL bytes regardless of mismatches, taking constant time
**Warning signs:** Security audit flags signature verification, crypto experts recommend timingSafeEqual, OWASP guidance

### Pitfall 3: Replay Attacks Without Timestamp Validation
**What goes wrong:** Attacker intercepts valid webhook (including signature), replays it hours/days later to trigger duplicate processing (double charges, etc.)
**Why it happens:** Signature is valid indefinitely if timestamp not checked - attacker can reuse captured webhook forever
**How to avoid:** Include timestamp in signature calculation, verify timestamp is within tolerance window (5 minutes recommended), reject old webhooks
**Warning signs:** Duplicate webhook processing long after original event, users report unexpected duplicate actions

### Pitfall 4: Webhook Delivery Blocking API Response
**What goes wrong:** API route attempts webhook delivery synchronously, times out on slow/unresponsive endpoints, user sees 500 error despite successful render
**Why it happens:** Webhook endpoints controlled by users may be slow, down, or malicious (infinite response). Serverless functions have strict timeouts (10-30s on Vercel)
**How to avoid:** ALWAYS queue webhook delivery asynchronously - API response returns immediately, worker handles delivery with retries
**Warning signs:** API timeouts when webhook endpoint slow, users complain about errors when webhooks fail, serverless function timeout errors

### Pitfall 5: No Idempotency Causing Duplicate Processing
**What goes wrong:** Network glitch causes webhook to be delivered twice, user's endpoint processes both, resulting in duplicate charges/emails/actions
**Why it happens:** "At least once" delivery guarantees mean duplicates inevitable (retries, network issues, crashes during ACK)
**How to avoid:** Include unique `webhook-id` in headers, document that receivers must deduplicate using this ID, optionally provide idempotency example code
**Warning signs:** Users report duplicate processing, retries cause unexpected behavior, double charges/emails

### Pitfall 6: Exposing Webhook Secret in GET Endpoints
**What goes wrong:** Secret returned in webhook list/detail API, attacker compromises account and retrieves secret, forges webhook deliveries
**Why it happens:** Developer includes all fields in API response without considering security implications of exposing secret
**How to avoid:** Return secret ONLY on creation (POST response), never include in GET endpoints, document that users must store secret securely
**Warning signs:** Secret visible in browser DevTools, API returns secret in list endpoint, security audit flags secret exposure

### Pitfall 7: Incorrect Exponential Backoff Pattern
**What goes wrong:** Using BullMQ's built-in exponential backoff (`2^(n-1) * delay`) produces wrong retry timing: 1s, 2s, 4s, 8s, 16s instead of required 5s, 25s, 125s, 625s, 3125s
**Why it happens:** Built-in formula is `2^(attempts-1)` not `5^attempts`, developer assumes "exponential backoff" means using default
**How to avoid:** Implement custom backoff strategy with `5^attemptsMade * 1000` formula, verify retry timing in logs
**Warning signs:** Retries too frequent (2s, 4s, 8s vs 5s, 25s, 125s), phase verification fails on retry timing

### Pitfall 8: Not Handling Webhook Config Deletion During Delivery
**What goes wrong:** Webhook queued for delivery, user deletes webhook config while job in queue, worker crashes on null config
**Why it happens:** Race condition between queueing and delivery, no handling for deleted configs
**How to avoid:** Check if config exists/enabled at start of worker, gracefully skip if deleted, use database cascade delete for jobs
**Warning signs:** Worker crashes with "config not found", orphaned jobs in queue after deletion

## Code Examples

Verified patterns from official sources:

### BullMQ Custom Backoff Strategy
```typescript
// Source: https://docs.bullmq.io/guide/retrying-failing-jobs
import { Worker } from 'bullmq'

const worker = new Worker('webhook-delivery', async job => {
  // Delivery logic
}, {
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      // Custom 5^n pattern: 5s, 25s, 125s, 625s, 3125s
      return Math.pow(5, attemptsMade) * 1000
    }
  }
})
```

### Node.js Crypto HMAC Generation
```typescript
// Source: https://nodejs.org/api/crypto.html
import { createHmac, timingSafeEqual } from 'node:crypto'

// Generate signature
const signature = createHmac('sha256', secret)
  .update(dataToSign)
  .digest('base64')

// Verify with timing-safe comparison
const expectedBuffer = Buffer.from(expected, 'utf8')
const providedBuffer = Buffer.from(provided, 'utf8')

if (expectedBuffer.length !== providedBuffer.length) {
  return false
}

return timingSafeEqual(expectedBuffer, providedBuffer)
```

### Undici HTTP Request for Webhook Delivery
```typescript
// Source: https://undici.nodejs.org/#/
import { request } from 'undici'

const response = await request(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'webhook-id': webhookId,
    'webhook-timestamp': timestamp.toString(),
    'webhook-signature': signature
  },
  body: JSON.stringify(payload),
  bodyTimeout: 30000,
  headersTimeout: 30000
})

if (response.statusCode < 200 || response.statusCode >= 300) {
  throw new Error(`Delivery failed: ${response.statusCode}`)
}
```

### Standard Webhooks Payload Structure
```typescript
// Source: https://github.com/standard-webhooks/standard-webhooks
interface StandardWebhookPayload {
  type: string        // Dot-delimited event type: "render.completed"
  timestamp: string   // ISO 8601: "2026-02-09T12:34:56Z"
  data: {
    // Event-specific data
    renderId: string
    status: 'done' | 'failed'
    outputUrl?: string
    error?: string
  }
}

// Headers:
// webhook-id: msg_2KWPBgLlAfxdpx2AI54pPJ85f4W
// webhook-timestamp: 1674087231
// webhook-signature: v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4=
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom HMAC libraries (hmac-sha256 npm pkg) | Node.js native crypto module | Node 12+ (2019) | Zero dependencies, timing-safe comparison built-in |
| axios for webhooks | undici HTTP client | 2022-2024 | 3x performance improvement, HTTP/2 support |
| Custom retry loops | BullMQ with custom backoff | BullMQ 2.0+ (2021) | Redis persistence, crash recovery, DLQ |
| Proprietary webhook formats | Standard Webhooks spec | 2023-2024 | Interoperability, consistent header naming |
| Manual SSRF protection | Comprehensive IP validation patterns | Ongoing | OWASP guidance, cloud metadata endpoint awareness |
| String equality signature comparison | crypto.timingSafeEqual | Node 6+ (2016) | Timing attack mitigation |

**Deprecated/outdated:**
- **axios for high-performance scenarios:** Undici 3x faster, maintained by Node.js core, used as foundation for native fetch
- **webhook-hmac-kit or similar libraries:** Node.js crypto sufficient, adds unnecessary dependency
- **Built-in BullMQ exponential backoff for custom delays:** Formula `2^(n-1)` doesn't match all retry patterns, custom strategy needed for 5^n
- **Managed webhook services for simple use cases:** Phase requires custom retry pattern (5^n) not offered by Svix/Hookdeck, adds cost and data privacy concerns

## Open Questions

1. **Should webhook delivery logs be stored in database or just Redis?**
   - What we know: BullMQ retains job data for 30 days (can configure), includes delivery attempts and errors
   - What's unclear: Whether users need queryable delivery history beyond BullMQ's retention
   - Recommendation: Start with BullMQ retention only, add database logging if users request detailed history. Reduces complexity.

2. **Should webhook secret rotation be manual or scheduled?**
   - What we know: Best practice is 90-day rotation with grace period, dual-secret support enables zero-downtime rotation
   - What's unclear: Whether to implement automated rotation or just manual "rotate secret" button
   - Recommendation: Manual rotation initially (simpler), document 90-day best practice, consider scheduled rotation in future phase

3. **How to handle webhook URLs that redirect?**
   - What we know: User might configure URL that 301/302 redirects, undici can follow redirects automatically
   - What's unclear: Security implications of following redirects (SSRF bypass via redirect to private IP?)
   - Recommendation: Disable automatic redirects (`maxRedirections: 0`), validate only final URL, reject redirects for security

4. **Should webhook configuration be per-organization or per-user?**
   - What we know: Better Auth organization plugin used, renders belong to organizations
   - What's unclear: Phase says "user can register webhook URL" but context suggests organization-level
   - Recommendation: Organization-level webhooks (one per org), require organization admin role to configure

5. **What HTTP status codes should trigger retry vs permanent failure?**
   - What we know: 2xx = success, 5xx = retry, 4xx usually permanent (except 429 rate limit)
   - What's unclear: Should 404/410 skip retries? Should 401/403 retry in case of temporary auth issues?
   - Recommendation: Retry on 5xx and 429, permanent failure on 400/401/403/404/410, document in webhook payload

## Sources

### Primary (HIGH confidence)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html) - HMAC, timingSafeEqual, signature generation
- [BullMQ Retrying Failing Jobs](https://docs.bullmq.io/guide/retrying-failing-jobs) - Exponential backoff, custom strategies
- [Standard Webhooks Specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) - Header naming, payload structure
- [Undici Documentation](https://undici.nodejs.org/) - HTTP client API, performance
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) - Database schema patterns

### Secondary (MEDIUM confidence)
- [Hookdeck: SHA256 Webhook Signature Verification](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification) - HMAC best practices
- [Hookdeck: Webhook Idempotency](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) - Deduplication patterns
- [Svix: Webhook Best Practices - Security](https://www.svix.com/resources/webhook-best-practices/security/) - SSRF, replay attacks
- [Svix: Webhook Retry Best Practices](https://www.svix.com/resources/webhook-best-practices/retries/) - Exponential backoff patterns
- [Convoy: Tackling SSRF](https://www.getconvoy.io/docs/webhook-guides/tackling-ssrf) - SSRF prevention implementation
- [Svix: Zero Downtime Secret Rotation](https://www.svix.com/blog/zero-downtime-secret-rotation-webhooks/) - Dual-secret rotation pattern
- [Webhooks.fyi: Key Rotation](https://webhooks.fyi/ops-experience/key-rotation) - Secret rotation UX patterns
- [Medium: Handling Failed Webhooks with Exponential Backoff](https://medium.com/wellhub-tech-team/handling-failed-webhooks-with-exponential-backoff-72d2e01017d7) - Real-world retry patterns
- [GitHub Docs: Validating Webhook Deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) - Industry-standard signature verification

### Tertiary (LOW confidence - community/forum discussions)
- [DEV.to: Why Undici is Faster Than Node.js Core HTTP](https://dev.to/alex_aslam/why-undici-is-faster-than-nodejss-core-http-module-and-when-to-switch-1cjf) - Performance comparisons
- [DEV.to: Webhooks E2E Testing for Next.js](https://dev.to/ash_dubai/webhooks-end-to-end-testing-for-nextjs-applications-mastering-5a2k) - Testing patterns
- [GitHub Discussion: BullMQ Exponential Backoff](https://github.com/taskforcesh/bullmq/discussions/585) - Custom backoff examples
- [Medium: Most Webhook Signatures Are Broken](https://yusufhansacak.medium.com/most-webhook-signatures-are-broken-4ad00acfb755) - Common implementation mistakes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js crypto and BullMQ are proven, well-documented, already in project stack
- Architecture: HIGH - Patterns verified from multiple authoritative sources (Node.js docs, BullMQ docs, Standard Webhooks spec)
- Pitfalls: MEDIUM-HIGH - SSRF/timing attacks documented in OWASP/Svix/Convoy, but some edge cases community-sourced
- HTTP client choice: MEDIUM - Undici performance claims from benchmarks and Node.js core team statements, but less battle-tested in webhooks than axios
- Secret rotation patterns: MEDIUM - Best practices from Svix/webhooks.fyi, but UX decisions organization-specific

**Research date:** 2026-02-09
**Valid until:** 2026-04-09 (60 days - stable domain, crypto/BullMQ APIs stable, webhook patterns mature)
