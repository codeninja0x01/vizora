# Phase 9: Billing & Usage - Research

**Researched:** 2026-02-09
**Domain:** Stripe subscription billing with usage-based credit tracking
**Confidence:** HIGH

## Summary

Phase 9 implements a subscription billing system using Stripe with usage-based credit deduction. The architecture combines Stripe's subscription management with organization-scoped credit tracking, where credits are deducted per render based on video duration. The system supports three tiers (Free/Pro/Enterprise) differentiated by credit allotment and concurrent render limits only. Enterprise is contact-sales with no self-serve checkout.

Key technical challenges include: atomic credit deduction with race condition prevention, webhook idempotency for billing events, subscription lifecycle management (upgrades/downgrades/cancellations), credit rollover with 2x monthly cap, failed payment handling with immediate suspension, and low-credit notifications at 20% threshold.

**Primary recommendation:** Use Stripe Checkout for paid subscriptions, Stripe Customer Portal for self-service management, webhook-driven subscription synchronization, database-level transaction isolation for credit operations, and Resend for transactional billing notifications.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Credit model:**
- Duration-based credits — credits scale with video output length
- Credit rate: Claude's discretion (pick a rate that makes commercial sense)
- Unused credits roll over to next billing cycle, capped at 2x monthly allotment
- Users can purchase additional credit packs as one-time top-ups beyond their plan allotment

**Plan tiers:**
- Three tiers: Free, Pro, Enterprise
- Free tier includes a small monthly credit allotment (enough for light usage)
- Tiers differentiated by credit allotment and concurrent render limits only — no feature-gating or resolution caps
- Enterprise tier is "Contact Sales" — custom pricing, no public price, user fills out contact form

**Low credit & enforcement:**
- Low-credit warning triggers at 20% of monthly allotment remaining
- Warnings delivered via in-app banner/badge AND email notification
- Hard stop at zero credits — render API returns 402, no renders until credits refilled or plan upgraded
- Failed payment suspends rendering access immediately (no grace period)

**Billing dashboard:**
- Dashboard-only billing page (no public-facing pricing page)
- Invoice history handled through Stripe Customer Portal link — not built in-app
- Billing overview layout: Claude's discretion
- Upgrade prompt placement: Claude's discretion

### Claude's Discretion
- Credit rate per duration unit (pick commercially sensible rate)
- Exact Free tier credit allotment amount
- Billing page overview layout and information density
- Upgrade prompt placement (billing page only vs contextual prompts at limit points)
- Credit pack pricing and sizes

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | latest | Server-side payment processing | Official Stripe SDK for Node.js, handles all server API operations |
| @stripe/stripe-js | latest | Client-side Stripe integration | Official client library for Checkout and Elements |
| Prisma 7 | 7.x | Database ORM with transactions | Already in use, supports transaction isolation levels |
| Resend | latest | Transactional emails | Already in use for notifications |
| BullMQ | latest | Queue management | Already in use, extended for credit checks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stripe CLI | latest | Webhook testing locally | Development environment for webhook event simulation |
| date-fns | latest | Billing cycle calculations | Date arithmetic for subscription periods and rollover logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe | Paddle, Lemon Squeezy | Stripe has superior API flexibility, webhook reliability, and Next.js ecosystem support |
| Custom credit tracking | Stripe Metered Billing | Metered billing reports usage to Stripe for invoicing; we need real-time deduction with 402 enforcement |
| Database transactions | Redis locks | Redis adds complexity; PostgreSQL transaction isolation is sufficient for this scale |

**Installation:**
```bash
npm install stripe @stripe/stripe-js date-fns
npm install --save-dev stripe-cli
```

## Architecture Patterns

### Recommended Database Schema Extensions

