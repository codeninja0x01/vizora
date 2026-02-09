---
phase: 09-billing-usage
plan: 02
subsystem: billing
tags: [stripe, webhooks, subscriptions, payments]
dependency_graph:
  requires: [09-01]
  provides: [stripe-webhook-handlers]
  affects: [subscription-sync, credit-rollover]
tech_stack:
  added: [stripe-webhooks, date-fns]
  patterns: [idempotency-check, signature-verification, RepeatableRead-transactions]
key_files:
  created:
    - editor/src/app/api/webhooks/stripe/route.ts
    - editor/src/lib/stripe-handlers.ts
  modified:
    - editor/src/lib/credits.ts
decisions:
  - decision: "Idempotency via SubscriptionEvent prevents duplicate event processing"
    rationale: "Stripe may send duplicate webhooks, especially during retries. Recording and checking processed status ensures each event is handled exactly once"
    alternatives: ["Redis-based deduplication", "No idempotency check"]
    trade_offs: "Database-based idempotency is simpler and more reliable than external state"
  - decision: "Raw body parsing with request.text() for signature verification"
    rationale: "Stripe webhook signature verification requires the raw request body, not parsed JSON. Next.js App Router provides request.text() for this use case"
    alternatives: ["Middleware to capture raw body", "bodyParser.raw() from Express"]
    trade_offs: "Next.js 15 App Router native approach is simpler than middleware"
  - decision: "2x monthly allotment rollover cap on invoice.paid"
    rationale: "Prevents unlimited credit accumulation while rewarding users who don't fully use their monthly allotment"
    alternatives: ["No rollover", "Unlimited rollover", "Fixed cap (e.g., 10000 credits)"]
    trade_offs: "2x cap balances user benefit with preventing abuse"
  - decision: "Immediate suspension on payment failure (no grace period)"
    rationale: "Past_due subscriptions should not continue rendering to avoid unpaid usage accumulation"
    alternatives: ["3-day grace period", "Reduce to free tier limits"]
    trade_offs: "Immediate suspension is stricter but prevents unpaid usage"
metrics:
  duration: "3m 15s"
  completed_date: 2026-02-09
---

# Phase 09 Plan 02: Stripe Webhook Handlers Summary

**One-liner:** Stripe webhook endpoint with signature verification, idempotency, and 5 subscription lifecycle handlers (checkout, invoice paid/failed, subscription updated/deleted) for credit management

## What Was Built

### 1. Stripe Webhook Route (`/api/webhooks/stripe`)

POST endpoint that receives and processes Stripe webhook events:

- **Signature Verification**: Uses `stripe.webhooks.constructEvent()` with raw body from `request.text()` to verify webhook authenticity
- **Idempotency Check**: Queries `SubscriptionEvent` by `stripeEventId` before processing to prevent duplicate event handling
- **Event Recording**: Upserts event record with `processed: false` before handler execution, marks `processed: true` after success
- **Organization Lookup**: Helper function `getOrganizationIdFromEvent()` extracts org ID from event metadata or customer lookup
- **Event Routing**: Switch statement dispatches to appropriate handler based on `event.type`
- **Error Handling**: Returns 400 for invalid signatures, 503 when Stripe not configured, 200 for successful/duplicate events

### 2. Subscription Lifecycle Event Handlers

Five handler functions in `stripe-handlers.ts` manage the full subscription lifecycle:

#### **handleCheckoutComplete**
- **Subscription Mode**: Retrieves subscription from Stripe, determines tier from price ID, updates Organization with `stripeCustomerId`, `stripeSubscriptionId`, `tier`, `subscriptionStatus: active`, `billingCycleStart/End`, grants initial `monthlyAllotment` credits, creates CreditTransaction with `reason: subscription_renewal`
- **Payment Mode**: Reads `packSize` from metadata, atomically adds credits to balance using RepeatableRead isolation, creates CreditTransaction with `reason: credit_pack`, resets `lowCreditWarningShown`

#### **handleInvoicePaid**
- Skips `subscription_create` invoices (handled by checkout.session.completed)
- Performs credit rollover in RepeatableRead transaction: `newBalance = Math.min(currentBalance + monthlyAllotment, monthlyAllotment * 2)` (2x cap)
- Updates `billingCycleStart/End`, `lastCreditReset`, resets low credit flags
- Creates CreditTransaction with rollover metadata (`rolledOver`, `maxRollover`, `capped`)

#### **handlePaymentFailed**
- Immediately updates Organization `subscriptionStatus: past_due` (no grace period)
- Finds organization owner via `Member` with `role: owner`
- Sends email notification via Resend (optional, logs if not configured) with subject "Payment Failed - Rendering Suspended" and link to `/dashboard/billing`

#### **handleSubscriptionUpdated**
- Syncs `subscriptionStatus` and `cancelAtPeriodEnd` from Stripe subscription object
- Detects tier changes by comparing price ID to `STRIPE_PRO_PRICE_ID`, updates `tier` and `monthlyAllotment` if changed
- Does NOT change `creditBalance` mid-cycle (preserves balance, adjusts allotment on next invoice.paid)

