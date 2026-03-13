/**
 * TODO: Future considerations (not in scope for initial implementation)
 * - [ ] Separate credit pool for AI vs render
 * - [ ] Database-driven dynamic pricing table
 * - [ ] AI call refund mechanism (currently succeed-or-fail-fast)
 * - [ ] Changes to v1 API routes (already protected via withApiAuth)
 * - [ ] Changes to existing render credit flow
 * - [ ] New database tables (reuses existing CreditTransaction)
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  requireSession,
  requirePaidTier,
  resolveOrganization,
} from '@/lib/require-session';
import { withSessionRateLimit } from '@/lib/ratelimit';
import { deductCreditsForAI, type AIOperationType } from '@/lib/credits';

type AIAuthResult = {
  session: NonNullable<Awaited<ReturnType<typeof requireSession>>>;
  organizationId: string;
  tier: string;
};

export function withAIAuth(operationType: AIOperationType) {
  return async (req: NextRequest): Promise<AIAuthResult | Response> => {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tierResult = await requirePaidTier(session);
    if (tierResult.status === 'no_org') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (tierResult.status === 'free') {
      console.warn('[ai-auth] Free tier blocked', {
        userId: session.user.id,
        route: operationType,
      });
      return NextResponse.json(
        {
          error: 'ai_features_require_paid_plan',
          upgradeUrl: '/dashboard/billing',
        },
        { status: 403 }
      );
    }

    const rateLimitResult = await withSessionRateLimit(
      tierResult.organizationId,
      tierResult.tier
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
            ...rateLimitResult.headers,
          },
        }
      );
    }

    const creditResult = await deductCreditsForAI(
      tierResult.organizationId,
      operationType
    );
    if (!creditResult.success) {
      console.warn('[ai-auth] Insufficient credits', {
        organizationId: tierResult.organizationId,
        operationType,
        available: creditResult.available,
        required: creditResult.required,
      });
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          required: creditResult.required,
          available: creditResult.available,
        },
        { status: 402 }
      );
    }

    return {
      session,
      organizationId: tierResult.organizationId,
      tier: tierResult.tier,
    };
  };
}

export function withRateLimitedAuth() {
  return async (req: NextRequest): Promise<AIAuthResult | Response> => {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgContext = await resolveOrganization(session);
    if (!orgContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResult = await withSessionRateLimit(
      orgContext.organizationId,
      orgContext.tier
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
            ...rateLimitResult.headers,
          },
        }
      );
    }

    return {
      session,
      organizationId: orgContext.organizationId,
      tier: orgContext.tier,
    };
  };
}
