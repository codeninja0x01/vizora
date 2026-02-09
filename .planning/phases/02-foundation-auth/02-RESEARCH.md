# Phase 02: Foundation & Auth - Research

**Researched:** 2026-02-09
**Domain:** Authentication, multi-tenant architecture, serverless data access
**Confidence:** HIGH

## Summary

Phase 2 establishes secure authentication with email/password, OAuth (GitHub, Google), API key management, and multi-tenant data isolation. The authentication landscape shifted significantly in early 2026 when Auth.js came under Better Auth management, making Better Auth the clear choice for new Next.js projects requiring multi-tenant support.

**Key architectural decisions:**
- **Better Auth** provides built-in multi-tenant (organization plugin), 2FA, rate limiting, and better DX than Auth.js
- **Prisma with Row-Level Security (RLS)** ensures tenant isolation at the database level, preventing data leakage
- **Upstash Redis** enables serverless-friendly rate limiting with tiered limits per subscription
- **Resend** handles transactional emails (verification, password reset, invitations)
- **Connection pooling** with `connection_limit=1` prevents serverless connection exhaustion

**Primary recommendation:** Use Better Auth with Prisma RLS for defense-in-depth multi-tenancy. This combination ensures both application-level (Better Auth organizations) and database-level (RLS) tenant isolation.

**Critical insight:** Multi-tenant data isolation requires multiple layers. Better Auth handles user-organization relationships and access control, while Prisma RLS provides database-level enforcement that catches application logic errors before they become data breaches.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | latest | Authentication & authorization | Built-in multi-tenant, modern TypeScript-first, now managing Auth.js |
| @prisma/client | 7.x | Database ORM with RLS | Type-safe queries, RLS via client extensions, battle-tested with Next.js |
| @upstash/ratelimit | latest | Serverless rate limiting | Stateless, Redis-backed, multi-region, tiered limits support |
| resend | latest | Transactional email | Developer-friendly API, reliable delivery, React email templates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @upstash/redis | latest | Redis client for rate limiting | Required with @upstash/ratelimit for serverless environments |
| @prisma/adapter-pg | latest | PostgreSQL driver adapter | Reduces bundle size, simplifies edge/serverless deployments |
| nanoid or crypto | Node built-in | API key generation | Cryptographically secure random tokens (32+ chars) |
| bcrypt or argon2 | latest | Password hashing | Better Auth handles this, but good to understand |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js (NextAuth v5) | Less built-in features (no org plugin, manual rate limiting), but more stateless session options |
| Prisma RLS | Application-level filtering | Simpler setup, but no defense against logic bugs, higher breach risk |
| Upstash Redis | express-rate-limit (in-memory) | Doesn't work across serverless function instances, single-server only |
| Resend | Nodemailer, SendGrid | More config, less DX, but more provider options |

**Installation:**
```bash
npm install better-auth @prisma/client @upstash/ratelimit @upstash/redis resend
npm install -D prisma @better-auth/cli
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth.ts              # Better Auth server config
│   ├── auth-client.ts       # Better Auth client
│   ├── db.ts                # Prisma client with RLS extension
│   ├── ratelimit.ts         # Upstash rate limiter config
│   └── email.ts             # Resend client
├── middleware.ts            # Session validation, redirects
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts    # Better Auth handler
│   │   └── v1/
│   │       └── [endpoint]/route.ts   # Protected API routes with key auth
│   └── (protected)/
│       └── dashboard/                # Protected UI routes
└── emails/                  # React email templates
```

### Pattern 1: Multi-Tenant Data Isolation with RLS

**What:** Enforce tenant boundaries at the database level using PostgreSQL Row-Level Security with Prisma client extensions.

**When to use:** ALWAYS for multi-tenant SaaS to prevent data leakage from application bugs.

**Example:**
```typescript
// Source: https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security

// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalPrisma = new PrismaClient()

export function getPrismaForOrganization(organizationId: string) {
  return globalPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await globalPrisma.$transaction([
            globalPrisma.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, TRUE)`,
            query(args),
          ])
          return result
        },
      },
    },
  })
}

// Migration: Enable RLS and create policy
// CREATE POLICY tenant_isolation_policy ON "Project"
// USING ("organizationId" = current_setting('app.current_organization_id', TRUE)::text);
```

**Critical:** Create application DB user WITHOUT `BYPASSRLS` privilege. Superusers bypass RLS.

### Pattern 2: API Key Authentication

**What:** Generate and validate API keys for programmatic access, stored hashed in database.

**When to use:** Any API that needs machine-to-machine authentication.

**Example:**
```typescript
// Source: Community best practices from https://medium.com/@guiolmar/how-to-secure-your-public-api-in-next-js-using-api-keys-47ce7e8f35ce

