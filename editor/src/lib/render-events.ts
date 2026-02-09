import { QueueEvents } from 'bullmq';
import Redis from 'ioredis';

/**
 * BullMQ QueueEvents singleton for centralized render queue event monitoring.
 * Routes events to per-user SSE connections.
 */

// Event type definitions
export interface RenderEvent {
  type:
    | 'progress'
    | 'completed'
    | 'failed'
    | 'batch.progress'
    | 'batch.completed';
  renderId: string;
  data: {
    progress?: number;
    outputUrl?: string;
    errorCategory?: string;
    errorMessage?: string;
    templateName?: string;
    // Batch-specific fields
    batchId?: string;
    batchProgress?: {
      total: number;
      queued: number;
      processing: number;
      completed: number;
      failed: number;
      percentComplete: number;
    };
  };
}

type EventCallback = (event: RenderEvent) => void;

// Module-level state
let queueEvents: QueueEvents | null = null;
const userListeners = new Map<string, Set<EventCallback>>();
const renderOwnerMap = new Map<string, string>(); // renderId -> userId
const renderBatchMap = new Map<string, string>(); // renderId -> batchId

// Singleton pattern with globalThis for HMR survival
const globalForQueueEvents = globalThis as unknown as {
  queueEvents: QueueEvents | undefined;
};

/**
 * Initialize QueueEvents singleton (idempotent).
 * Creates a separate Redis connection for QueueEvents as required by BullMQ.
 */
export function initQueueEvents(): QueueEvents {
  if (queueEvents) {
    return queueEvents;
  }

  if (globalForQueueEvents.queueEvents) {
    queueEvents = globalForQueueEvents.queueEvents;
    return queueEvents;
  }

  // BullMQ requires QueueEvents to have its own Redis connection
  const queueEventsConnection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  queueEvents = new QueueEvents('render-queue', {
    connection: queueEventsConnection,
  });

  // Progress event handler
  queueEvents.on(
    'progress',
    ({ jobId, data }: { jobId: string; data: any }) => {
      try {
        const userId = data.userId;
        if (!userId) {
          console.warn(
            `[QueueEvents] Progress event for ${jobId} missing userId`
          );
          return;
        }

        // Update renderOwnerMap for routing
        renderOwnerMap.set(jobId, userId);

        // Route to user's SSE connections
        const callbacks = userListeners.get(userId);
        if (callbacks && callbacks.size > 0) {
          const event: RenderEvent = {
            type: 'progress',
            renderId: jobId,
            data: { progress: data.percent },
          };
          callbacks.forEach((callback) => {
            try {
              callback(event);
            } catch (error) {
              console.error('[QueueEvents] Callback error:', error);
            }
          });
        }
      } catch (error) {
        console.error('[QueueEvents] Progress handler error:', error);
      }
    }
  );

  // Completed event handler
  queueEvents.on(
    'completed',
    async ({ jobId, returnvalue }: { jobId: string; returnvalue: any }) => {
      try {
        const parsed =
          typeof returnvalue === 'string'
            ? JSON.parse(returnvalue)
            : returnvalue;
        const userId = parsed.userId;

        if (!userId) {
          console.warn(
            `[QueueEvents] Completed event for ${jobId} missing userId`
          );
          return;
        }

        // Route to user's SSE connections
        const callbacks = userListeners.get(userId);
        if (callbacks && callbacks.size > 0) {
          const event: RenderEvent = {
            type: 'completed',
            renderId: jobId,
            data: { outputUrl: parsed.outputUrl },
          };
          callbacks.forEach((callback) => {
            try {
              callback(event);
            } catch (error) {
              console.error('[QueueEvents] Callback error:', error);
            }
          });
        }

        // Check for batch association and emit batch events
        const batchId = renderBatchMap.get(jobId);
        if (batchId) {
          try {
            // Dynamic import to avoid circular dependency issues
            const { getBatchProgress, updateBatchStatus } = await import(
              '@/lib/batch/tracker'
            );

            // Update batch status in database
            await updateBatchStatus(batchId);

            // Get updated progress
            const batchProgress = await getBatchProgress(batchId);

            // Emit batch progress event
            if (callbacks && callbacks.size > 0) {
              const batchProgressEvent: RenderEvent = {
                type: 'batch.progress',
                renderId: jobId,
                data: {
                  batchId,
                  batchProgress,
                },
              };
              callbacks.forEach((callback) => {
                try {
                  callback(batchProgressEvent);
                } catch (error) {
                  console.error(
                    '[QueueEvents] Batch progress callback error:',
                    error
                  );
                }
              });
            }

            // Check if batch is in terminal state
            const isTerminal =
              batchProgress.queued === 0 && batchProgress.processing === 0;

            if (isTerminal) {
              const batchCompletedEvent: RenderEvent = {
                type: 'batch.completed',
                renderId: jobId,
                data: {
                  batchId,
                  batchProgress,
                },
              };
              callbacks?.forEach((callback) => {
                try {
                  callback(batchCompletedEvent);
                } catch (error) {
                  console.error(
                    '[QueueEvents] Batch completed callback error:',
                    error
                  );
                }
              });
            }

            // Clean up renderBatchMap
            renderBatchMap.delete(jobId);
          } catch (error) {
            console.error('[QueueEvents] Batch event emission error:', error);
            // Don't let batch tracking failures break individual render events
          }
        }

        // Clean up renderOwnerMap
        renderOwnerMap.delete(jobId);
      } catch (error) {
        console.error('[QueueEvents] Completed handler error:', error);
      }
    }
  );

  // Failed event handler
  queueEvents.on(
    'failed',
    async ({
      jobId,
      failedReason,
    }: {
      jobId: string;
      failedReason: string;
    }) => {
      try {
        // Look up userId from renderOwnerMap (may not have prior progress events)
        const userId = renderOwnerMap.get(jobId);

        if (!userId) {
          console.warn(
            `[QueueEvents] Failed event for ${jobId} missing userId mapping`
          );
          return;
        }

        // Route to user's SSE connections
        const callbacks = userListeners.get(userId);
        if (callbacks && callbacks.size > 0) {
          const event: RenderEvent = {
            type: 'failed',
            renderId: jobId,
            data: { errorMessage: failedReason },
          };
          callbacks.forEach((callback) => {
            try {
              callback(event);
            } catch (error) {
              console.error('[QueueEvents] Callback error:', error);
            }
          });
        }

        // Check for batch association and emit batch events
        const batchId = renderBatchMap.get(jobId);
        if (batchId) {
          try {
            // Dynamic import to avoid circular dependency issues
            const { getBatchProgress, updateBatchStatus } = await import(
              '@/lib/batch/tracker'
            );

            // Update batch status in database
            await updateBatchStatus(batchId);

            // Get updated progress
            const batchProgress = await getBatchProgress(batchId);

            // Emit batch progress event
            if (callbacks && callbacks.size > 0) {
              const batchProgressEvent: RenderEvent = {
                type: 'batch.progress',
                renderId: jobId,
                data: {
                  batchId,
                  batchProgress,
                },
              };
              callbacks.forEach((callback) => {
                try {
                  callback(batchProgressEvent);
                } catch (error) {
                  console.error(
                    '[QueueEvents] Batch progress callback error:',
                    error
                  );
                }
              });
            }

            // Check if batch is in terminal state
            const isTerminal =
              batchProgress.queued === 0 && batchProgress.processing === 0;

            if (isTerminal) {
              const batchCompletedEvent: RenderEvent = {
                type: 'batch.completed',
                renderId: jobId,
                data: {
                  batchId,
                  batchProgress,
                },
              };
              callbacks?.forEach((callback) => {
                try {
                  callback(batchCompletedEvent);
                } catch (error) {
                  console.error(
                    '[QueueEvents] Batch completed callback error:',
                    error
                  );
                }
              });
            }

            // Clean up renderBatchMap
            renderBatchMap.delete(jobId);
          } catch (error) {
            console.error('[QueueEvents] Batch event emission error:', error);
            // Don't let batch tracking failures break individual render events
          }
        }

        // Clean up renderOwnerMap
        renderOwnerMap.delete(jobId);
      } catch (error) {
        console.error('[QueueEvents] Failed handler error:', error);
      }
    }
  );

  // Error handler - log but don't crash
  queueEvents.on('error', (error) => {
    console.error('[QueueEvents] Error:', error);
  });

  // Attach to globalThis in non-production to survive HMR
  if (process.env.NODE_ENV !== 'production') {
    globalForQueueEvents.queueEvents = queueEvents;
  }

  console.log('[QueueEvents] Singleton initialized and listening');

  return queueEvents;
}

