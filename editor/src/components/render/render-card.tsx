'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { ProgressBar } from './progress-bar';
import { RenderStatusBadge } from './render-status-badge';
import { VideoPreview } from './video-preview';

interface RenderCardData {
  id: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  templateName: string;
  templateThumbnail?: string | null;
  createdAt: string; // ISO string
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  outputUrl?: string | null;
  errorCategory?: string | null;
  errorMessage?: string | null;
  resolution?: string | null;
  fileSize?: number | null;
  expiresAt?: string | null;
  deletionWarningShown?: boolean;
  // Live progress from SSE (passed as prop, updated by parent)
  liveProgress?: number | null;
}

interface RenderCardProps {
  render: RenderCardData;
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
 * Format duration between two timestamps
 * Returns "Xm Ys" format
 */
function formatDuration(start: string, end: string): string {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const minutes = Math.floor(diffSecs / 60);
  const seconds = diffSecs % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

/**
 * Format file size in bytes to human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Format expiry date to relative time (e.g., "in 23 days")
 */
function formatExpiryRelative(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return 'expired';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return `in ${diffDays} days`;
}

/**
 * Format ISO date string to full date/time
 */
function formatFullDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function RenderCard({ render }: RenderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-card/80">
      {/* Collapsed header - always visible */}
      <div
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Chevron icon */}
        {isExpanded ? (
          <ChevronDown className="size-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 flex-shrink-0 text-muted-foreground" />
        )}

        {/* Thumbnail */}
        <div className="size-20 flex-shrink-0 overflow-hidden rounded">
          {render.templateThumbnail ? (
            <img
              src={render.templateThumbnail}
              alt={render.templateName}
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
            {render.templateName}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <RenderStatusBadge status={render.status} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(render.createdAt)}
            </span>
          </div>
        </div>

        {/* Right side: duration and file size (completed only) */}
        {render.status === 'completed' &&
          render.startedAt &&
          render.completedAt && (
            <div className="flex-shrink-0 text-right text-xs text-muted-foreground">
              <div>{formatDuration(render.startedAt, render.completedAt)}</div>
              {render.fileSize && <div>{formatFileSize(render.fileSize)}</div>}
            </div>
          )}
      </div>

      {/* Progress bar for active renders - always visible when active */}
      {render.status === 'active' && (
        <div className="mt-3">
          <ProgressBar
            progress={render.liveProgress ?? 0}
            startedAt={new Date(render.startedAt || render.createdAt)}
          />
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 border-t border-border/50 pt-3">
          {/* Metadata grid */}
          <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Render ID:</span>{' '}
              <span className="text-foreground">{render.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Resolution:</span>{' '}
              <span className="text-foreground">
                {render.resolution || 'Default'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{' '}
              <span className="text-foreground">
                {formatFullDateTime(render.createdAt)}
              </span>
            </div>
            {render.startedAt && (
              <div>
                <span className="text-muted-foreground">Started:</span>{' '}
                <span className="text-foreground">
                  {formatFullDateTime(render.startedAt)}
                </span>
              </div>
            )}
            {render.completedAt && (
              <>
                <div>
                  <span className="text-muted-foreground">Completed:</span>{' '}
                  <span className="text-foreground">
                    {formatFullDateTime(render.completedAt)}
                  </span>
                </div>
                {render.startedAt && (
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{' '}
                    <span className="text-foreground">
                      {formatDuration(render.startedAt, render.completedAt)}
                    </span>
                  </div>
                )}
              </>
            )}
            {render.fileSize && (
              <div>
                <span className="text-muted-foreground">File size:</span>{' '}
                <span className="text-foreground">
                  {formatFileSize(render.fileSize)}
                </span>
              </div>
            )}
          </div>

          {/* Status-specific content */}
          {render.status === 'completed' && render.outputUrl && (
            <>
              <VideoPreview
                videoUrl={render.outputUrl}
                thumbnailUrl={render.templateThumbnail || undefined}
                fileName={`${render.templateName}.mp4`}
              />

              {/* Download button */}
              <div className="mt-3">
                <a
                  href={render.outputUrl}
                  download={`${render.templateName}.mp4`}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="size-4" />
                  Download
                </a>
              </div>

              {/* Expiry information */}
              {render.expiresAt && (
                <div className="mt-3">
                  {render.deletionWarningShown ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-400">
                      <AlertTriangle className="size-4 flex-shrink-0" />
                      <span>
                        Expires {formatExpiryRelative(render.expiresAt)} —
                        download before deletion
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Auto-deletes {formatExpiryRelative(render.expiresAt)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {render.status === 'failed' && render.errorMessage && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              {render.errorCategory && (
                <div className="mb-1 text-xs font-medium text-red-400">
                  {render.errorCategory}
                </div>
              )}
              <div className="text-sm text-red-300">{render.errorMessage}</div>
            </div>
          )}

          {render.status === 'queued' && (
            <div className="text-sm text-muted-foreground">
              Waiting in queue...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