// lib/api-keys.ts
import { randomBytes, createHash } from 'crypto'

export function generateApiKey(): { key: string; hash: string } {
  const key = `sk_${randomBytes(32).toString('base64url')}`
  const hash = createHash('sha256').update(key).digest('hex')
  return { key, hash }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// middleware.ts or API route
export async function validateApiKey(request: Request): Promise<{ userId: string; organizationId: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const key = authHeader.slice(7)
  const hash = hashApiKey(key)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash, revokedAt: null },
    include: { user: { include: { organizations: true } } }
  })

  if (!apiKey) return null

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  })

  return {
    userId: apiKey.userId,
    organizationId: apiKey.user.organizations[0]?.id // or handle multi-org
  }
}
```

### Pattern 3: Tiered Rate Limiting

**What:** Apply different rate limits based on user's subscription tier using Upstash Redis.

**When to use:** ALWAYS for public APIs to prevent abuse and monetize tiers.

**Example:**
```typescript
// Source: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10s'), // 10 req/10s
    analytics: true,
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '10s'), // 60 req/10s
    analytics: true,
  }),
  enterprise: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '10s'), // 200 req/10s
    analytics: true,
  }),
}

// API route usage
export async function POST(request: Request) {
  const { userId, tier } = await validateApiKey(request)

  const limiter = rateLimiters[tier as keyof typeof rateLimiters] || rateLimiters.free
  const { success, limit, remaining, reset } = await limiter.limit(userId)

  if (!success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  // Process request
}
```

### Pattern 4: Better Auth with Organization Plugin

**What:** Use Better Auth's organization plugin for built-in multi-tenant user management.

**When to use:** Any multi-tenant SaaS where users belong to workspaces/teams/companies.

**Example:**
```typescript
// Source: https://www.better-auth.com/docs/plugins/organization

// lib/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import { prisma } from './db'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Verify your email',
        html: `<a href="${url}">Verify Email</a>`,
      })
    },
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Reset your password',
        html: `<a href="${url}">Reset Password</a>`,
      })
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization({
      sendInvitationEmail: async ({ email, invitationLink }) => {
        await resend.emails.send({
          from: 'noreply@yourdomain.com',
          to: email,
          subject: 'You have been invited',
          html: `<a href="${invitationLink}">Accept Invitation</a>`,
        })
      },
    }),
  ],
})

// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)

// middleware.ts - Session validation
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('better-auth.session_token')

  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}
```

### Pattern 5: Serverless Connection Pooling

**What:** Prevent connection exhaustion in Vercel serverless functions with proper Prisma configuration.

**When to use:** ALWAYS when deploying to serverless platforms (Vercel, AWS Lambda, etc.).

**Example:**
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections

// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL") // For migrations
}

// .env
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=1&pool_timeout=0"
DIRECT_DATABASE_URL="postgresql://user:pass@host/db" // No pooling for migrations

// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Key settings:**
- `connection_limit=1`: One connection per serverless function instance
- `pool_timeout=0`: Don't wait for connections (fail fast)
- Consider **Prisma Accelerate** for global connection pooling if hitting limits

### Anti-Patterns to Avoid

**1. Application-Only Multi-Tenant Filtering**
```typescript
// BAD: No database-level enforcement
const projects = await prisma.project.findMany({
  where: { organizationId: currentOrg } // Bug here = data leak
})

// GOOD: RLS enforces at DB level
const orgPrisma = getPrismaForOrganization(currentOrg)
const projects = await orgPrisma.project.findMany() // Can't leak even if bug
```

**2. Storing Plain API Keys**
```typescript
// BAD: Reversible storage
await prisma.apiKey.create({
  data: { key: generatedKey } // If DB leaks, keys leak
})