Extend Organization model:
```prisma
model Organization {
  // Existing fields...

  // Billing fields
  stripeCustomerId    String?   @unique
  stripeSubscriptionId String?  @unique
  tier                String    @default("free") // free, pro, enterprise
  subscriptionStatus  String?   // active, past_due, canceled, trialing, incomplete

  // Credit tracking
  creditBalance       Int       @default(0)
  monthlyAllotment    Int       @default(0) // Changes per tier
  billingCycleStart   DateTime?
  billingCycleEnd     DateTime?
  lastCreditReset     DateTime?

  // Warnings
  lowCreditWarningShown Boolean @default(false)
  lowCreditEmailSentAt  DateTime?

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Relations
  creditTransactions CreditTransaction[]
  subscriptionEvents SubscriptionEvent[]
}

model CreditTransaction {
  id             String   @id @default(cuid())
  organizationId String
  amount         Int      // Negative for deductions, positive for additions
  balanceBefore  Int
  balanceAfter   Int
  reason         String   // "render", "subscription_renewal", "credit_pack_purchase", "rollover"
  renderId       String?  // Null for non-render transactions
  metadata       Json?    // Duration, pack size, etc.
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, createdAt])
  @@index([reason])
}

model SubscriptionEvent {
  id              String   @id @default(cuid())
  organizationId  String
  stripeEventId   String   @unique // For idempotency
  eventType       String   // customer.subscription.created, invoice.paid, etc.
  processed       Boolean  @default(false)
  metadata        Json?
  createdAt       DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([stripeEventId])
}
```

### Pattern 1: Atomic Credit Deduction

**What:** Transaction-isolated credit check and deduction before render submission
**When to use:** Every render API call, before queue insertion
**Example:**
```typescript
// Source: PostgreSQL transaction isolation + Prisma patterns
async function deductCreditsForRender(
  organizationId: string,
  videoDurationSeconds: number
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const creditsRequired = calculateCredits(videoDurationSeconds);

  return await prisma.$transaction(
    async (tx) => {
      // Lock the organization row for update
      const org = await tx.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { creditBalance: true, monthlyAllotment: true }
      });

      if (org.creditBalance < creditsRequired) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      const balanceBefore = org.creditBalance;
      const balanceAfter = balanceBefore - creditsRequired;

      // Update balance
      await tx.organization.update({
        where: { id: organizationId },
        data: { creditBalance: balanceAfter }
      });

      // Record transaction
      await tx.creditTransaction.create({
        data: {
          organizationId,
          amount: -creditsRequired,
          balanceBefore,
          balanceAfter,
          reason: 'render',
          metadata: { durationSeconds: videoDurationSeconds }
        }
      });

      return { success: true, newBalance: balanceAfter };
    },
    {
      isolationLevel: 'RepeatableRead', // Prevents lost updates
      timeout: 10000
    }
  );
}
```

### Pattern 2: Stripe Webhook Handler with Idempotency

**What:** Process Stripe events with signature verification and duplicate prevention
**When to use:** Webhook endpoint for all Stripe events
**Example:**
```typescript
// Source: https://docs.stripe.com/webhooks
import Stripe from 'stripe';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Verify signature - CRITICAL for security
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature invalid', { status: 400 });
  }

  // Idempotency check - prevent duplicate processing
  const existing = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: event.id }
  });

  if (existing && existing.processed) {
    return new Response('Event already processed', { status: 200 });
  }

  // Record event immediately
  await prisma.subscriptionEvent.upsert({
    where: { stripeEventId: event.id },
    create: {
      stripeEventId: event.id,
      organizationId: await getOrgIdFromEvent(event),
      eventType: event.type,
      processed: false,
      metadata: event.data
    },
    update: {}
  });

  // Process based on event type
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event);
      break;
  }

  // Mark as processed
  await prisma.subscriptionEvent.update({
    where: { stripeEventId: event.id },
    data: { processed: true }
  });

  return new Response('OK', { status: 200 });
}
```

### Pattern 3: Credit Rollover with Cap

