'use client';

import { useState, useEffect, useMemo } from 'react';
import { Video, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RenderCard } from '@/components/render/render-card';
import { useRenderEvents } from '@/hooks/use-render-events';
import { useRenderFilters } from '@/hooks/use-render-filters';
import { RenderFilters } from './render-filters';
import { getRenders } from './actions';

interface RenderListProps {
  initialRenders: Awaited<ReturnType<typeof getRenders>>;
}

/**
 * Client component managing real-time render list with SSE updates
 *
 * Features:
 * - Real-time SSE updates for progress, completion, and failure events
 * - Filter and search with URL state persistence
 * - Cursor-based pagination with "Load More" button
 * - Immutable state updates for live progress
 */
export function RenderList({ initialRenders }: RenderListProps) {
  const [renders, setRenders] = useState(initialRenders.items);
  const [hasMore, setHasMore] = useState(initialRenders.hasMore);
  const [nextCursor, setNextCursor] = useState(initialRenders.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const { status, search, setStatus, setSearch } = useRenderFilters();

  // Connect to SSE for real-time updates
  const { lastEvent } = useRenderEvents();

  // Handle SSE events
  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'progress':
        // Update render progress in place
        if (lastEvent.renderId && lastEvent.data?.progress !== undefined) {
          setRenders((prev) =>
            prev.map((r) =>
              r.id === lastEvent.renderId
                ? { ...r, liveProgress: lastEvent.data?.progress }
                : r
            )
          );
        }
        break;

      case 'completed':
        // Update render status to completed
        if (lastEvent.renderId) {
          setRenders((prev) =>
            prev.map((r) =>
              r.id === lastEvent.renderId
                ? {
                    ...r,
                    status: 'completed' as const,
                    completedAt: new Date().toISOString(),
                    outputUrl: lastEvent.data?.outputUrl ?? r.outputUrl,
                  }
                : r
            )
          );
        }
        break;

      case 'failed':
        // Update render status to failed
        if (lastEvent.renderId) {
          setRenders((prev) =>
            prev.map((r) =>
              r.id === lastEvent.renderId
                ? {
                    ...r,
                    status: 'failed' as const,
                    failedAt: new Date().toISOString(),
                    errorCategory:
                      lastEvent.data?.errorCategory ?? r.errorCategory,
                    errorMessage:
                      lastEvent.data?.errorMessage ?? r.errorMessage,
                  }
                : r
            )
          );
        }
        break;
    }
  }, [lastEvent]);

  // Refetch when filters change
  useEffect(() => {
    const refetch = async () => {
      setIsRefetching(true);
      try {
        const result = await getRenders({ status, search });
        setRenders(result.items);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      } catch (error) {
        console.error('[RenderList] Failed to refetch renders:', error);
      } finally {
        setIsRefetching(false);
      }
    };

    refetch();
  }, [status, search]);

  // Load more renders (pagination)
  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await getRenders({ status, search, cursor: nextCursor });
      setRenders((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('[RenderList] Failed to load more renders:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Count expiring renders (deletionWarningShown = true)
  const expiringCount = useMemo(() => {
    return renders.filter(
      (r) =>
        r.status === 'completed' &&
        r.deletionWarningShown &&
        r.expiresAt &&
        new Date(r.expiresAt) > new Date()
    ).length;
  }, [renders]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <RenderFilters
        status={status}
        search={search}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
      />

      {/* Expiry warning banner */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="size-5 flex-shrink-0 text-amber-400" />
          <p className="text-sm text-amber-400">
            <strong>{expiringCount}</strong> rendered video
            {expiringCount === 1 ? '' : 's'} expiring within 7 days — download
            before deletion
          </p>
        </div>
      )}

      {/* Render list or empty state */}
      {renders.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50">
            <Video className="size-7 text-muted-foreground/40" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No renders found</h2>
          <p className="text-muted-foreground">
            {search || status !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Queue a render from a template to see it here.'}
          </p>
        </div>
      ) : (
        <div className={`grid gap-4 ${isRefetching ? 'opacity-50' : ''}`}>
          {renders.map((render) => (
            <RenderCard key={render.id} render={render} />
          ))}
        </div>
      )}

      {/* Load More button */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