// GOOD: Hash before storage
await prisma.apiKey.create({
  data: { keyHash: hashApiKey(generatedKey) } // DB leak doesn't expose keys
```

**3. In-Memory Rate Limiting in Serverless**
```typescript
// BAD: Doesn't work across function instances
const rateLimitMap = new Map() // Each function has own Map
limiter.limit(userId) // Can't see other functions' counts

// GOOD: Shared Redis state
const limiter = new Ratelimit({ redis }) // All functions share state
```

**4. Not Setting connection_limit in Serverless**
```typescript
// BAD: Default connection pool (10+) per function
DATABASE_URL="postgresql://..." // Will exhaust DB connections

// GOOD: One connection per function
DATABASE_URL="postgresql://...?connection_limit=1&pool_timeout=0"
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flows | Custom OAuth handler | Better Auth socialProviders | OAuth has edge cases (PKCE, state validation, token refresh), Better Auth handles all |
| Password reset tokens | Custom token generation | Better Auth resetPassword | Timing attacks, expiration, single-use enforcement are subtle |
| Session management | Custom session store | Better Auth sessions | Cross-site attacks (CSRF, XSS), secure cookie flags, refresh logic |
| Rate limiting | In-memory counter | Upstash Ratelimit | Distributed state, multiple algorithms (sliding window, token bucket), analytics |
| Email sending | Raw SMTP | Resend | Deliverability (SPF/DKIM), retry logic, template rendering |
| Multi-tenant access control | Custom permission checks | Better Auth organization plugin | Role hierarchy, invitation flow, member management already built |
| Database connection pooling | Custom pool manager | Prisma with connection_limit | Serverless has unique challenges (suspended functions, leaked connections) |

**Key insight:** Authentication and multi-tenancy have massive attack surfaces. Every custom solution is a potential vulnerability. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Forgetting Database User Permissions for RLS

**What goes wrong:** RLS policies created but don't apply because application DB user has `BYPASSRLS` privilege or is a superuser.

**Why it happens:** Default Postgres users often have superuser privileges, and developers don't realize RLS doesn't apply to them.

**How to avoid:**
```sql
-- Create application user WITHOUT superuser/BYPASSRLS
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE yourdb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- Explicitly REVOKE BYPASSRLS if granted
REVOKE BYPASSRLS ON ALL TABLES IN SCHEMA public FROM app_user;
```

**Warning signs:** RLS policies exist but queries return data from other tenants in development.

### Pitfall 2: Not Validating Session Server-Side

**What goes wrong:** Middleware checks for session cookie existence, but doesn't validate it with database. Expired/revoked sessions still work.

**Why it happens:** Next.js middleware runs on Edge runtime (pre-15.2), can't easily query database. Developers use cookie presence as proxy for authentication.

**How to avoid:**
- Use Next.js 15.2+ with Node runtime in middleware for DB validation
- OR use cookie check for redirects, but ALWAYS validate with `auth.api.getSession()` in protected Server Components/Actions
- Add session validation to every protected API route

```typescript
// middleware.ts - Optimistic redirect only
if (!request.cookies.get('better-auth.session_token')) {
  return NextResponse.redirect('/login')
}

// app/dashboard/page.tsx - Server Component, MUST validate
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect('/login') // Real validation
  }

  // Safe to use session.user
}
```

**Warning signs:** Revoked sessions still access protected routes.

### Pitfall 3: Connection Pool Exhaustion in Serverless

**What goes wrong:** Vercel functions fail with "Can't reach database server" or timeout errors under load.

**Why it happens:** Each serverless function creates Prisma Client with default connection pool (10 connections). 50 concurrent functions = 500 connections, exceeding database limit (typically 100-200).

**How to avoid:**
- Set `connection_limit=1` in `DATABASE_URL`
- Use Prisma Accelerate for global connection pooling
- Monitor database connection count in production

```bash
# .env
DATABASE_URL="postgresql://user:pass@host/db?connection_limit=1&pool_timeout=0&connect_timeout=10"
```

**Warning signs:** Errors under load that disappear when traffic drops, "too many connections" in logs.

### Pitfall 4: Leaking API Keys in Client-Side Code

**What goes wrong:** API keys stored in `NEXT_PUBLIC_*` environment variables end up in browser bundle, visible to anyone.

**Why it happens:** Confusion about when environment variables are bundled vs server-only.

**How to avoid:**
- NEVER prefix API keys with `NEXT_PUBLIC_`
- Use API keys ONLY in Server Components, Server Actions, Route Handlers, or middleware
- For client-side auth, use Better Auth sessions (cookie-based)

```typescript
// BAD: Client-side API key
const apiKey = process.env.NEXT_PUBLIC_API_KEY // Bundled in JavaScript

// GOOD: Server-only API key
// app/api/data/route.ts
export async function GET() {
  const apiKey = process.env.API_KEY // Server-only, never sent to client
  const data = await fetch('https://external-api.com', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  return Response.json(data)
}
```

**Warning signs:** Search browser DevTools sources for your API key - if found, it leaked.

### Pitfall 5: Rate Limiting Before Authentication

**What goes wrong:** Rate limiter uses IP address, easily bypassed with proxies. Or applies same limit to all users instead of per-tier limits.

**Why it happens:** Adding rate limiting to public routes without considering authentication state.

**How to avoid:**
- For authenticated routes: rate limit by `userId` or `apiKeyId` with tiered limits
- For public routes (login, signup): rate limit by IP AND fingerprint (if available)
- Apply strictest limits to unauthenticated endpoints

```typescript
// app/api/v1/generate/route.ts
export async function POST(request: Request) {
  const authResult = await validateApiKey(request)

  if (!authResult) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit by userId with tier-specific limit
  const tier = await getUserTier(authResult.userId)
  const limiter = rateLimiters[tier]
  const { success } = await limiter.limit(authResult.userId) // Not IP

  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Process request
}
```

**Warning signs:** Users complain they hit limits despite being on higher tiers, rate limits shared across organization instead of per-user.

### Pitfall 6: Not Handling OAuth Profile Changes

**What goes wrong:** User changes email/name on GitHub/Google, but app shows old data because it only fetched profile on first login.

**Why it happens:** OAuth profile stored once during account linking, never refreshed.

**How to avoid:**
- Better Auth updates user profile on each OAuth login by default
- Verify Better Auth config has `updateUser: true` in social provider settings
- Consider periodic background jobs to refresh profiles for active users

**Warning signs:** User reports their name/email is outdated compared to OAuth provider.

### Pitfall 7: Treating Organization as Single-Tenant

**What goes wrong:** Assume user belongs to one organization, but users often need access to multiple (contractor, multi-org employee).

**Why it happens:** MVP thinking - "users only have one workspace" - that breaks when first contractor signs up.

**How to avoid:**
- Design user-organization as many-to-many from day one
- Use Better Auth's `activeOrganizationId` in session to track current workspace
- Provide organization switcher UI
- API requests must specify organization context (via session or explicit org ID)

```typescript
// Database schema - Many-to-many
model User {
  id String @id
  memberships Member[]
}

model Organization {
  id String @id
  members Member[]
}

model Member {
  userId String
  organizationId String
  role String // owner, admin, member
  user User @relation(...)
  organization Organization @relation(...)
  @@id([userId, organizationId])
}

// Session includes active org
const session = await auth.api.getSession()
const activeOrgId = session.session.activeOrganizationId
```

**Warning signs:** "How do I switch organizations?" from early users.

## Code Examples

Verified patterns from official sources.

### Email Verification Flow (Better Auth + Resend)

```typescript
// Source: https://www.better-auth.com/docs/authentication/email-password
// Source: https://dev.to/daanish2003/email-verification-using-betterauth-nextjs-and-resend-37gn

// lib/auth.ts
import { betterAuth } from 'better-auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      await resend.emails.send({
        from: 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome ${user.name || 'there'}!</h1>
          <p>Click the link below to verify your email:</p>
          <a href="${url}">Verify Email</a>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't create an account, ignore this email.</p>
        `,
      })
    },
  },
})

