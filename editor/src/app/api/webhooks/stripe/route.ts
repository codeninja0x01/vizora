import { type NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import {
  handleCheckoutComplete,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '@/lib/stripe-handlers';

export const dynamic = 'force-dynamic';

async function getOrganizationIdFromEvent(
  event: Stripe.Event
): Promise<string | null> {
  try {
    const eventType = event.type;
    const dataObject = event.data.object as any;

    // For checkout.session.completed: read from metadata
    if (eventType === 'checkout.session.completed') {
      const session = dataObject as Stripe.Checkout.Session;
      return session.metadata?.organizationId || null;
    }

    // For invoice events: look up organization by stripeCustomerId
    if (
      eventType === 'invoice.paid' ||
      eventType === 'invoice.payment_failed'
    ) {
      const invoice = dataObject as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

      if (!customerId) return null;

      const org = await prisma.organization.findUnique({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      });

      return org?.id || null;
    }

    // For subscription events: look up organization by stripeCustomerId
    if (
      eventType === 'customer.subscription.updated' ||
      eventType === 'customer.subscription.deleted'
    ) {
      const subscription = dataObject as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

      if (!customerId) return null;

      const org = await prisma.organization.findUnique({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      });

      return org?.id || null;
    }

    return null;
  } catch (error) {
    console.error('[Stripe Webhook] Error getting organization ID:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.error('[Stripe Webhook] Stripe not configured');
      return NextResponse.json(
        { error: 'Billing not configured' },
        { status: 503 }
      );
    }

    // Get webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 400 }
      );
    }

    // Read raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error(
        '[Stripe Webhook] Signature verification failed:',
        error.message
      );
      return NextResponse.json(
        { error: 'Webhook signature invalid' },
        { status: 400 }
      );
    }

    // Get organization ID from event
    const organizationId = await getOrganizationIdFromEvent(event);
    if (!organizationId) {
      console.warn(
        `[Stripe Webhook] Could not find organization for event ${event.id} (${event.type})`
      );
      // Return 200 to acknowledge receipt even if we can't process it
      return NextResponse.json({ received: true });
    }

    // Idempotency check
    const existingEvent = await prisma.subscriptionEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existingEvent?.processed) {
      console.log(
        `[Stripe Webhook] Event ${event.id} already processed, skipping`
      );
      return NextResponse.json({
        received: true,
        message: 'Event already processed',
      });
    }

    // Record the event immediately (before processing)
    await prisma.subscriptionEvent.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        organizationId,
        eventType: event.type,
        processed: false,
      },
      update: {
        processed: false,
      },
    });

    // Route to handler based on event type
    console.log(`[Stripe Webhook] Processing event ${event.id}: ${event.type}`);

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

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await prisma.subscriptionEvent.update({
      where: { stripeEventId: event.id },
      data: { processed: true },
    });

    console.log(`[Stripe Webhook] Event ${event.id} processed successfully`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
