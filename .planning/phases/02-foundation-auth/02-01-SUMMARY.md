---
phase: 02-foundation-auth
plan: 01
subsystem: auth, database
tags: better-auth, prisma, postgresql, resend, oauth, github, google, organizations

# Dependency graph
requires:
  - phase: 01-editor-polish
    provides: Next.js app structure and UI foundation
provides:
  - Prisma schema with User, Session, Account, Verification, Organization, Member, Invitation, and ApiKey models
  - Better Auth server configuration with email/password, OAuth providers, and organization plugin
  - Better Auth React client for frontend auth operations
  - Auth API endpoints mounted at /api/auth/*
affects:
  - 02-foundation-auth (all subsequent plans in this phase)
  - Any future phase requiring authentication or multi-tenancy

# Tech tracking
tech-stack:
  added:
    - better-auth@1.4.18 (authentication framework)
    - "@prisma/client@7.3.0" (ORM client)
    - prisma@7.3.0 (CLI - dev)
    - "@upstash/ratelimit@2.0.8" (rate limiting)
    - "@upstash/redis@1.36.2" (serverless Redis client)
    - resend@6.9.1 (email sending)
  patterns:
    - Prisma singleton pattern with HMR support for serverless environments
    - Better Auth organization plugin for multi-tenant architecture
    - Prisma 7 configuration pattern (datasource in schema, connection via env vars)

key-files:
  created:
    - editor/prisma/schema.prisma (8 models for auth and organizations)
    - editor/prisma/prisma.config.ts (Prisma 7 CLI configuration)
    - editor/src/lib/db.ts (Prisma singleton client)
    - editor/src/lib/auth.ts (Better Auth server config)
    - editor/src/lib/auth-client.ts (Better Auth React client)
    - editor/src/app/api/auth/[...all]/route.ts (Auth API catch-all handler)
  modified:
    - editor/.env.sample (added DATABASE_URL, auth, OAuth, email env vars)
    - editor/next.config.ts (added better-auth to serverExternalPackages)
    - editor/package.json (added dependencies)

key-decisions:
  - "Migrated to Prisma 7 pattern: removed url/directUrl from schema, use env vars directly"
  - "Better Auth organization plugin chosen for multi-tenancy over manual implementation"
  - "Resend selected for email sending with noreply@openvideo.dev as default sender"
  - "OAuth providers: GitHub and Google for social login"
  - "Account linking enabled with email verification requirement"

patterns-established:
  - "Prisma singleton: globalForPrisma pattern to survive HMR in development"
  - "Better Auth email templates: Simple HTML with indigo accent (#6366f1) matching brand"
  - "Organization invitations: Manual URL construction using invitation.id"

# Metrics
duration: 5m 25s
completed: 2026-02-09
---

# Phase 02 Plan 01: Database Schema & Auth Foundation Summary

**Prisma schema with 8 auth models and Better Auth configured with email/password, GitHub/Google OAuth, organization plugin, and Resend email verification**

## Performance

- **Duration:** 5m 25s (325 seconds)
- **Started:** 2026-02-09T09:20:47Z
- **Completed:** 2026-02-09T09:26:12Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Complete Prisma schema with User, Session, Account, Verification, Organization, Member, Invitation, and ApiKey models ready for Better Auth adapter
- Better Auth server configured with email/password authentication (email verification required), GitHub and Google OAuth providers, and organization plugin for multi-tenancy
- Auth API endpoints mounted at /api/auth/* with Next.js catch-all handler
- Better Auth React client exported with organization support for frontend components

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Prisma schema with database client** - `2b66ee4` (feat)
2. **Task 2: Configure Better Auth server, client, and catch-all route** - `4dc8ef5` (feat)

## Files Created/Modified

**Created:**
- `editor/prisma/schema.prisma` - Complete auth schema with 8 models (User, Session, Account, Verification, Organization, Member, Invitation, ApiKey)
- `editor/prisma/prisma.config.ts` - Prisma 7 CLI connection configuration
- `editor/src/lib/db.ts` - Prisma singleton client with HMR support and connection pooling
- `editor/src/lib/auth.ts` - Better Auth server config with email/password, OAuth (GitHub + Google), organization plugin, Resend email sending
- `editor/src/lib/auth-client.ts` - Better Auth React client with organization plugin
- `editor/src/app/api/auth/[...all]/route.ts` - Catch-all API route handler for Better Auth

**Modified:**
- `editor/.env.sample` - Added DATABASE_URL, DIRECT_DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY
- `editor/next.config.ts` - Added 'better-auth' to serverExternalPackages array
- `editor/package.json` - Added better-auth, @prisma/client, @upstash/ratelimit, @upstash/redis, resend dependencies
- `pnpm-lock.yaml` - Dependency lockfile updated

## Decisions Made

**Prisma 7 Migration Pattern:** Encountered breaking change where `url` and `directUrl` are no longer supported in schema.prisma. Adopted Prisma 7 pattern: datasource without connection strings in schema, prisma.config.ts for CLI commands, environment variables read directly by PrismaClient constructor.

**Better Auth Organization Plugin:** Chose Better Auth's built-in organization plugin for multi-tenant architecture. Provides out-of-the-box Member, Invitation, and organization role management with Prisma adapter support.

**Email Provider Selection:** Resend chosen for transactional emails (verification, password reset, invitations) with fallback to noreply@openvideo.dev for development. Environment variable RESEND_FROM_EMAIL allows production override.

**OAuth Providers:** GitHub and Google OAuth enabled with account linking and email verification requirements. Both are widely used and provide reliable identity verification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Prisma 7 breaking change**
- **Found during:** Task 1 (Prisma schema creation)
- **Issue:** Prisma 7 no longer supports `url` and `directUrl` properties in schema.prisma datasource block. Running `npx prisma generate` failed with error P1012: "The datasource property `url` is no longer supported in schema files."
- **Fix:** Removed `url` and `directUrl` from datasource block in schema.prisma. Created prisma.config.ts with connection configuration for CLI commands. Updated db.ts to rely on environment variables (DATABASE_URL) read directly by PrismaClient constructor per Prisma 7 pattern.
- **Files modified:** editor/prisma/schema.prisma (removed url/directUrl), editor/prisma/prisma.config.ts (created), editor/src/lib/db.ts (removed datasourceUrl constructor option)
- **Verification:** `npx prisma validate` succeeded with "schema is valid" message. `npx prisma generate` succeeded without errors. TypeScript compilation passed.
- **Committed in:** 2b66ee4 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed Better Auth organization plugin API signature**
- **Found during:** Task 2 (Better Auth configuration)
- **Issue:** TypeScript error on `sendInvitationEmail` callback - property `invitationLink` does not exist. Better Auth organization plugin callback receives `{ email, invitation, organization, inviter }` but not a pre-constructed link.
- **Fix:** Updated callback signature to destructure `invitation` and `organization` objects. Manually constructed invitation link using `process.env.BETTER_AUTH_URL` and `invitation.id`: ``${baseUrl}/accept-invitation?id=${invitation.id}``.
- **Files modified:** editor/src/lib/auth.ts
- **Verification:** TypeScript compilation passed without errors on auth.ts
- **Committed in:** 4dc8ef5 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking issues)
**Impact on plan:** Both fixes were essential to unblock task completion. Prisma 7 migration was a library breaking change requiring immediate adaptation. Better Auth API fix ensured correct integration. No scope creep - all changes necessary for correctness.

## Issues Encountered

**Prisma 7 Breaking Change:** The plan was written assuming Prisma 6 patterns. Prisma 7 introduced breaking changes to datasource configuration. This was quickly identified and resolved using Prisma 7 documentation patterns.

**Better Auth Documentation Gap:** Better Auth organization plugin documentation didn't clearly specify the exact callback signature for `sendInvitationEmail`. Used TypeScript error messages to identify correct properties and construct the invitation URL manually.

## User Setup Required

**External services require manual configuration before authentication will work.** The following services need API keys and configuration:

### Required Services

1. **PostgreSQL Database** (Neon, Supabase, Railway, or similar)
   - Set `DATABASE_URL` environment variable (pooled connection string with `?connection_limit=1&pool_timeout=0`)
   - Set `DIRECT_DATABASE_URL` environment variable (direct connection for migrations)
   - Run `cd editor && npx prisma migrate dev` to create database tables

2. **Better Auth Secret**
   - Generate random secret: `openssl rand -base64 32`
   - Set `BETTER_AUTH_SECRET` environment variable

3. **GitHub OAuth** (optional, for GitHub login)
   - Create OAuth App at https://github.com/settings/developers
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
   - Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables

4. **Google OAuth** (optional, for Google login)
   - Create OAuth 2.0 Client at https://console.cloud.google.com/apis/credentials
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables

5. **Resend** (for email verification and password reset)
   - Create API key at https://resend.com/api-keys
   - Set `RESEND_API_KEY` environment variable
   - Verify domain at https://resend.com/domains or use onboarding@resend.dev for development

### Verification

After setting environment variables and running migrations:

```bash
cd editor
npx prisma migrate dev --name init
pnpm dev
```

Visit http://localhost:3000/api/auth/ok - should return 200 OK (Better Auth health check).

## Next Phase Readiness

**Ready for Phase 2 continuation:** All foundational auth and database infrastructure is in place:

- Prisma schema validated and client generated successfully
- Better Auth server configured with all required providers
- Auth API endpoints mounted and ready to handle requests
- Auth client available for frontend integration

**Pending for full functionality:**
- User must configure external services (database, OAuth providers, Resend)
- Database migrations must be run to create tables
- Next plans (02-02 through 02-05) will build UI components and middleware that consume this foundation

**No blockers for next plans in Phase 2** - all subsequent plans depend on this foundation being in place, which it now is.

## Self-Check: PASSED

All files exist:
- ✓ editor/prisma/schema.prisma
- ✓ editor/prisma/prisma.config.ts
- ✓ editor/src/lib/db.ts
- ✓ editor/src/lib/auth.ts
- ✓ editor/src/lib/auth-client.ts
- ✓ editor/src/app/api/auth/[...all]/route.ts

All commits exist:
- ✓ 2b66ee4 (Task 1)
- ✓ 4dc8ef5 (Task 2)

---
*Phase: 02-foundation-auth*
*Completed: 2026-02-09*