// Client-side signup
import { authClient } from '@/lib/auth-client'

const { data, error } = await authClient.signUp.email({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe',
})

if (error) {
  // Handle error (email already exists, weak password, etc.)
}

// User receives email, clicks link
// Better Auth handles verification automatically
```

### OAuth with Account Linking

```typescript
// Source: https://www.better-auth.com/docs/integrations/next

// lib/auth.ts
export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // Optional: customize scopes
      scope: ['user:email'],
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ['openid', 'profile', 'email'],
    },
  },
  // Automatically link accounts with same verified email
  accountLinking: {
    enabled: true,
    requireEmailVerification: true,
  },
})

// Client-side OAuth login
import { authClient } from '@/lib/auth-client'

// GitHub login
await authClient.signIn.social({
  provider: 'github',
  callbackURL: '/dashboard',
})

// Google login
await authClient.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
})
```

### Organization Creation and Member Invitation

```typescript
// Source: https://www.better-auth.com/docs/plugins/organization

// Client-side: Create organization
import { organizationClient } from '@/lib/auth-client'

const { data: org, error } = await organizationClient.organization.create({
  name: 'Acme Inc',
  slug: 'acme-inc',
  logo: 'https://example.com/logo.png',
  metadata: {
    industry: 'SaaS',
  },
})

// Invite member
const { data: invitation } = await organizationClient.organization.inviteMember({
  organizationId: org.id,
  email: 'teammate@example.com',
  role: 'admin',
})

