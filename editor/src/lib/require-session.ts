import { auth } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import type { ZodError } from 'zod';

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
