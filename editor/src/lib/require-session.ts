import { auth } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import type { ZodError } from 'zod';
import { prisma } from '@/lib/db';

/**
 * Validates the session from the incoming request.
 * Returns the session if valid, or null if unauthenticated.
 *
 * Usage:
 *   const session = await requireSession(req);
 *   if (!session) return unauthorizedResponse();
 */
export async function requireSession(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return null;
  return session;
}

/** Returns a 401 Unauthorized JSON response. */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Returns a 400 Bad Request JSON response with Zod error details.
 * Follows the v1 API pattern using error.flatten().
 */
export function zodErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: 'Validation failed', issues: error.flatten() },
    { status: 400 }
  );
}

export type OrganizationContext = {
  organizationId: string;
  tier: string;
};

export async function resolveOrganization(session: {
  session: { activeOrganizationId?: string | null };
  user: { id: string };
}): Promise<OrganizationContext | null> {
  let orgId = session.session.activeOrganizationId;

  if (!orgId) {
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) return null;
    orgId = membership.organizationId;
  }

  const org = await prisma.organization.findFirst({
    where: { id: orgId },
    select: { id: true, tier: true },
  });

  if (!org) return null;
  return { organizationId: org.id, tier: org.tier };
}

export type PaidTierResult =
  | { status: 'paid'; organizationId: string; tier: string }
  | { status: 'free' }
  | { status: 'no_org' };

export async function requirePaidTier(session: {
  session: { activeOrganizationId?: string | null };
  user: { id: string };
}): Promise<PaidTierResult> {
  const org = await resolveOrganization(session);
  if (!org) return { status: 'no_org' };
  if (org.tier === 'free') return { status: 'free' };
  return { status: 'paid', organizationId: org.organizationId, tier: org.tier };
}