// Set active organization
await organizationClient.organization.setActive({
  organizationId: org.id,
})

// Server-side: Accept invitation
// User clicks link from email → redirects to /accept-invitation?invitationId=xxx
import { auth } from '@/lib/auth'

const { data } = await auth.api.acceptInvitation({
  body: { invitationId: params.invitationId },
  headers: await headers(),
})

// Get user's organizations
const session = await auth.api.getSession({ headers: await headers() })
const orgs = session.user.organizations // Array of orgs user belongs to
```

### API Key CRUD Operations

```typescript
// Server Action: Generate API key
'use server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/api-keys'

export async function createApiKey(data: { name: string; organizationId: string }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Unauthorized')

  // Verify user has permission in organization
  const membership = await prisma.member.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: data.organizationId,
      },
    },
  })

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions')
  }

  const { key, hash } = generateApiKey()

  await prisma.apiKey.create({
    data: {
      name: data.name,
      keyHash: hash,
      userId: session.user.id,
      organizationId: data.organizationId,
      createdAt: new Date(),
    },
  })

  // Return key ONCE - never stored in plain text
  return { key }
}

// Server Action: Revoke API key
export async function revokeApiKey(keyId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Unauthorized')

  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    include: { organization: { include: { members: true } } },
  })

  if (!apiKey) throw new Error('API key not found')

  const membership = apiKey.organization.members.find(m => m.userId === session.user.id)
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Insufficient permissions')
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })
}

// Server Component: List API keys
export default async function ApiKeysPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) redirect('/select-organization')

  const apiKeys = await prisma.apiKey.findMany({
    where: {
      organizationId: activeOrgId,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      // Never select keyHash or return it to client
    },
  })

  return <ApiKeysList keys={apiKeys} />
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auth.js (NextAuth v4) | Better Auth | Jan 2026 | Auth.js now maintained by Better Auth team; new projects should use Better Auth for better DX and built-in features |
| Manual org/team tables | Better Auth organization plugin | 2025 | Built-in multi-tenant, RBAC, invitations - no need to build from scratch |
| PgBouncer for pooling | Prisma Accelerate or connection_limit=1 | 2024-2025 | Serverless-native solutions better than traditional poolers for FaaS |
| express-rate-limit | Upstash Ratelimit | 2023-2024 | Serverless requires distributed state; in-memory doesn't work across functions |
| SendGrid/Mailgun | Resend | 2023-2024 | Better DX, React email templates, simpler pricing for transactional email |
| Prisma Rust engine | Prisma with driver adapters | 2024 | Smaller bundle size, better edge/serverless support |

**Deprecated/outdated:**
- **NextAuth v4 (old import)**: Use Auth.js v5 or Better Auth instead
- **In-memory rate limiting**: Doesn't work in serverless, use Redis-backed
- **Middleware DB queries pre-Next.js 15.2**: Edge runtime couldn't access DB, now possible with Node runtime in middleware
- **Application-only multi-tenant filtering**: Always combine with RLS for defense-in-depth

## Open Questions

### 1. **Prisma RLS Extension Production Readiness**

- **What we know:** Official Prisma repo has RLS extension example, but marked "This extension is provided as an example only. It is not intended to be used in production environments."
- **What's unclear:** Is this a legal disclaimer or technical limitation? Community reports success with 500+ tenant SaaS.
- **Recommendation:** Start with RLS extension (best security), but have migration plan to alternative if issues arise. Monitor Prisma GitHub for official production-ready RLS support.

### 2. **Better Auth Maturity for Large-Scale Production**

- **What we know:** Better Auth is newer (2024-2025) than Auth.js (2020+), but now manages Auth.js. Has built-in features Auth.js lacks.
- **What's unclear:** Battle-tested at scale? Enterprise adoption stories?
- **Recommendation:** Use Better Auth for new projects (correct features, modern arch). For existing Auth.js apps, migration guide exists but not urgent unless need org plugin.

### 3. **Vercel Fluid vs Prisma Accelerate**

- **What we know:** Vercel Fluid offers `attachDatabasePool` for connection management (Next.js 15+). Prisma Accelerate is paid global pooling.
- **What's unclear:** Performance comparison, cost-effectiveness at different scales.
- **Recommendation:** Start with `connection_limit=1` (free). If experiencing cold starts or connection issues, evaluate Fluid (if on Vercel) vs Accelerate (cross-platform).

### 4. **API Key Rotation Strategy**

