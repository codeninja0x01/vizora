'use client';

import { useEffect, useRef, useState } from 'react';

interface RenderEvent {
  type:
    | 'connected'
    | 'progress'
    | 'completed'
    | 'failed'
    | 'batch.progress'
    | 'batch.completed';
  renderId?: string;
  activeCount?: number;
  data?: {
    progress?: number;
    outputUrl?: string;
    errorCategory?: string;
    errorMessage?: string;
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

interface UseRenderEventsReturn {
  isConnected: boolean;
  activeCount: number;
  lastEvent: RenderEvent | null;
}

interface UseRenderEventsOptions {
  onEvent?: (event: RenderEvent) => void;
}

/**
 * Hook for consuming SSE render events from /api/v1/renders/events
 *
 * Manages EventSource connection with automatic reconnection on errors.
 * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
 * Stops after 10 failed reconnection attempts.
 */
export function useRenderEvents(
  options?: UseRenderEventsOptions
): UseRenderEventsReturn {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  // Store callback in a ref so it never needs to be an effect dependency.
  // This prevents reconnecting the SSE stream whenever the parent re-renders.
  const onEventRef = useRef(options?.onEvent);

  // Keep the ref current on every render without re-running the effect.
  onEventRef.current = options?.onEvent;

  const [isConnected, setIsConnected] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<RenderEvent | null>(null);

  useEffect(() => {
    const connect = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection
      const eventSource = new EventSource('/api/v1/renders/events');
      eventSourceRef.current = eventSource;

      // Connection opened successfully
      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect counter on success
      };

      // Message received
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RenderEvent;

          // Update state based on event type
          switch (parsed.type) {
            case 'connected':
              if (parsed.activeCount !== undefined) {
                setActiveCount(parsed.activeCount);
              }
              break;

            case 'progress':
              // Progress events don't change activeCount (already active)
              break;

            case 'completed':
            case 'failed':
              // Render finished, decrement active count
              setActiveCount((prev) => Math.max(0, prev - 1));
              break;
          }

          setLastEvent(parsed);

          // Call external event handler if provided
          if (onEventRef.current) {
            onEventRef.current(parsed);
          }
        } catch (error) {
          console.error('[useRenderEvents] Failed to parse event:', error);
        }
      };

      // Error or connection lost
      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Attempt reconnection with exponential backoff
        const maxAttempts = 10;
        if (reconnectAttemptsRef.current < maxAttempts) {
          const baseDelay = 1000; // 1 second
          const maxDelay = 30000; // 30 seconds
          const delay = Math.min(
            baseDelay * 2 ** reconnectAttemptsRef.current,
            maxDelay
          );

          reconnectAttemptsRef.current += 1;

          console.log(
            `[useRenderEvents] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxAttempts})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error(
            '[useRenderEvents] Max reconnection attempts reached. User must refresh.'
          );
        }
      };
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    activeCount,
    lastEvent,
  };
}