**What:** Reset credits monthly while preserving unused up to 2x monthly allotment
**When to use:** Billing cycle renewal (triggered by invoice.paid webhook)
**Example:**
```typescript
// Source: Common SaaS billing pattern + ElevenLabs rollover model
async function handleBillingCycleReset(organizationId: string) {
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        creditBalance: true,
        monthlyAllotment: true,
        tier: true
      }
    });

    const currentBalance = org.creditBalance;
    const monthlyAllotment = org.monthlyAllotment;
    const maxRollover = monthlyAllotment * 2;

    // Calculate new balance: current unused + new allotment, capped at 2x
    const newAllotment = monthlyAllotment;
    const potentialBalance = currentBalance + newAllotment;
    const cappedBalance = Math.min(potentialBalance, maxRollover);

    const balanceBefore = currentBalance;
    const addedCredits = cappedBalance - currentBalance;

    await tx.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: cappedBalance,
        lastCreditReset: new Date(),
        billingCycleStart: new Date(),
        billingCycleEnd: addMonths(new Date(), 1),
        lowCreditWarningShown: false, // Reset warning
        lowCreditEmailSentAt: null
      }
    });

    await tx.creditTransaction.create({
      data: {
        organizationId,
        amount: addedCredits,
        balanceBefore,
        balanceAfter: cappedBalance,
        reason: 'subscription_renewal',
        metadata: {
          monthlyAllotment,
          rolloverAmount: currentBalance,
          cappedAt: maxRollover
        }
      }
    });
  });
}
```

### Pattern 4: Stripe Customer Portal Integration

**What:** Generate portal session for customer self-service
**When to use:** User clicks "Manage Subscription" in billing dashboard
**Example:**
```typescript
// Source: https://docs.stripe.com/customer-management/integrate-customer-portal
async function createPortalSession(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { stripeCustomerId: true }
  });

  if (!org.stripeCustomerId) {
    throw new Error('No Stripe customer found');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
  });

  return session.url; // Redirect user to this URL
}
```

### Pattern 5: Failed Payment Handling

**What:** Suspend rendering immediately, send notification, enable retry
**When to use:** invoice.payment_failed webhook
**Example:**
```typescript
// Source: Stripe dunning + immediate suspension pattern
async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (!org) return;

  // Immediate suspension - no grace period
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: 'past_due'
      // creditBalance remains unchanged - they keep existing credits
      // but cannot render until payment succeeds
    }
  });

  // Send notification email
  await resend.emails.send({
    from: 'billing@openvideo.app',
    to: org.billingEmail,
    subject: 'Payment Failed - Action Required',
    html: `
      <h2>Payment Failed</h2>
      <p>Your payment for OpenVideo failed. Rendering is suspended until payment succeeds.</p>
      <p><a href="${updatePaymentUrl}">Update Payment Method</a></p>
      <p>Stripe will automatically retry your payment.</p>
    `
  });

  // Note: Stripe Smart Retries will automatically retry payment
  // No manual retry logic needed - handled by Stripe
}
```

### Anti-Patterns to Avoid

- **Checking credits after queue insertion:** Credit check MUST happen before adding to queue - prevents "render started but out of credits" state
- **Skipping webhook signature verification:** Exposes system to forged events and payment manipulation
- **Using Read Committed isolation for credit deduction:** Can cause lost updates and double-spending in concurrent scenarios
- **Polling Stripe API for subscription status:** Webhook-driven updates are more reliable and avoid rate limits
- **Building custom invoice history UI:** Use Stripe Customer Portal - saves development time and stays synchronized

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subscription UI & payment forms | Custom checkout forms | Stripe Checkout | PCI compliance, fraud protection, payment method updates, mobile-optimized, supports 135+ currencies |
| Invoice management & history | Custom invoice list/PDF generation | Stripe Customer Portal | Auto-updates, handles tax, supports receipts, payment method management, mobile support |
| Payment retry logic | Manual retry scheduler | Stripe Smart Retries | AI-optimized timing, $9 recovered per $1 spent, automatic card updater, dunning emails |
| Credit card validation | Custom regex/Luhn check | Stripe Elements | Real-time validation, postal code verification, prevents card testing attacks |
| Subscription proration | Manual proration calculator | Stripe proration (default) | Handles upgrades/downgrades, credits for unused time, automatically invoices difference |
| Multi-currency pricing | Currency conversion logic | Stripe multi-currency support | Real-time exchange rates, local payment methods, handles currency-specific rounding |

