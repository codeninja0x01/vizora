# Phase 9: Billing & Usage - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can subscribe to paid plans (Free/Pro/Enterprise) with usage-based credit tracking. Credits are deducted per render based on video duration. Users manage subscriptions via Stripe. Enterprise tier is contact-sales only. This phase does NOT include public pricing/marketing pages or feature-gating — tiers differ by credits and concurrency only.

</domain>

<decisions>
## Implementation Decisions

### Credit model
- Duration-based credits — credits scale with video output length
- Credit rate: Claude's discretion (pick a rate that makes commercial sense)
- Unused credits roll over to next billing cycle, capped at 2x monthly allotment
- Users can purchase additional credit packs as one-time top-ups beyond their plan allotment

### Plan tiers
- Three tiers: Free, Pro, Enterprise
- Free tier includes a small monthly credit allotment (enough for light usage)
- Tiers differentiated by credit allotment and concurrent render limits only — no feature-gating or resolution caps
- Enterprise tier is "Contact Sales" — custom pricing, no public price, user fills out contact form

### Low credit & enforcement
- Low-credit warning triggers at 20% of monthly allotment remaining
- Warnings delivered via in-app banner/badge AND email notification
- Hard stop at zero credits — render API returns 402, no renders until credits refilled or plan upgraded
- Failed payment suspends rendering access immediately (no grace period)

### Billing dashboard
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

</decisions>

<specifics>
## Specific Ideas

- Enterprise is contact-sales, not self-serve — form submission rather than Stripe Checkout
- Stripe Customer Portal for invoice management (less to build, Stripe handles it)
- 402 status code for "out of credits" to differentiate from auth errors (401/403)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-billing-usage*
*Context gathered: 2026-02-09*