/**
 * Pre-populate renderOwnerMap so failed events can be routed correctly.
 * Call this when creating a new render job.
 */
export function registerRender(renderId: string, userId: string): void {
  renderOwnerMap.set(renderId, userId);
}

/**
 * Register a render that belongs to a batch for batch event tracking.
 * Populates both renderOwnerMap and renderBatchMap.
 */
export function registerBatchRender(
  renderId: string,
  userId: string,
  batchId: string
): void {
  renderOwnerMap.set(renderId, userId);
  renderBatchMap.set(renderId, batchId);
}

/**
 * Subscribe to render events for a specific user.
 * Ensures QueueEvents singleton is running.
 */
export function subscribeUser(userId: string, callback: EventCallback): void {
  initQueueEvents(); // Ensure singleton is running

  if (!userListeners.has(userId)) {
    userListeners.set(userId, new Set());
  }

  userListeners.get(userId)!.add(callback);
  console.log(
    `[QueueEvents] User ${userId} subscribed (${userListeners.get(userId)!.size} connections)`
  );
}

/**
 * Unsubscribe from render events.
 * Cleans up empty user entries.
 */
export function unsubscribeUser(userId: string, callback: EventCallback): void {
  const callbacks = userListeners.get(userId);
  if (!callbacks) return;

  callbacks.delete(callback);

  if (callbacks.size === 0) {
    userListeners.delete(userId);
    console.log(
      `[QueueEvents] User ${userId} unsubscribed (no remaining connections)`
    );
  } else {
    console.log(
      `[QueueEvents] User ${userId} connection removed (${callbacks.size} remaining)`
    );
  }
}