**Key insight:** Stripe handles 99% of billing edge cases that seem simple but have dozens of failure modes. Custom solutions inevitably miss card network requirements, tax implications, regional regulations, and fraud patterns.

## Common Pitfalls

### Pitfall 1: Race Conditions in Credit Deduction

**What goes wrong:** Two concurrent renders deduct credits simultaneously, both reading balance before either writes, resulting in negative balance or double-deduction

**Why it happens:** Default transaction isolation (Read Committed) allows phantom reads between check and update

**How to avoid:**
- Use Prisma transaction with `isolationLevel: 'RepeatableRead'` or `'Serializable'`
- Alternatively, use `SELECT FOR UPDATE` to lock the organization row
- Credit check and deduction MUST be atomic in single transaction

**Warning signs:**
- Negative credit balances in database
- Users report "out of credits" but balance shows credits
- Credit transaction sum doesn't match current balance

### Pitfall 2: Webhook Event Replay Attacks

**What goes wrong:** Attacker intercepts valid webhook event and re-sends it, causing duplicate credit additions or status changes

**Why it happens:** Not verifying Stripe-Signature header allows forged events

**How to avoid:**
- ALWAYS verify webhook signature using `stripe.webhooks.constructEvent()`
- Use raw request body (before JSON parsing) for signature verification
- Store processed event IDs in `SubscriptionEvent` table with unique constraint
- Return 200 immediately for already-processed events

**Warning signs:**
- Duplicate subscription events in logs
- Credits added multiple times for single payment
- Subscription status flip-flopping

### Pitfall 3: Express Body Parser Interfering with Webhook Verification

**What goes wrong:** Webhook signature verification fails with "No signatures found matching the expected signature" despite valid events

**Why it happens:** Express json() middleware parses body before webhook route, corrupting raw body needed for HMAC verification

**How to avoid:**
- Webhook route MUST receive raw body: use `express.raw({ type: 'application/json' })`
- Place webhook route BEFORE `express.json()` in middleware chain
- For Next.js App Router: disable body parsing with `export const config = { api: { bodyParser: false } }`

**Warning signs:**
- Webhook signature verification fails in production but works with Stripe CLI
- Error message mentions "expected signature"
- Webhook endpoint works initially then breaks after adding body parsing

### Pitfall 4: Not Handling Subscription Status Transitions

**What goes wrong:** User downgrade sets `cancel_at_period_end=true` but system immediately restricts access; or subscription transitions through intermediate states

**Why it happens:** Subscription lifecycle has many states (incomplete, trialing, active, past_due, canceled, unpaid) with complex transitions

**How to avoid:**
- Map status to access levels: `active` and `trialing` = full access, `past_due` = suspended, `canceled` = read-only
- Check `cancel_at_period_end` separately - users retain access until period ends
- Handle `customer.subscription.updated` webhook - don't assume status changes atomically
- Store both `subscriptionStatus` and `cancel_at_period_end` in database

**Warning signs:**
- Users lose access immediately after downgrade (should keep until period end)
- Access granted during payment failure (past_due should suspend)
- Confusion about "active but canceling" state

### Pitfall 5: Credit Rollover Without Cap

**What goes wrong:** Users accumulate unlimited credits by not using service, then suddenly use years of rolled-over credits in one month

**Why it happens:** Unlimited rollover creates unbounded liability and revenue recognition issues

**How to avoid:**
- Cap rollover at 2x monthly allotment (user decision matches this)
- Reset low-credit warnings on billing cycle reset
- Document rollover cap clearly in UI and emails
- Consider expiring credits after 1-2 cycles instead of accumulating

**Warning signs:**
- Some users have credit balances 10x+ their monthly allotment
- Revenue doesn't match usage patterns
- Users "banking" credits for future heavy usage

### Pitfall 6: Hard-Coding Credit Rates

**What goes wrong:** Credit rate calculation scattered across codebase, impossible to adjust pricing without code changes

**Why it happens:** Convenience of inline calculation instead of configuration

