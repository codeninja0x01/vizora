'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface RenderEventContextValue {
  isConnected: boolean;
  activeCount: number;
}

const RenderEventContext = createContext<RenderEventContextValue>({
  isConnected: false,
  activeCount: 0,
});

export const useRenderEventContext = () => useContext(RenderEventContext);

interface RenderEventProviderProps {
  children: React.ReactNode;
}

function playCompletionSound() {
  try {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Subtle high-pitched ding
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.type = 'sine';

    // Quick fade in and out (0.15 seconds total)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      0.15,
      audioContext.currentTime + 0.01
    ); // Quiet
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Audio not available (autoplay policy, no audio device, etc.) — ignore silently
  }
}

export function RenderEventProvider({ children }: RenderEventProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const activeRenderIds = useRef(new Set<string>());
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelay = useRef(1000); // Start with 1 second
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let mounted = true;

    function connect() {
      if (!mounted) return;

      const eventSource = new EventSource('/api/v1/renders/events');
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', (event) => {
        if (!mounted) return;

        const data = JSON.parse(event.data);
        setIsConnected(true);
        setActiveCount(data.activeCount || 0);

        // Reset reconnect delay on successful connection
        reconnectDelay.current = 1000;
      });

      eventSource.addEventListener('progress', (event) => {
        if (!mounted) return;

        const data = JSON.parse(event.data);
        const renderId = data.renderId;

        // Track new active renders
        if (renderId && !activeRenderIds.current.has(renderId)) {
          activeRenderIds.current.add(renderId);
          setActiveCount((prev) => prev + 1);
        }
      });

      eventSource.addEventListener('completed', (event) => {
        if (!mounted) return;

        const data = JSON.parse(event.data);
        const renderId = data.renderId;

        // Remove from active set and decrement count
        if (renderId && activeRenderIds.current.has(renderId)) {
          activeRenderIds.current.delete(renderId);
          setActiveCount((prev) => Math.max(0, prev - 1));
        }

        // Play completion sound
        playCompletionSound();

        // Show success toast
        toast.success('Render complete', {
          id: `render-complete-${renderId}`,
          description: data.templateName || 'Your render is ready',
          action: {
            label: 'View',
            onClick: () => {
              window.location.href = '/dashboard/renders';
            },
          },
          duration: 5000,
        });
      });

      eventSource.addEventListener('failed', (event) => {
        if (!mounted) return;

        const data = JSON.parse(event.data);
        const renderId = data.renderId;

        // Remove from active set and decrement count
        if (renderId && activeRenderIds.current.has(renderId)) {
          activeRenderIds.current.delete(renderId);
          setActiveCount((prev) => Math.max(0, prev - 1));
        }

        // Show failure toast
        toast.error('Render failed', {
          id: `render-failed-${renderId}`,
          description: data.templateName || 'A render has failed',
          action: {
            label: 'View details',
            onClick: () => {
              window.location.href = '/dashboard/renders';
            },
          },
          duration: 10000, // Longer duration for errors
        });
      });

      eventSource.addEventListener('batch.progress', (_event) => {
        if (!mounted) return;

        // Don't show toast for batch progress updates (too noisy)
        // The render-list component will handle state updates via useRenderEvents
      });

      eventSource.addEventListener('batch.completed', (event) => {
        if (!mounted) return;

        const data = JSON.parse(event.data);
        const batchProgress = data.batchProgress;

        if (batchProgress) {
          const { completed, failed, total } = batchProgress;
          const batchId = data.batchId;

          if (failed === 0) {
            // All renders succeeded
            toast.success(
              `Batch complete: ${completed}/${total} renders finished`,
              {
                id: `batch-complete-${batchId}`,
                duration: 5000,
                action: {
                  label: 'View',
                  onClick: () => {
                    window.location.href = '/dashboard/renders';
                  },
                },
              }
            );
            playCompletionSound(); // Reuse existing Web Audio completion sound
          } else {
            // Some renders failed
            toast.error(
              `Batch finished: ${completed} completed, ${failed} failed out of ${total}`,
              {
                id: `batch-partial-${batchId}`,
                duration: 10000,
                action: {
                  label: 'View details',
                  onClick: () => {
                    window.location.href = '/dashboard/renders';
                  },
                },
              }
            );
          }
        }
      });

      eventSource.onerror = () => {
        if (!mounted) return;

        setIsConnected(false);
        eventSource.close();

        // Exponential backoff reconnection
        reconnectTimeout.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000); // Max 30s
          connect();
        }, reconnectDelay.current);
      };
    }

    connect();

    return () => {
      mounted = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, []);

  return (
    <RenderEventContext.Provider value={{ isConnected, activeCount }}>
      {children}
    </RenderEventContext.Provider>
  );
}