#### **handleSubscriptionDeleted**
- Reverts Organization to free tier: `tier: free`, `subscriptionStatus: canceled`, `stripeSubscriptionId: null`, `monthlyAllotment: 3000`
- Keeps remaining `creditBalance` (doesn't zero out)
- Creates CreditTransaction with metadata recording tier transition for audit trail

### 3. All Handler Properties

- **RepeatableRead Isolation**: All handlers that touch `creditBalance` use Prisma transactions with `isolationLevel: RepeatableRead` to prevent race conditions
- **Optional Resend**: Email notifications follow same pattern as auth.ts - Resend imported dynamically if `RESEND_API_KEY` set, logs to console if not configured
- **Comprehensive Logging**: All handlers log start/completion with key details for debugging webhook flows

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing CreditTransaction fields in credits.ts**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `deductCreditsForRender()` and `refundCredits()` in credits.ts (from plan 09-01) were missing required `balanceBefore` and `balanceAfter` fields when creating CreditTransaction records, causing TypeScript compilation errors
- **Fix:** Added `balanceBefore` and `balanceAfter` fields to both CreditTransaction.create() calls, capturing balance state before and after each transaction
- **Files modified:** `editor/src/lib/credits.ts`
- **Commit:** 40a9e2f

**Why this was a deviation:** Schema changes in 09-01 added required fields to CreditTransaction model, but credits.ts implementation wasn't updated. This blocked TypeScript compilation (Deviation Rule 3 - auto-fix blocking issues).

## Verification Results

- [x] TypeScript compiles without errors (after Prisma regeneration and credits.ts fix)
- [x] Webhook route exports POST handler at `/api/webhooks/stripe`
- [x] stripe-handlers.ts exports all 5 handler functions
- [x] Webhook route verifies signature before processing (uses `stripe.webhooks.constructEvent()`)
- [x] Idempotency check prevents duplicate event processing (SubscriptionEvent with `stripeEventId` unique constraint)
- [x] handleInvoicePaid caps rollover at 2x monthlyAllotment (`Math.min(currentBalance + allotment, allotment * 2)`)
- [x] handlePaymentFailed sets subscriptionStatus to 'past_due' immediately (no grace period)
- [x] handleCheckoutComplete handles both subscription and payment (credit pack) modes (via `session.mode` check)
- [x] All credit balance mutations use RepeatableRead isolation (all handlers use `isolationLevel: RepeatableRead` in transactions)

## Success Criteria Met

- [x] Stripe webhook endpoint securely processes subscription lifecycle events (signature verification, idempotency, error handling)
- [x] Credit rollover respects 2x monthly cap (handleInvoicePaid implements `Math.min()` cap)
- [x] Payment failures immediately suspend rendering with email notification (handlePaymentFailed sets past_due and sends email)
- [x] Subscription changes sync tier and allotment to database (handleSubscriptionUpdated and handleSubscriptionDeleted maintain consistency)
- [x] Idempotency prevents duplicate processing (SubscriptionEvent table with processed flag)

## Technical Highlights

1. **Raw Body Signature Verification**: Next.js App Router pattern using `await request.text()` to get raw body for `stripe.webhooks.constructEvent()` - critical for webhook security
2. **Database-Backed Idempotency**: Uses `SubscriptionEvent` table with `stripeEventId` unique constraint and `processed` boolean flag - simpler and more reliable than Redis-based deduplication
3. **Credit Rollover Math**: `Math.min(currentBalance + monthlyAllotment, monthlyAllotment * 2)` elegantly implements 2x cap in single expression
4. **RepeatableRead Isolation**: All credit balance mutations wrapped in Prisma transactions with RepeatableRead isolation level prevents race conditions in concurrent webhook processing
5. **Optional Resend Pattern**: Dynamic import pattern (`import('resend').then()`) ensures Resend is optional for development, logs to console when not configured

## Files Modified

| File | Lines | Purpose |
|------|-------|---------|
| `editor/src/app/api/webhooks/stripe/route.ts` | 203 | Webhook endpoint with signature verification and event routing |
| `editor/src/lib/stripe-handlers.ts` | 471 | Five subscription lifecycle event handlers |
| `editor/src/lib/credits.ts` | 3 | Added balanceBefore/balanceAfter to CreditTransaction creation (bug fix) |

**Total:** 677 lines added across 3 files

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 40a9e2f | fix(09-02): add missing balanceBefore/balanceAfter to credit transactions | editor/src/lib/credits.ts |
| 6a0c1b9 | feat(09-02): add Stripe webhook route with signature verification | editor/src/app/api/webhooks/stripe/route.ts |
| a9fc40a | feat(09-02): implement subscription lifecycle event handlers | editor/src/lib/stripe-handlers.ts |

## Integration Points

- **Dependencies**: Stripe client from `@/lib/stripe`, Prisma client from `@/lib/db`, TIER_CONFIG from `@/lib/billing`, date-fns `addMonths()`, optional Resend for emails
- **Database**: SubscriptionEvent (idempotency), Organization (billing state), CreditTransaction (audit trail), Member (owner email)
- **External Services**: Stripe webhooks (inbound), Resend emails (outbound, optional)

## Next Steps

This plan completes Stripe webhook infrastructure. Next plans in phase 09:
- **09-03**: Checkout session creation for subscriptions and credit packs
- **09-04**: Usage tracking and credit deduction integration with render queue
- **09-05**: Billing dashboard UI with subscription management

## Self-Check: PASSED

Verified all files exist:
```bash
FOUND: editor/src/app/api/webhooks/stripe/route.ts
FOUND: editor/src/lib/stripe-handlers.ts
```

Verified all commits exist:
```bash
FOUND: 40a9e2f
FOUND: 6a0c1b9
FOUND: a9fc40a
```