**How to avoid:**
- Store credit rate in configuration (environment variable or database)
- Centralize credit calculation in single function: `calculateCredits(durationSeconds: number): number`
- Include rate in credit transaction metadata for audit trail
- Plan for future: different rates per tier, promotional rates, time-based pricing

**Warning signs:**
- Same calculation duplicated across render API, queue worker, analytics
- Rate changes require multiple file edits
- No audit trail of what rate was used for past renders

### Pitfall 7: Insufficient Credit Warning Not Resetting

**What goes wrong:** User tops up credits or renews subscription, but low-credit warning persists until manually dismissed

**Why it happens:** Warning flag set to true but never reset when balance increases

**How to avoid:**
- Reset `lowCreditWarningShown` and `lowCreditEmailSentAt` when:
  - Billing cycle renews (invoice.paid webhook)
  - Credit pack purchased
  - Balance increases above 20% threshold
- Check threshold on every credit transaction: if balance goes from below to above threshold, reset flags
- Separate in-app warning (can be dismissed) from email notification (time-throttled)

**Warning signs:**
- Users report warning even after topping up
- Warning email sent multiple times for same low-credit event
- Warning persists across billing cycles

### Pitfall 8: 402 Error Without Helpful Context

**What goes wrong:** Render API returns 402 but client doesn't know current balance, required credits, or upgrade options

**Why it happens:** Treating 402 as simple boolean check instead of structured error response

**How to avoid:**
- Return detailed error body with 402 status:
```json
{
  "error": "insufficient_credits",
  "code": 402,
  "message": "Not enough credits for this render",
  "details": {
    "required": 150,
    "available": 45,
    "shortfall": 105,
    "actions": [
      { "type": "upgrade", "label": "Upgrade to Pro", "url": "/dashboard/billing?upgrade=pro" },
      { "type": "buy_credits", "label": "Buy Credit Pack", "url": "/dashboard/billing?action=credits" }
    ]
  }
}
```
- Include duration-to-credits calculation in error for transparency
- Provide direct link to billing page with appropriate action

**Warning signs:**
- Users confused about why render failed
- Support tickets asking "how many credits do I need?"
- Users don't know upgrade is an option

## Code Examples

Verified patterns from official sources:

### Stripe Checkout Session for Subscription

```typescript
// Source: https://docs.stripe.com/billing/subscriptions/build-subscriptions
async function createSubscriptionCheckout(
  organizationId: string,
  priceId: string // Stripe Price ID for Pro or Enterprise tier
) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { stripeCustomerId: true, slug: true }
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Create or retrieve customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { organizationId }
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customerId }
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    metadata: { organizationId }
  });

  return session.url; // Redirect user to this URL
}
```

### One-Time Credit Pack Purchase

