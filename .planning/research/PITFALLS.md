# Pitfalls Research: Media Automation SaaS Platform

**Domain:** Video rendering SaaS (Creatomate clone)
**Researched:** 2026-02-09
**Confidence:** MEDIUM (WebSearch verified with official docs)

---

## Critical Pitfalls

### Pitfall 1: Render Queue Jobs Stuck in Active State

**What goes wrong:**
BullMQ jobs can get stuck in "active" state for hours when workers crash or don't complete in time. The watchdog moves stalled jobs to failed state, but without proper handling, the rest of the queue stops processing while failed jobs accumulate. Jobs can also leak memory when a worker queues jobs on its own queue.

**Why it happens:**
Workers crash without cleanup, connection to Redis is lost, or job processing exceeds the stalled threshold. Default BullMQ settings don't auto-scale or auto-recover workers. If you rely on 1-2 workers and one crashes, it can take hours to notice.

**How to avoid:**
- Set explicit `lockDuration` and `stalledInterval` in BullMQ worker options
- Implement health checks that monitor active job age
- Use separate worker processes (not sandboxed mode which has memory leaks)
- Add job timeouts at the application level (not just BullMQ level)
- Monitor Redis memory and set `maxmemory` with `maxmemory-policy allkeys-lru`
- Implement worker auto-restart with process managers like PM2

**Warning signs:**
- Prometheus metrics show jobs in active state > 10 minutes
- Redis memory usage climbing without clearing
- Queue length growing while worker count stays constant
- Failed jobs with reason "job stalled more than allowable limit"

**Phase to address:**
Phase 1 (Core Infrastructure) - Build queue monitoring and health checks from day one. Don't defer to later phases.

