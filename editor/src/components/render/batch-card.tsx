'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { retryFailedBatch } from '@/app/(protected)/dashboard/renders/actions';

type BatchStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partial_failure'
  | 'failed';

interface BatchCardData {
  id: string;
  type: 'batch';
  templateName: string;
  templateThumbnail?: string | null;
  totalCount: number;
  status: BatchStatus;
  createdAt: string;
  completedAt?: string | null;
  progress: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
  renders: Array<{
    id: string;
    status: 'queued' | 'active' | 'completed' | 'failed';
    batchIndex: number | null;
    outputUrl?: string | null;
    errorMessage?: string | null;
    completedAt?: string | null;
    failedAt?: string | null;
  }>;
}

interface BatchCardProps {
  batch: BatchCardData;
  onUpdate?: () => void;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: string): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get status badge styling
 */
function getStatusBadge(status: BatchStatus) {
  switch (status) {
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-400">
          <Clock className="size-3" />
          Queued
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
          <RefreshCw className="size-3 animate-spin" />
          Processing
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
          <CheckCircle2 className="size-3" />
          Completed
        </span>
      );
    case 'partial_failure':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
          <AlertTriangle className="size-3" />
          Partial
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
          <XCircle className="size-3" />
          Failed
        </span>
      );
  }
}

/**
 * Get render status icon
 */
function getRenderStatusIcon(
  status: 'queued' | 'active' | 'completed' | 'failed'
) {
  switch (status) {
    case 'queued':
      return <Clock className="size-3.5 text-gray-400" />;
    case 'active':
      return <RefreshCw className="size-3.5 animate-spin text-blue-400" />;
    case 'completed':
      return <CheckCircle2 className="size-3.5 text-green-400" />;
    case 'failed':
      return <XCircle className="size-3.5 text-red-400" />;
  }
}

export function BatchCard({ batch, onUpdate }: BatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const percentComplete =
    batch.totalCount > 0
      ? Math.round(
          ((batch.progress.completed + batch.progress.failed) /
            batch.totalCount) *
            100
        )
      : 0;

  const hasFailedRenders = batch.progress.failed > 0;
  const hasCompletedRenders = batch.progress.completed > 0;

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const result = await retryFailedBatch(batch.id);
      toast.success(
        `Retrying ${result.retriedCount} failed render${result.retriedCount === 1 ? '' : 's'}`,
        {
          duration: 3000,
        }
      );
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to retry renders', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4 transition-colors hover:bg-card/60">
      {/* Collapsed header - always visible */}
      <div className="flex items-center gap-3">
        {/* Expand/collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        {/* Thumbnail */}
        <div className="size-20 flex-shrink-0 overflow-hidden rounded">
          {batch.templateThumbnail ? (
            <img
              src={batch.templateThumbnail}
              alt={batch.templateName}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Layers className="size-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Name and metadata */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground">
            {batch.templateName}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Batch of {batch.totalCount} render
            {batch.totalCount === 1 ? '' : 's'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {getStatusBadge(batch.status)}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(batch.createdAt)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {hasFailedRenders && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryFailed}
              disabled={isRetrying}
              className="gap-2"
            >
              <RefreshCw
                className={`size-3.5 ${isRetrying ? 'animate-spin' : ''}`}
              />
              Retry {batch.progress.failed} Failed
            </Button>
          )}
          {hasCompletedRenders && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/api/v1/batches/${batch.id}/zip`}
                download
                className="gap-2"
              >
                <Download className="size-3.5" />
                Download All (ZIP)
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar - always visible */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{percentComplete}% complete</span>
          <span>
            {batch.progress.completed} completed, {batch.progress.failed} failed
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Expanded details - individual renders */}
      {isExpanded && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {batch.renders.map((render) => (
                <div
                  key={render.id}
                  className="flex items-center gap-3 rounded-lg border border-border/30 bg-white/[0.02] p-3 text-xs"
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {getRenderStatusIcon(render.status)}
                  </div>

                  {/* Row index badge */}
                  <div className="flex-shrink-0">
                    <span className="rounded bg-white/[0.05] px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      Row {render.batchIndex ?? '?'}
                    </span>
                  </div>

                  {/* Error message or status */}
                  <div className="min-w-0 flex-1">
                    {render.status === 'failed' && render.errorMessage ? (
                      <p className="truncate text-red-300">
                        {render.errorMessage}
                      </p>
                    ) : (
                      <p className="truncate text-muted-foreground">
                        {render.status === 'completed' && 'Completed'}
                        {render.status === 'active' && 'Processing...'}
                        {render.status === 'queued' && 'Queued'}
                      </p>
                    )}
                  </div>

                  {/* Download link for completed renders */}
                  {render.status === 'completed' && render.outputUrl && (
                    <div className="flex-shrink-0">
                      <a
                        href={render.outputUrl}
                        download
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors"
                      >
                        <Download className="size-3.5" />
                        Download
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
