export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Unauthenticated health check endpoint for uptime monitoring and load balancer probes.
 *
 * @example
 * curl http://localhost:3000/api/health
 * // -> 200 OK { "status": "ok", "timestamp": 1741699200000 }
 */
export async function GET() {
  return Response.json(
    {
      status: 'ok',
      timestamp: Date.now(),
    },
    { status: 200 }
  );
}
