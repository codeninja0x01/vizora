'use client';

import { useState, useEffect, useMemo } from 'react';
import { Video, AlertTriangle, Loader2 } from 'lucide-react';
import { RenderCard } from '@/components/render/render-card';
import { BatchCard } from '@/components/render/batch-card';
import { useRenderEvents } from '@/hooks/use-render-events';
import { useRenderFilters } from '@/hooks/use-render-filters';
import { RenderFilters } from './render-filters';
import { getRenders, getBatches } from './actions';

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
  const [batches, setBatches] = useState<
    Awaited<ReturnType<typeof getBatches>>
  >([]);
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

      case 'batch.progress':
        if (lastEvent.data?.batchId && lastEvent.data?.batchProgress) {
          setBatches((prev) =>
            prev.map((b) =>
              b.id === lastEvent.data?.batchId
                ? {
                    ...b,
                    progress: {
                      queued: lastEvent.data?.batchProgress?.queued ?? 0,
                      processing:
                        lastEvent.data?.batchProgress?.processing ?? 0,
                      completed: lastEvent.data?.batchProgress?.completed ?? 0,
                      failed: lastEvent.data?.batchProgress?.failed ?? 0,
                    },
                  }
                : b
            )
          );
        }
        break;

      case 'batch.completed':
        if (lastEvent.data?.batchId && lastEvent.data?.batchProgress) {
          setBatches((prev) =>
            prev.map((b) =>
              b.id === lastEvent.data?.batchId
                ? {
                    ...b,
                    status: (lastEvent.data?.batchProgress?.failed === 0
                      ? 'completed'
                      : lastEvent.data?.batchProgress?.completed === 0
                        ? 'failed'
                        : 'partial_failure') as any,
                    completedAt: new Date().toISOString(),
                    progress: {
                      queued: lastEvent.data?.batchProgress?.queued ?? 0,
                      processing:
                        lastEvent.data?.batchProgress?.processing ?? 0,
                      completed: lastEvent.data?.batchProgress?.completed ?? 0,
                      failed: lastEvent.data?.batchProgress?.failed ?? 0,
                    },
                  }
                : b
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
        const [rendersResult, batchesResult] = await Promise.all([
          getRenders({ status, search }),
          getBatches({ status }),
        ]);
        setRenders(rendersResult.items);
        setBatches(batchesResult);
        setHasMore(rendersResult.hasMore);
        setNextCursor(rendersResult.nextCursor);
      } catch (error) {
        console.error('[RenderList] Failed to refetch renders:', error);
      } finally {
        setIsRefetching(false);
      }
    };

    refetch();
  }, [status, search]);

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

  const standaloneRenders = useMemo(
    () => renders.filter((r) => !r.batchId),
    [renders]
  );

  const mergedItems = useMemo(() => {
    const items: Array<
      | { type: 'render'; data: (typeof renders)[0] }
      | { type: 'batch'; data: (typeof batches)[0] }
    > = [
      ...standaloneRenders.map((r) => ({ type: 'render' as const, data: r })),
      ...batches.map((b) => ({ type: 'batch' as const, data: b })),
    ];
    return items.sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() -
        new Date(a.data.createdAt).getTime()
    );
  }, [standaloneRenders, batches]);

  const expiringCount = useMemo(
    () =>
      standaloneRenders.filter(
        (r) =>
          r.status === 'completed' &&
          r.deletionWarningShown &&
          r.expiresAt &&
          new Date(r.expiresAt) > new Date()
      ).length,
    [standaloneRenders]
  );

  const handleBatchUpdate = () => {
    setIsRefetching(true);
    getBatches({ status })
      .then((result) => setBatches(result))
      .catch((error) =>
        console.error('[RenderList] Failed to refetch batches:', error)
      )
      .finally(() => setIsRefetching(false));
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <RenderFilters
        status={status}
        search={search}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
      />

      {/* Expiry warning */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-400/90">
            <strong className="font-semibold">{expiringCount}</strong> rendered
            video{expiringCount === 1 ? '' : 's'} expiring within 7 days —
            download before deletion
          </p>
        </div>
      )}

      {/* Render list or empty state */}
      {mergedItems.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-14 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <Video className="size-6 text-muted-foreground/30" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            No renders found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground/60">
            {search || status !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Queue a render from a template to see it here.'}
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-3 transition-opacity duration-150 ${isRefetching ? 'opacity-40' : 'opacity-100'}`}
        >
          {mergedItems.map((item) =>
            item.type === 'batch' ? (
              <BatchCard
                key={item.data.id}
                batch={item.data}
                onUpdate={handleBatchUpdate}
              />
            ) : (
              <RenderCard key={item.data.id} render={item.data} />
            )
          )}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground disabled:opacity-50"
          >
            {isLoadingMore && <Loader2 className="size-3.5 animate-spin" />}
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