**Sources:**
- [BullMQ stuck jobs issue](https://github.com/taskforcesh/bullmq/issues/652)
- [Fixing Stalled Jobs in BullMQ](https://upqueue.io/blog/bullmq-stalled-jobs-debug-guide/)
- [Why Your BullMQ Queue Is Quiet (But Not Healthy)](https://upqueue.io/blog/why-your-queue-is-quiet-but-not-healthy/)
- [Memory leaks with BullMQ sandboxed workers](https://github.com/mikro-orm/mikro-orm/discussions/2511)

---

### Pitfall 2: Video Texture Memory Leaks in PixiJS/WebCodecs

**What goes wrong:**
PixiJS instances remain in memory after views close. TextureCache and BaseTextureCache accumulate textures. RenderTexture GPU memory leaks even after calling destroy(). In video rendering workloads, this causes crashes after processing 10-50 videos.

**Why it happens:**
Calling `destroy()` doesn't always clear GPU memory or texture caches. The `renderGroup` property leaks elements. WebCodecs VideoFrame objects must be manually closed or they hold GPU memory forever. Developers assume garbage collection handles GPU resources (it doesn't).

**How to avoid:**
- Manually call `PIXI.utils.clearTextureCache()` after each render
- Destroy with cleanup options: `sprite.destroy({ children: true, texture: true, baseTexture: true })`
- Manually set `renderGroup` to null before destroying
- For WebCodecs, always call `videoFrame.close()` in finally blocks
- Consider replacing PixiJS with custom 2D context + WebCodecs (Diffusion Studio did this)
- Implement memory monitoring that alerts at 80% threshold
- Force garbage collection between renders in Node.js: `global.gc()`

**Warning signs:**
- Memory usage climbing linearly with each video rendered
- Process crashes with "out of memory" after N videos
- DevTools heap snapshots show detached DOM or texture objects
- GPU memory usage in Task Manager not releasing after renders

**Phase to address:**
Phase 1 (Core Infrastructure) - Address existing memory leaks before adding SaaS features. This is technical debt that will explode under load.

**Sources:**
- [PixiJS Memory Leak renderGroup issue](https://github.com/pixijs/pixijs/issues/10533)
- [RenderTexture memory leak](https://github.com/pixijs/pixijs/issues/5824)
- [Memory leaks in renderer systems fix](https://github.com/pixijs/pixijs/pull/11581)
- [Diffusion Studio replaced PixiJS with WebCodecs](https://github.com/diffusionstudio/core/releases)

---

### Pitfall 3: Multi-Tenant Data Leakage via Tenant Context

**What goes wrong:**
A single forgotten WHERE clause (`WHERE id = $1` instead of `WHERE tenant_id = $tenant AND id = $1`) silently leaks data cross-tenant. Connection pool reuse with wrong tenant context. Admin paths bypass Row Level Security (RLS) entirely. These bugs are silent - users see other tenants' data without errors.

**Why it happens:**
PostgreSQL RLS only works if tenant context is set correctly. Connection pooling reuses connections without resetting session variables. Prisma doesn't enforce tenant filtering at the ORM level. Superuser roles bypass RLS by default unless you set `FORCE ROW LEVEL SECURITY`.

**How to avoid:**
- Set `tenant_id` as session variable on every request: `SET LOCAL app.tenant_id = $1`
- Use Prisma middleware to inject tenant filter on every query
- Enable `FORCE ROW LEVEL SECURITY` on all multi-tenant tables
- Never use superuser for application queries - create role with RLS enforced
- Add integration tests that verify tenant isolation by creating data as one tenant and querying as another
- Use database-level RLS as defense-in-depth, not sole protection

**Warning signs:**
- Support tickets reporting "I can see someone else's videos"
- Audit logs showing cross-tenant data access
- Dev/staging environments with mixed tenant data in query results
- Admin tools returning data without tenant filter

**Phase to address:**
Phase 1 (Core Infrastructure) - Implement tenant isolation architecture before building features. Retrofitting is extremely risky.

**Sources:**
- [Multi-tenant data isolation with PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [PostgreSQL RLS for Multi-Tenant Isolation](https://dev.to/kochan/postgresql-rls-for-multi-tenant-isolation-protecting-4-tier-data-as-a-solo-developer-part-4-3bj)
- [How to Implement PostgreSQL RLS](https://www.techbuddies.io/2026/01/01/how-to-implement-postgresql-row-level-security-for-multi-tenant-saas/)

---

### Pitfall 4: Stripe Webhook Retries Failing Silently

**What goes wrong:**
Stripe retries failed payments for 3 days, but without custom logic, your system may grant access for weeks without payment. If your webhook handler fails to return 200, Stripe delays finalizing ALL invoices for up to 72 hours. Webhooks arrive out of order. Duplicate webhooks cause double-billing or access grants.

**Why it happens:**
Developers assume webhook delivery is exactly-once (it's at-least-once). Webhook handlers do heavy work synchronously and timeout. No idempotency checks on webhook event IDs. Plan changes mid-cycle aren't handled (Stripe can't change billing cycles - must cancel and resubscribe).

**How to avoid:**
- Return 200 immediately, queue payload for async processing with BullMQ
- Store `event.id` in database to detect duplicates (Stripe guarantees unique IDs)
- Verify webhook signature: `stripe.webhooks.constructEvent()` before processing
- Handle failed payments explicitly: check `invoice.payment_failed` and `customer.subscription.updated`
- For plan changes, implement cancel + immediate resubscribe logic
- Monitor webhook failures in Stripe Dashboard > Developers > Webhooks
- Set up retry logic with exponential backoff for downstream actions

**Warning signs:**
- Stripe dashboard shows 50x/40x webhook failures
- Users complain about access after payment failed
- Double-billing support tickets
- Invoice finalization delays > 24 hours

**Phase to address:**
Phase 2 (Billing Integration) - Build webhook infrastructure correctly from start. Idempotency is not optional.

**Sources:**
- [Stripe failed payments handling](https://benfoster.io/blog/stripe-failed-payments-how-to/)
- [Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Automate payment retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)

---

### Pitfall 5: Prisma Connection Pool Exhaustion in Serverless

**What goes wrong:**
Each serverless function creates its own PrismaClient with connection pool (default 2-10 connections). Traffic spike spawns 100 Lambda instances = 200-1000 database connections. Database hits max connections, new functions throw "connection pool timeout" errors. API returns 500s even though functions are healthy.

**Why it happens:**
Developers use default connection pool size in serverless. Each Lambda cold start creates new PrismaClient instance. PostgreSQL has hard connection limit (default 100). No connection pooler between functions and database.

**How to avoid:**
- Set connection pool size to 1 per function: `connection_limit=1` in DATABASE_URL
- Use external connection pooler: PgBouncer or Prisma Accelerate
- Set concurrency limit on Lambda functions to control max connections
- Reuse PrismaClient across function invocations (outside handler)
- Monitor database connection count: `SELECT count(*) FROM pg_stat_activity`
- Use Prisma Data Proxy for managed connection pooling

**Warning signs:**
- Errors: "connection pool timeout" or "too many connections"
- Database connection count equals max_connections
- API latency spikes during traffic bursts
- CloudWatch logs show PrismaClient instantiation on every request

**Phase to address:**
Phase 1 (Core Infrastructure) - Configure connection pooling before deploying to production. Load testing will surface this immediately.

**Sources:**
- [Prisma connection pooling in serverless](https://www.prisma.io/blog/overcoming-challenges-in-serverless-and-edge-environments-TQtONA0RVxuW)
- [Using Prisma in serverless environments](https://dev.to/prisma/using-prisma-to-address-connection-pooling-issues-in-serverless-environments-3g66)
- [Database connections documentation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)

---

### Pitfall 6: Template Duration Calculation Requires Pre-Probing

**What goes wrong:**
Like Shotstack, if you require FFmpeg probing to get clip durations before generating render JSON, your template system becomes complex and error-prone. You can't build "dynamic slideshow" templates without two-pass rendering (probe all assets, then render). API becomes slow (probe N videos + render).

**Why it happens:**
Video editing APIs that use absolute timestamps (not relative) need exact durations upfront. Templates can't be responsive to different asset lengths. Developers hard-code durations or build complex probing pipelines.

**How to avoid:**
- Design template system with relative timestamps and auto-duration like Creatomate
- Let template engine calculate clip end times based on content
- Support "fill remaining time" for last clip
- If using absolute timestamps, build asset duration cache in database
- Probe assets once during upload, store duration as metadata
- Never probe synchronously in render request path

**Warning signs:**
- Render API latency > 5 seconds before video generation starts
- FFmpeg probe subprocess calls in hot path
- Template JSON requires duration field for every clip
- Can't create "slideshow of unknown length" templates

**Phase to address:**
Phase 2 (Template System) - Design template data model to avoid this from start. Retrofitting auto-duration is architectural change.

**Sources:**
- [Shotstack template limitations](https://creatomate.com/compare/shotstack-alternative)
- [Creatomate vs Shotstack comparison](https://www.submagic.co/blog/creatomate-vs-shotstack)

---

### Pitfall 7: No Rate Limiting on Resource-Intensive Render Endpoint

**What goes wrong:**
User (or attacker) sends 1000 concurrent video render requests. Queue fills with jobs. All workers busy rendering. Redis memory explodes with job data. Database connections exhausted from API requests. Legitimate users can't render. System crashes or becomes unresponsive for hours.

**Why it happens:**
Render endpoints are resource-intensive but treated like normal API calls. No rate limiting per user/API key. No queue size limits. No cost-based rate limiting (4K 60fps costs 10x more resources than 720p 30fps).

**How to avoid:**
- Implement multi-level rate limiting:
  - Per user: 10 concurrent renders, 100/hour, 1000/day (adjust per tier)
  - Per endpoint: 50 concurrent system-wide renders
  - Per user tier: Free tier = 1 concurrent, Pro = 5, Enterprise = 20
- Use Redis for distributed rate limiting (not in-memory)
- Return 429 Too Many Requests with Retry-After header
- Show queue position in API response: "Your render is #47 in queue"
- Implement priority queue: paid tiers get priority over free
- Monitor with alerts: queue size > 500, reject new requests until < 200

**Warning signs:**
- Queue length > 1000 jobs
- All workers at 100% CPU for extended time
- Redis memory usage spiking
- Support tickets: "my render has been processing for 2 hours"
- Burst of requests from single API key

**Phase to address:**
Phase 2 (API Layer) - Add rate limiting before public launch. Abuse will happen immediately.

**Sources:**
- [API Rate Limiting best practices](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025)
- [API abuse prevention guide](https://kokil.com.np/blog/a-practical-guide-to-api-rate-limiting-and-abuse-prevention-in-modern-web-apps)
- [Rate limiting strategies](https://api7.ai/learning-center/api-101/rate-limiting-strategies-for-api-management)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Synchronous rendering in API handler | Simpler code, no queue setup | Timeouts, no scale, crashed renders lost | Never - even MVP needs async |
| Storing rendered videos in local filesystem | No S3 cost, faster writes | Lost on container restart, no CDN, multi-server breaks | Dev/test only, never production |
| No webhook signature verification | Faster implementation | Anyone can fake Stripe events, grant free access | Never - trivial to implement |
| Single shared API key per user | Simpler auth, one key to manage | Can't revoke specific integration, no audit trail | Only for MVP if using API key rotation |
| Polling job status instead of webhooks | Simpler for users initially | Database/Redis hammered with status checks | MVP only if polling interval ≥ 5 seconds |
| Using superuser for Prisma connection | Simpler setup, fewer permission errors | Bypasses RLS, security nightmare | Local development only, never staging/prod |
| No job result expiration in Redis | Don't lose recent results | Redis memory grows forever, OOM eventually | Never - set TTL of 7-30 days |
| Template JSON stored as text column | Works, no extra table | Can't query template properties, no validation | MVP only, migrate to JSONB in Phase 2 |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Webhooks | Processing synchronously, timing out after 10s | Return 200 immediately, queue for async processing with BullMQ |
| BetterAuth sessions | Not configuring Redis adapter, losing sessions on restart | Use Redis session store with persistence enabled |
| Redis (BullMQ) | Using default persistence, losing queue on restart | Enable AOF with `appendonly yes` and `appendfsync everysec` |
| PostgreSQL (Prisma) | Not setting connection pool limits | Set `connection_limit=1` for serverless, use PgBouncer for traditional |
| S3 uploads | Uploading rendered video through API server | Generate presigned URLs, let client upload directly to S3 |
| Zapier/Make webhooks | Sending full video data in webhook | Send event + URL, let them fetch video from CDN |
| Better Auth email | Using SendGrid without warmup, marked as spam | Start with transactional email service (Resend), warm up domain |
| FFmpeg workers | Spawning FFmpeg without memory limits | Use `--memory` limit in Docker or `nice`/`ionice` in Linux |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| O(n) linear search in timeline model | Rendering slows down with more clips | Use Map/Set for clip lookup by ID | > 100 clips per video |
| Loading entire video into memory | Works for 10MB videos, crashes on 100MB | Stream processing with FFmpeg, process chunks | > 50MB video files |
| No pagination on template list API | Fast with 10 templates | Add cursor-based pagination | > 100 templates per user |
| Rendering 4K 60fps by default | Looks great, uses 10x resources | Default to 1080p 30fps, charge for higher | > 10 concurrent renders |
| Storing all job logs in Redis | Easy to query recent jobs | Set TTL on log keys, archive to S3 after 7 days | > 10k jobs/day |
| Fetching all user renders on dashboard load | Fast with 5 renders | Paginate, show recent 20 with "load more" | > 50 renders per user |
| No index on `renders.user_id` | Works fine in dev | Add index: `CREATE INDEX idx_renders_user ON renders(user_id)` | > 10k total renders |
| Synchronous asset uploads during render | Simple, works locally | Upload assets first to S3, pass URLs to render | > 5 assets per render |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Not validating template JSON schema | Malicious template crashes worker with infinite loop or memory bomb | Use Zod schema validation, set max clip count (e.g., 50), max duration (e.g., 10 min) |
| Allowing arbitrary URLs in template | SSRF attack, fetch internal metadata endpoint | Whitelist domains or use proxy service, block private IP ranges |
| No size limit on uploaded assets | User uploads 5GB video, exhausts disk/memory | Enforce size limits (e.g., 100MB per asset), check before upload with presigned URLs |
| Exposing render job IDs as sequential integers | User can guess other job IDs, view status/results | Use UUIDs for job IDs |
| Not scrubbing error messages in API | Stack traces reveal file paths, DB schema | Return generic errors to API, log details internally |
| Storing API keys in plain text | Database breach exposes all keys | Hash API keys with bcrypt, store hash only (like passwords) |
| No tenant_id in S3 object keys | User can guess other users' video URLs | Include tenant_id in object key: `renders/{tenant_id}/{video_id}.mp4` |
| Webhook endpoint without authentication | Anyone can trigger renders, billing events | Require signature verification (Stripe, Zapier) or shared secret |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator during render | "Is it stuck? How long will this take?" | WebSocket or polling endpoint for progress: "Encoding... 45%" |
| Not showing queue position | User doesn't know 50 renders ahead | "Your render is #12 in queue, estimated 5 minutes" |
| Cryptic error: "Render failed" | User doesn't know if it's their fault | "Render failed: Video file at URL X is not accessible (404)" |
| Template preview not real-time | Change text, wait 30s for preview | Debounced preview updates, optimistic rendering |
| No sample data for template fields | User doesn't understand what goes in "Title" | Prefill with example data: "Your Product Name" |
| Forcing aspect ratio selection upfront | User doesn't know which to choose | Default to 16:9, show preview for 9:16 and 1:1 in UI |
| Not explaining render time estimates | "Why does 4K take 10x longer?" | Show cost/time estimate: "1080p 30fps: 2 min, 4K 60fps: 20 min" |
| Download button appears instantly | User clicks, gets 404 because still processing | Disable download until render complete, show "Processing..." |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Render queue:** Often missing dead letter queue for failed jobs - verify failed jobs don't block queue
- [ ] **Authentication:** Often missing refresh token rotation - verify tokens expire and refresh
- [ ] **Template system:** Often missing field validation - verify malicious input can't crash render
- [ ] **Billing integration:** Often missing webhook retry handling - verify missed webhook doesn't break billing
- [ ] **Video storage:** Often missing CDN configuration - verify videos served from CDN not origin
- [ ] **API rate limiting:** Often missing per-tier limits - verify free tier can't exhaust resources
- [ ] **Multi-tenancy:** Often missing RLS on ALL tables - verify admin queries still filter by tenant
- [ ] **Render workers:** Often missing memory/CPU limits - verify one large render can't crash worker
- [ ] **Database:** Often missing connection pooling - verify serverless doesn't exhaust connections
- [ ] **Asset uploads:** Often missing virus scanning - verify malicious files rejected before storage
- [ ] **Webhook endpoints:** Often missing idempotency - verify duplicate webhooks don't cause issues
- [ ] **Error handling:** Often missing user-friendly messages - verify stack traces not exposed

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Jobs stuck in active state | LOW | Run BullMQ cleanup script: `queue.clean(0, 1000, 'active')` to move to failed |
| Memory leak crashed workers | LOW | Restart workers with PM2, add monitoring to prevent recurrence |
| Cross-tenant data leak | HIGH | Audit logs for scope, notify affected users, add RLS tests, security review |
| Stripe webhook missed | MEDIUM | Backfill from Stripe API using `stripe.invoices.list()` with timestamp |
| Connection pool exhausted | LOW | Restart app servers to clear connections, add PgBouncer immediately |
| Template duration bug | MEDIUM | Re-render affected videos in background, notify users of new version |
| Rate limit bypass | LOW | Deploy rate limiter, reset Redis rate limit counters for abusers |
| S3 object with wrong permissions | LOW | Run script to fix ACLs: `aws s3api put-object-acl --bucket X --key Y --acl private` |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Render queue stuck jobs | Phase 1: Core Infrastructure | Load test with 100 concurrent jobs, verify none stuck > 5 min |
| PixiJS memory leaks | Phase 1: Core Infrastructure | Render 100 videos in sequence, verify memory returns to baseline |
| Multi-tenant data leakage | Phase 1: Core Infrastructure | Integration test: create as tenant A, query as tenant B, verify 0 results |
| Stripe webhook failures | Phase 2: Billing Integration | Send duplicate webhook, verify idempotency; kill webhook handler, verify retry |
| Prisma connection exhaustion | Phase 1: Core Infrastructure | Spawn 50 Lambda instances, verify connection count < database limit |
| Template duration complexity | Phase 2: Template System | Create template with 5 clips of unknown duration, verify renders without probing |
| No rate limiting | Phase 2: API Layer | Send 100 concurrent requests, verify 429 after limit exceeded |
| Webhook signature bypass | Phase 2: API Layer + Billing | Send webhook without signature, verify rejected with 401 |
| O(n) timeline search | Phase 1: Technical Debt Cleanup | Benchmark timeline with 1000 clips, verify < 10ms lookup time |
| No CDN for videos | Phase 3: Optimization | Load test video downloads, verify served from CDN not origin |

---

## Sources

### Critical Issues
- [Fixing Stalled Jobs in BullMQ](https://upqueue.io/blog/bullmq-stalled-jobs-debug-guide/)
- [BullMQ stuck jobs issue](https://github.com/taskforcesh/bullmq/issues/652)
- [PixiJS Memory Leak renderGroup](https://github.com/pixijs/pixijs/issues/10533)
- [Multi-tenant PostgreSQL RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Stripe webhook best practices](https://benfoster.io/blog/stripe-failed-payments-how-to/)
- [Prisma serverless connection pooling](https://www.prisma.io/blog/overcoming-challenges-in-serverless-and-edge-environments-TQtONA0RVxuW)

### Architecture & Best Practices
- [Shotstack vs Creatomate comparison](https://creatomate.com/compare/shotstack-alternative)
- [API Rate Limiting best practices](https://zuplo.com/learning-center/10-best-practices-for-api-rate-limiting-in-2025)
- [Webhook idempotency guide](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
- [GPU resource management](https://www.perfectscale.io/blog/kubernetes-gpu)

### Domain-Specific Knowledge
- [Video rendering at scale](https://superrendersfarm.com/article/gpu-ai-render-trends-2026-neural-rendering-render-farms)
- [Best video editing APIs](https://www.plainlyvideos.com/blog/best-video-editing-api)
- [Media automation SaaS mistakes](https://www.truefan.ai/blogs/user-onboarding-video-automation-saas)

---

*Pitfalls research for: Media Automation SaaS Platform*
*Researched: 2026-02-09*
*Confidence: MEDIUM - WebSearch findings verified with official documentation where available*