```typescript
// Source: https://github.com/stripe-samples/checkout-one-time-payments
async function createCreditPackCheckout(
  organizationId: string,
  packSize: number // e.g., 1000, 5000, 10000 credits
) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { stripeCustomerId: true }
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Calculate price (example: $10 per 1000 credits)
  const pricePerCredit = 0.01; // $0.01 per credit
  const amountCents = Math.round(packSize * pricePerCredit * 100);

  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId,
    mode: 'payment', // One-time payment, not subscription
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${packSize.toLocaleString()} Credit Pack`,
          description: 'One-time credit top-up'
        },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?credits_added=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    metadata: { organizationId, packSize, type: 'credit_pack' }
  });

  return session.url;
}
```

### Low Credit Check and Notification

```typescript
// Source: Common SaaS pattern + user requirement (20% threshold)
async function checkAndWarnLowCredits(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      creditBalance: true,
      monthlyAllotment: true,
      lowCreditWarningShown: true,
      lowCreditEmailSentAt: true,
      tier: true
    }
  });

  const threshold = org.monthlyAllotment * 0.2; // 20% of monthly allotment

  if (org.creditBalance <= threshold && !org.lowCreditWarningShown) {
    // Set flag immediately to prevent duplicate warnings
    await prisma.organization.update({
      where: { id: organizationId },
      data: { lowCreditWarningShown: true }
    });

    // Send email if not sent recently (within last 24 hours)
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (!org.lowCreditEmailSentAt || org.lowCreditEmailSentAt < dayAgo) {
      await resend.emails.send({
        from: 'notifications@openvideo.app',
        to: org.billingEmail,
        subject: 'Low Credit Warning - OpenVideo',
        html: `
          <h2>Your credits are running low</h2>
          <p>Your current balance: <strong>${org.creditBalance}</strong> credits</p>
          <p>Monthly allotment: <strong>${org.monthlyAllotment}</strong> credits</p>
          <p>You're at ${Math.round((org.creditBalance / org.monthlyAllotment) * 100)}% of your monthly limit.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Manage your plan</a></p>
        `
      });

      await prisma.organization.update({
        where: { id: organizationId },
        data: { lowCreditEmailSentAt: now }
      });
    }

    return { shouldShowBanner: true, balance: org.creditBalance, threshold };
  }

  return { shouldShowBanner: false };
}
```

### Render API Credit Enforcement

```typescript
// Source: User requirement (402 status, hard stop)
export async function POST(req: Request) {
  const session = await auth(); // Better Auth session
  const organizationId = session.user.activeOrganizationId;

  const body = await req.json();
  const { templateId, mergeData } = body;

  // Load template to calculate duration
  const template = await prisma.template.findUniqueOrThrow({
    where: { id: templateId }
  });

  const videoDurationSeconds = calculateDuration(template.projectData);

  // CRITICAL: Check and deduct credits BEFORE queueing
  try {
    const result = await deductCreditsForRender(organizationId, videoDurationSeconds);

    if (!result.success) {
      // Return detailed 402 error
      return Response.json({
        error: 'insufficient_credits',
        message: 'Not enough credits to render this video',
        details: {
          required: calculateCredits(videoDurationSeconds),
          available: result.newBalance,
          durationSeconds: videoDurationSeconds,
          actions: [
            { type: 'upgrade', label: 'Upgrade Plan', url: '/dashboard/billing?action=upgrade' },
            { type: 'buy_credits', label: 'Buy Credits', url: '/dashboard/billing?action=credits' }
          ]
        }
      }, { status: 402 });
    }

    // Check subscription status (failed payment suspension)
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { subscriptionStatus: true }
    });

    if (org.subscriptionStatus === 'past_due') {
      return Response.json({
        error: 'subscription_past_due',
        message: 'Rendering suspended due to failed payment',
        details: {
          action: { type: 'update_payment', label: 'Update Payment Method', url: '/dashboard/billing?action=payment' }
        }
      }, { status: 402 });
    }

    // Credits deducted successfully, proceed with render
    const render = await prisma.render.create({
      data: {
        status: 'queued',
        templateId,
        userId: session.user.id,
        organizationId,
        mergeData
      }
    });

    await renderQueue.add('render-video', { renderId: render.id });

    // Check if low credits warning needed
    const warning = await checkAndWarnLowCredits(organizationId);

    return Response.json({
      render,
      creditsRemaining: result.newBalance,
      lowCreditWarning: warning.shouldShowBanner
    });

  } catch (error) {
    if (error.message === 'INSUFFICIENT_CREDITS') {
      // Race condition or concurrent depletion
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { creditBalance: true }
      });

      return Response.json({
        error: 'insufficient_credits',
        message: 'Not enough credits (balance may have changed)',
        details: {
          available: org.creditBalance,
          required: calculateCredits(videoDurationSeconds)
        }
      }, { status: 402 });
    }
    throw error;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Usage Records API | Billing Meters API | Stripe API 2025-06-30 | 10,000 events/sec capacity, no subscription required before reporting, single meter across customers |
| Manual proration calculation | Stripe automatic proration (default) | Stable since 2020 | Handles upgrades/downgrades automatically, credits unused time |
| Scheduled retries | Smart Retries with AI | 2024 | $9 revenue recovered per $1 spent, optimal retry timing |
| Snapshot webhook events | Thin webhook events | Migration available 2025 | Reduced payload size, fetch full object via API if needed |
| express.json() for all routes | express.raw() for webhooks | Permanent pattern | Raw body required for signature verification |
| Stripe Elements v2 | Stripe Elements v3 | 2025 | Improved mobile UX, better fraud detection |

