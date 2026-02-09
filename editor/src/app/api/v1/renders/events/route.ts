import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  subscribeUser,
  unsubscribeUser,
  registerRender,
  type RenderEvent,
} from '@/lib/render-events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Required for streaming + Redis

/**
 * SSE endpoint for streaming render events to authenticated users.
 * EventSource automatically sends cookies for session authentication.
 */
export async function GET(request: Request) {
  // Authenticate via session cookie (EventSource sends cookies automatically)
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // Query user's currently active renders and register them
  const activeRenders = await prisma.render.findMany({
    where: {
      userId,
      status: { in: ['queued', 'active'] },
    },
    select: { id: true },
  });

  for (const render of activeRenders) {
    registerRender(render.id, userId);
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event with active render count
      const initEvent = JSON.stringify({
        type: 'connected',
        activeCount: activeRenders.length,
      });
      controller.enqueue(encoder.encode(`data: ${initEvent}\n\n`));

      // Subscribe to render events for this user
      const callback = (event: RenderEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Connection closed, will be cleaned up
        }
      };

      subscribeUser(userId, callback);

      // Heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribeUser(userId, callback);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