- **What we know:** Best practice is periodic rotation, many services support programmatic rotation.
- **What's unclear:** Optimal rotation schedule for different use cases (internal tools vs customer-facing API).
- **Recommendation:** Implement revocation first (MVP), add rotation in Phase 3+ based on security requirements. Provide grace period during rotation (old + new keys valid).

## Sources

### Primary (HIGH confidence)

**Better Auth:**
- [Better Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next) - Next.js 15 setup, middleware patterns
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization) - Multi-tenant RBAC, invitations
- [Better Auth Email & Password](https://www.better-auth.com/docs/authentication/email-password) - Email verification, password reset

**Prisma:**
- [Prisma Vercel Deployment](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel) - Connection pooling for serverless
- [Prisma RLS Extension](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) - Row-level security implementation
- [Prisma Database Connections](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections) - Connection pool configuration

**Upstash:**
- [Upstash Ratelimit Overview](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) - Serverless rate limiting algorithms
- [Upstash Ratelimit GitHub](https://github.com/upstash/ratelimit-js) - Implementation examples, tiered limits

### Secondary (MEDIUM confidence)

**Comparison & Best Practices:**
- [Better Auth vs NextAuth Comparison](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/) - Feature comparison, when to use each
- [BetterAuth vs NextAuth for SaaS](https://www.devtoolsacademy.com/blog/betterauth-vs-nextauth/) - Multi-tenant considerations
- [Auth.js Joins Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth) - Management transition announcement
- [Prisma Multi-Tenant RLS Guide](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35) - Real-world RLS implementation

**Rate Limiting & API Security:**
- [Next.js Rate Limiting Solutions 2024](https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj) - Comparison of approaches
- [Upstash Rate Limiting Blog](https://upstash.com/blog/upstash-ratelimit) - Use cases, patterns
- [Next.js API Key Security](https://medium.com/@guiolmar/how-to-secure-your-public-api-in-next-js-using-api-keys-47ce7e8f35ce) - Key generation, validation patterns

**Email & OAuth:**
- [Better Auth Email Verification Tutorial](https://dev.to/daanish2003/email-verification-using-betterauth-nextjs-and-resend-37gn) - Resend integration
- [Better Auth Password Reset Tutorial](https://dev.to/daanish2003/forgot-and-reset-password-using-betterauth-nextjs-and-resend-ilj) - Reset flow implementation

### Tertiary (LOW confidence - community/blog posts)

- [Prisma Connection Pool Exhaustion Agent Skill](https://www.agentskills.in/marketplace/@blader/prisma-connection-pool-exhaustion) - Troubleshooting guide
- [Next.js 15 Auth Guide (Medium)](https://javascript.plainenglish.io/stop-crying-over-auth-a-senior-devs-guide-to-next-js-15-auth-js-v5-42a57bc5b4ce) - Auth.js v5 setup
- [API Key Management Best Practices](https://apidog.com/blog/api-key-management-best-practices/) - General security practices

## Metadata

**Confidence breakdown:**
- **Standard stack: HIGH** - Better Auth, Prisma, Upstash, Resend are established solutions with official docs and active maintenance
- **Architecture patterns: HIGH** - Patterns sourced from official documentation (Better Auth, Prisma, Upstash) and verified community implementations
- **Multi-tenant RLS: MEDIUM** - Prisma extension marked "example only" but community reports production success; needs monitoring
- **Better Auth maturity: MEDIUM** - Newer library but now managing Auth.js; active development and feature-complete for requirements
- **Connection pooling: HIGH** - Prisma official docs + community consensus on connection_limit=1 for serverless
- **Rate limiting: HIGH** - Upstash is industry standard for serverless rate limiting with clear documentation

**Research date:** 2026-02-09
**Valid until:** ~2026-03-09 (30 days - stable domain but fast-moving ecosystem with Better Auth/Auth.js consolidation)

**Research limitations:**
- Context7 unavailable, relied on official docs + WebSearch
- Better Auth production case studies limited (newer library)
- Prisma RLS extension disclaimer creates uncertainty despite community success
- OAuth provider API changes (GitHub, Google) not verified against current provider docs

**Recommended validation steps before implementation:**
1. Test Prisma RLS extension in staging with multi-tenant data to verify isolation
2. Verify Better Auth organization plugin meets all access control requirements
3. Load test Upstash rate limiting with production traffic patterns
4. Confirm Resend deliverability in target email providers (Gmail, Outlook, etc.)
5. Review Better Auth migration guide if considering future Auth.js compatibility
