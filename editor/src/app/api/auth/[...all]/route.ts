import { auth } from '../../../../lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Export Better Auth catch-all route handlers for Next.js
export const { GET, POST } = toNextJsHandler(auth);