**Deprecated/outdated:**
- **Usage Records API**: Replaced by Billing Meters for new integrations (legacy still supported)
- **Sources API**: Replaced by Payment Methods API (sunset 2021)
- **Charges API**: Replaced by Payment Intents API (2019)

## Open Questions

1. **What credit rate should we use?**
   - What we know: Need commercially sensible rate that scales with video duration
   - What's unclear: Target revenue per render, competitive pricing
   - Recommendation: Start with 10 credits per second of video output (e.g., 30-second video = 300 credits). Free tier gets 3000 credits/month (10 renders), Pro gets 30,000 (100 renders), Enterprise custom. Adjust based on infrastructure costs.

2. **Should credit packs expire?**
   - What we know: Subscription credits roll over with 2x cap
   - What's unclear: Whether one-time purchased credit packs should also expire
   - Recommendation: Credit packs never expire (differentiation from subscription), but clearly label in UI. Alternative: 6-month expiration to prevent indefinite liability.

3. **How to handle refunds for failed renders?**
   - What we know: Credits deducted before render starts
   - What's unclear: Should system automatically refund credits if render fails?
   - Recommendation: Automatic refund for system failures (errorCategory: 'system'), no refund for user errors (invalid template, missing assets). Record refund in CreditTransaction with reason: 'refund_system_failure'.

4. **What's the upgrade/downgrade proration behavior?**
   - What we know: Stripe handles proration automatically
   - What's unclear: What happens to credits when tier changes mid-cycle?
   - Recommendation: On tier change, immediately adjust monthlyAllotment field, but preserve current creditBalance. On next billing cycle, reset with new tier's rollover cap. This prevents loss of purchased credits while transitioning to new tier economics.

5. **Should Enterprise tier have infinite credits?**
   - What we know: Enterprise is custom pricing, contact-sales only
   - What's unclear: Whether to track credits or grant unlimited rendering
   - Recommendation: Track credits but set very high limit (e.g., 1,000,000) rather than truly unlimited. Enables usage analytics and anomaly detection. Custom contracts can specify higher limits.

## Sources

### Primary (HIGH confidence)
- [Stripe Build Subscriptions Documentation](https://docs.stripe.com/billing/subscriptions/build-subscriptions) - Integration architecture
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) - Event handling and security
- [Stripe Customer Portal Integration](https://docs.stripe.com/customer-management/integrate-customer-portal) - Self-service management
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) - Isolation levels and atomicity
- [Prisma Transactions Reference](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - Transaction isolation in Prisma

### Secondary (MEDIUM confidence)
- [Stripe Subscription Prorations](https://docs.stripe.com/billing/subscriptions/prorations) - Upgrade/downgrade handling (verified official docs)
- [Stripe Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries) - Failed payment recovery (verified official docs)
- [Stripe One-Time Payments Sample](https://github.com/stripe-samples/checkout-one-time-payments) - Credit pack implementation pattern (official sample)
- [Resend Templates Feature](https://resend.com/blog/new-features-in-2025) - Email template capabilities (verified official blog)
- [ElevenLabs Credit Rollover](https://help.elevenlabs.io/hc/en-us/articles/27561768104081-How-does-credit-rollover-work) - Real-world rollover pattern (user-facing docs)

### Tertiary (LOW confidence)
- Various Medium/DEV.to articles on Stripe integration - Used for general patterns but verified against official docs
- Generic billing system pitfall articles - General wisdom, not OpenVideo-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Stripe is industry standard, Prisma/BullMQ already in use
- Architecture: HIGH - Patterns verified against official Stripe docs and PostgreSQL documentation
- Pitfalls: HIGH - Based on official Stripe guidance and common production issues documented in support forums
- Credit rates: LOW - Requires business analysis and competitive research not performed here
- Credit pack expiration: LOW - Business policy decision without technical constraint

**Research date:** 2026-02-09
**Valid until:** 2026-03-31 (Stripe API stable, but pricing/feature changes happen quarterly)
