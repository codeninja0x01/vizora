# Phase 5: Render Progress & History - Research

**Researched:** 2026-02-09
**Domain:** Server-Sent Events (SSE), BullMQ Progress Tracking, Real-time UI Updates
**Confidence:** HIGH

## Summary

Phase 5 implements real-time render progress tracking via Server-Sent Events and a comprehensive render history dashboard. The technical foundation is well-established: BullMQ has built-in progress reporting (`job.updateProgress()` and `QueueEvents`), Next.js App Router natively supports SSE streaming via `ReadableStream`, and the existing stack already includes Sonner for toast notifications. The primary challenge is coordinating SSE connections across multiple concurrent renders while maintaining connection stability through reconnection logic and graceful error handling.

Existing patterns from Phase 3 (card grids, URL-based filters via `searchParams`) provide strong design precedents. The architecture should use QueueEvents for centralized progress monitoring (broadcasting to all SSE connections), nuqs for URL state persistence (filters/search), and native HTML5 video elements for render previews. Audio notifications can use simple `new Audio()` API for completion sounds.

**Primary recommendation:** Use BullMQ QueueEvents for centralized progress monitoring, Next.js App Router streaming responses for SSE, nuqs for URL state management, and extend the existing card grid pattern from templates/gallery pages for render history layout.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Progress Visualization**
- Progress bar with percentage text (e.g., 67%) — clean horizontal bar, no stage labels
- Elapsed time displayed alongside progress bar (e.g., "2m 14s") — no ETA estimation
- Progress updates streamed via Server-Sent Events from worker to client

**Render History Layout**
- Layout style at Claude's discretion (table or cards based on existing dashboard patterns)
- Rich preview per render entry: template thumbnail, template name, status badge, created timestamp, render duration, output resolution, and video file size when complete
- Completed renders show inline video player thumbnail (click to play) with download button
- Default page size: 20 renders with pagination to load more

**Filtering & Search**
- Tab-style status filters at top: All | Queued | Rendering | Completed | Failed — one active at a time
- Search bar searches across template name and render ID (paste ID to jump directly)
- Fixed sort order: newest first — no sortable columns
- Filter and search state persists in URL query params (shareable, bookmarkable, survives refresh)

**Completion Behavior**
- Toast notification with subtle completion sound when a render completes — visible on any page within the app
- Failed renders use same toast pattern with red styling: "Render failed — View details"
- Render list auto-updates in real-time via SSE — no manual refresh needed
- Nav badge on Renders item showing count of active renders (e.g., "Renders (2)") — always visible

**Inline Expandable Details**
- No dedicated render detail page — click to expand a render entry in-place
- Expanded view shows full details: progress (if active), error messages (if failed), output video player (if complete), metadata

### Claude's Discretion
- Table vs card layout choice for render history
- Multiple concurrent renders display pattern (all inline vs summary badge)
- Exact toast positioning and auto-dismiss timing
- Sound choice for completion notification
- SSE reconnection and error recovery strategy
- Expanded row/card content layout and spacing

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | Latest | Job progress tracking | Built-in progress reporting via `job.updateProgress()` and `QueueEvents` for centralized monitoring |
| Next.js App Router | 16.0.7 | SSE streaming | Native `ReadableStream` support for Server-Sent Events via Route Handlers |
| EventSource (native) | Browser API | SSE client | Native browser API with automatic reconnection, no dependencies needed |
| Sonner | 2.0.7 | Toast notifications | Already in project, supports success/error/custom toasts with styling |
| Prisma | 7.3.0 | Database queries | Already in project for render history queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | Latest | URL state management | Persist filters/search in query params, type-safe hooks for searchParams |
| date-fns or dayjs | Latest | Time formatting | Format "2m 14s" elapsed time, render duration display |
| HTML5 Video | Native | Video preview | Inline video player for completed renders, no library needed |
| Audio API | Native | Completion sound | Simple `new Audio().play()` for notification sounds |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EventSource | @microsoft/fetch-event-source | Adds retry logic and custom headers, but EventSource native reconnection is sufficient |
| BullMQ QueueEvents | Worker-level events | Worker events are local only, QueueEvents provides centralized monitoring needed for multi-client SSE |
| nuqs | Manual URLSearchParams | Manual approach works but loses type safety and React state sync |
| react-player | Native HTML5 video | react-player adds 50KB+ for features not needed, native `<video>` sufficient for simple playback |

**Installation:**
```bash
npm install nuqs date-fns
# BullMQ, Sonner, Prisma already installed
```

## Architecture Patterns

### Recommended Project Structure
```
editor/src/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── renders/
│   │           ├── [id]/
│   │           │   ├── route.ts           # GET single render
│   │           │   └── progress/
│   │           │       └── route.ts       # SSE progress stream endpoint
│   │           └── route.ts               # GET list renders
│   └── (protected)/
│       └── dashboard/
│           └── renders/
│               ├── page.tsx               # Render history dashboard
│               ├── render-card.tsx        # Individual render display
│               ├── render-filters.tsx     # Status tabs + search
│               └── actions.ts             # Server Actions for fetches
├── components/
│   └── render/
│       ├── progress-bar.tsx               # Progress bar component
│       ├── render-status-badge.tsx        # Status indicator
│       └── video-preview.tsx              # Video player thumbnail
├── hooks/
│   ├── use-render-progress.ts            # SSE connection hook
│   └── use-render-filters.ts             # nuqs wrapper for filters
└── lib/
    └── render-events.ts                   # BullMQ QueueEvents setup
```

### Pattern 1: BullMQ Progress Reporting (Worker Side)

**What:** Workers report progress percentage by calling `job.updateProgress(value)` during rendering
**When to use:** Inside render worker processor function, updated periodically during composition
**Example:**
```typescript
// Source: https://github.com/taskforcesh/bullmq (BullMQ official docs)
// packages/node/src/worker.ts or similar

import { Job } from 'bullmq';

async function processRenderJob(job: Job) {
  const { templateId, mergeData } = job.data;

  // Initialize renderer
  await job.updateProgress(10);

  // Load template and assets
  await job.updateProgress(25);

  // Render composition (incremental updates)
  for (let frame = 0; frame < totalFrames; frame++) {
    await renderFrame(frame);
    const progress = 25 + Math.floor((frame / totalFrames) * 65); // 25-90%
    await job.updateProgress(progress);
  }

  // Encode video
  await job.updateProgress(95);

  // Save output
  await job.updateProgress(100);

  return { outputPath: '/path/to/video.mp4' };
}
```

### Pattern 2: Centralized Progress Monitoring (Queue Side)

**What:** Use BullMQ QueueEvents to monitor all job events from a single location
**When to use:** In the main application process to broadcast progress to SSE clients
**Example:**
```typescript
// Source: https://github.com/taskforcesh/bullmq (BullMQ official docs)
// editor/src/lib/render-events.ts

import { QueueEvents } from 'bullmq';

// Singleton QueueEvents instance
let queueEvents: QueueEvents;

export function getQueueEvents() {
  if (!queueEvents) {
    queueEvents = new QueueEvents('renders', {
      connection: { /* Redis config */ }
    });

    queueEvents.on('progress', ({ jobId, data }) => {
      // Broadcast to all active SSE connections for this job
      broadcastProgress(jobId, data);
    });

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      broadcastCompletion(jobId, returnvalue);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      broadcastFailure(jobId, failedReason);
    });
  }

  return queueEvents;
}
```

### Pattern 3: SSE Streaming Endpoint (Next.js App Router)

**What:** Route Handler that streams progress updates via Server-Sent Events
**When to use:** API endpoint for clients to subscribe to render progress
**Example:**
```typescript
// Source: https://github.com/vercel/next.js (Next.js streaming docs)
// editor/src/app/api/v1/renders/[id]/progress/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const renderId = params.id;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Subscribe to progress events for this render
      const listener = (progress: number) => {
        const message = `data: ${JSON.stringify({ type: 'progress', progress })}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      subscribeToRender(renderId, listener);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribeFromRender(renderId, listener);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

### Pattern 4: SSE Client Hook (React)

**What:** Custom React hook that manages EventSource connection with reconnection
**When to use:** In components that need real-time render progress updates
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
// Combined with React hooks best practices
// editor/src/hooks/use-render-progress.ts

import { useEffect, useRef, useState } from 'react';

interface ProgressData {
  progress: number;
  status: 'queued' | 'active' | 'completed' | 'failed';
}

export function useRenderProgress(renderId: string) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    function connect() {
      if (eventSourceRef.current) return;

      const eventSource = new EventSource(
        `/api/v1/renders/${renderId}/progress`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'progress') {
          setData(message);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Exponential backoff reconnection
        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s

        if (attempt < 5) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      eventSourceRef.current = eventSource;
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [renderId]);

  return { data, isConnected };
}
```

### Pattern 5: URL State Persistence with nuqs

**What:** Type-safe URL query parameter state management for filters and search
**When to use:** Render history page with status filters and search box
**Example:**
```typescript
// Source: https://github.com/47ng/nuqs (nuqs documentation)
// editor/src/hooks/use-render-filters.ts

'use client';

import { useQueryStates, parseAsString } from 'nuqs';

export function useRenderFilters() {
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault('all'),
    search: parseAsString.withDefault(''),
  });

  return {
    status: filters.status,
    search: filters.search,
    setStatus: (status: string) => setFilters({ status }),
    setSearch: (search: string) => setFilters({ search }),
    clearFilters: () => setFilters({ status: 'all', search: '' }),
  };
}
```

### Pattern 6: Toast Notifications with Sound

**What:** Display completion/failure toasts with audio notification
**When to use:** When render completes or fails, visible from any page
**Example:**
```typescript
// Source: https://github.com/emilkowalski/sonner (Sonner documentation)
// Combined with Web Audio API for sound
// editor/src/components/render/completion-toast.tsx

import { toast } from 'sonner';

// Preload audio files
const successSound = new Audio('/sounds/render-complete.mp3');
const errorSound = new Audio('/sounds/render-failed.mp3');

export function showCompletionToast(renderName: string) {
  successSound.play().catch(() => {}); // Catch if autoplay blocked

  toast.success('Render complete', {
    description: renderName,
    action: {
      label: 'View',
      onClick: () => {
        window.location.href = '/dashboard/renders';
      },
    },
    duration: 5000,
  });
}

export function showFailureToast(renderName: string, error: string) {
  errorSound.play().catch(() => {});

  toast.error('Render failed', {
    description: renderName,
    action: {
      label: 'View details',
      onClick: () => {
        window.location.href = '/dashboard/renders';
      },
    },
    duration: 10000,
  });
}
```

### Pattern 7: Video Preview Component

**What:** Inline video player with thumbnail and download button
**When to use:** Display completed render video in render list
**Example:**
```typescript
// Native HTML5 video implementation
// editor/src/components/render/video-preview.tsx

interface VideoPreviewProps {
  videoUrl: string;
  thumbnailUrl?: string;
  fileName: string;
}

export function VideoPreview({ videoUrl, thumbnailUrl, fileName }: VideoPreviewProps) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-black/5">
      <video
        src={videoUrl}
        poster={thumbnailUrl}
        controls
        playsInline
        preload="metadata"
        className="w-full aspect-video"
      >
        Your browser does not support video playback.
      </video>
      <a
        href={videoUrl}
        download={fileName}
        className="absolute bottom-2 right-2 px-3 py-1 bg-background/90 rounded text-sm"
      >
        Download
      </a>
    </div>
  );
}
```

### Pattern 8: Pagination with Load More

**What:** Simple pagination that loads more renders on button click
**When to use:** Render history list with 20 items per page
**Example:**
```typescript
// editor/src/app/(protected)/dashboard/renders/page.tsx

interface RenderHistoryPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    cursor?: string; // Last render ID from previous page
  }>;
}

export default async function RenderHistoryPage({ searchParams }: RenderHistoryPageProps) {
  const params = await searchParams;
  const PAGE_SIZE = 20;

  const renders = await prisma.render.findMany({
    where: {
      status: params.status !== 'all' ? params.status : undefined,
      OR: params.search ? [
        { id: { contains: params.search } },
        { template: { name: { contains: params.search } } },
      ] : undefined,
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1, // Fetch one extra to know if there's more
    cursor: params.cursor ? { id: params.cursor } : undefined,
  });

  const hasMore = renders.length > PAGE_SIZE;
  const displayRenders = hasMore ? renders.slice(0, PAGE_SIZE) : renders;
  const nextCursor = hasMore ? displayRenders[displayRenders.length - 1].id : null;

  return (
    <div>
      {/* Render list */}
      {displayRenders.map(render => <RenderCard key={render.id} render={render} />)}

      {/* Load more button */}
      {hasMore && (
        <Link href={`/dashboard/renders?cursor=${nextCursor}&status=${params.status}&search=${params.search}`}>
          <Button>Load More</Button>
        </Link>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Polling instead of SSE:** Don't use `setInterval` to poll progress endpoints. SSE provides real-time updates with less overhead and automatic reconnection.

- **Worker-level event listeners:** Don't attach progress listeners directly to Worker instances. Workers may restart, and events are local. Use QueueEvents for centralized, reliable monitoring.

- **setState in EventSource callbacks:** Don't call `setState` for every SSE message without throttling. Batch updates or throttle to max 1 update per 100-200ms to avoid excessive re-renders.

- **Keeping SSE connections open forever:** Don't forget to close EventSource connections when components unmount or when render completes. Memory leaks and excessive connections will occur.

- **No reconnection logic:** Don't assume SSE connections stay open. Implement exponential backoff reconnection for production reliability.

- **Autoplay audio without user interaction:** Don't call `audio.play()` immediately on page load. Modern browsers block autoplay. User must interact with page first, or handle the promise rejection gracefully.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state sync | Manual URLSearchParams manipulation | nuqs library | Type safety, automatic React state sync, browser history handling, SSR support out of the box |
| SSE reconnection | Custom reconnection with timers | EventSource native (with exponential backoff wrapper) | Native API has built-in reconnection, just add backoff logic. Custom solutions miss edge cases (network changes, tab visibility) |
| Progress batching | Custom throttle/debounce for progress updates | lodash.throttle or built-in BullMQ rate limiting | Job progress can update hundreds of times per second during frame rendering. Use `_.throttle(updateProgress, 200)` or BullMQ's built-in rate limiting to avoid overwhelming SSE connections |
| Video thumbnails | Canvas-based thumbnail generation | Server-side FFmpeg thumbnail extraction | Browser-based thumbnail generation has codec issues, memory limits, and requires loading full video. FFmpeg can extract frame at specific timestamp efficiently during render |
| Time formatting | Custom time calculation and formatting | date-fns or dayjs | Edge cases in duration formatting (hours, days, localization). Libraries handle them all |

**Key insight:** SSE and real-time updates have many subtle edge cases (connection drops, tab backgrounding, page visibility API, browser throttling). Use established patterns and libraries rather than custom solutions. The "simple" approach of polling or custom WebSocket logic becomes complex quickly.

## Common Pitfalls

### Pitfall 1: SSE Connection Limits per Domain

**What goes wrong:** Browsers limit concurrent SSE connections per domain (typically 6 for HTTP/1.1). Opening multiple tabs or having many active renders causes connections to queue or fail.

**Why it happens:** Each render with active progress creates an SSE connection. With 10+ active renders across multiple tabs, connections are blocked waiting for others to close.

**How to avoid:**
- Multiplex: Create one SSE connection per page that subscribes to multiple render IDs via query params (`/api/renders/progress?ids=id1,id2,id3`)
- Use HTTP/2: Servers supporting HTTP/2 allow many more concurrent streams
- Close completed: Immediately close SSE connection when render reaches completed/failed state

**Warning signs:**
- Progress stops updating for some renders while others work
- Browser dev tools show pending SSE requests stuck in "pending" state
- Users report progress works in one tab but not others

### Pitfall 2: Memory Leaks from Unclosed EventSource

**What goes wrong:** EventSource connections remain open after component unmounts, causing memory leaks and accumulating open connections until browser tab crashes or slows down.

**Why it happens:** Forgetting to call `eventSource.close()` in React cleanup function, or closing in wrong condition (e.g., only when render completes, not on unmount).

**How to avoid:**
```typescript
useEffect(() => {
  const eventSource = new EventSource(url);
  // ... setup listeners

  return () => {
    eventSource.close(); // ALWAYS close in cleanup
  };
}, [url]);
```

**Warning signs:**
- Memory usage grows continuously as user navigates between pages
- Network tab shows many open SSE connections that should be closed
- Page becomes sluggish after viewing multiple renders

### Pitfall 3: Progress Updates Overwhelming Database

**What goes wrong:** Worker updates database on every `job.updateProgress()` call. At 60fps rendering, this creates 60 database writes per second, overwhelming database connection pool and causing slowdowns.

**Why it happens:** Trying to persist every progress update to database for "reliability" or to query progress from database instead of using SSE.

**How to avoid:**
- Only store progress in Redis (BullMQ does this automatically)
- Only write to database on state transitions (queued → active → completed)
- Use SSE for real-time progress, database for historical state only
- If progress persistence needed, batch updates (e.g., every 5% or every 5 seconds)

**Warning signs:**
- Database CPU spikes during active renders
- Connection pool exhaustion errors
- Progress updates start lagging or skipping
- Render performance degrades with multiple concurrent renders

### Pitfall 4: Toast Spam from Multiple SSE Listeners

**What goes wrong:** Multiple components subscribe to completion events, each triggering a toast notification, resulting in 3-5 duplicate toasts for one render completion.

**Why it happens:** Completion event broadcasted to all active QueueEvents listeners. If multiple components (nav badge, render list, dashboard) each subscribe, they all trigger toasts.

**How to avoid:**
- Single completion handler: Create one global QueueEvents listener that triggers toasts
- Toast deduplication: Check if toast with same ID already shown using Sonner's toast.dismiss() API
- Event bus pattern: Use global event emitter that deduplicates events before notifying listeners

**Warning signs:**
- Multiple identical toasts appear at same time
- Toast audio plays multiple times simultaneously
- Users complain about excessive notifications

### Pitfall 5: Stale Progress After Render Completion

**What goes wrong:** Render completes but progress bar still shows "87%" or remains in "rendering" state. Requires manual refresh to see completion.

**Why it happens:** SSE connection closes before final completion event arrives, or database update and SSE event arrive out of order due to race condition.

**How to avoid:**
- Send completion event before closing worker: Ensure `job.updateProgress(100)` and state transition both happen before worker closes
- Add completion polling fallback: If render status is "active" but SSE connection closed, poll once to fetch final state
- Optimistic UI update: When SSE sends completion event, immediately update local state even if database fetch hasn't returned yet

**Warning signs:**
- Progress bars stuck at high percentage (>90%) after render completes
- Users report needing to refresh to see completed renders
- Database shows completed but UI shows rendering

## Code Examples

Verified patterns from official sources:

### Elapsed Time Formatting

```typescript
// Using date-fns for clean duration formatting
import { intervalToDuration, formatDuration } from 'date-fns';

function formatElapsedTime(startTime: Date): string {
  const now = new Date();
  const duration = intervalToDuration({ start: startTime, end: now });

  // Format as "2m 14s" or "1h 5m 12s"
  return formatDuration(duration, {
    format: ['hours', 'minutes', 'seconds'],
    delimiter: ' ',
  });
}

// Or simple custom formatter
function formatElapsedSimple(startTime: Date): string {
  const elapsed = Date.now() - startTime.getTime();
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
```

### Progress Bar Component

```typescript
interface ProgressBarProps {
  progress: number; // 0-100
  elapsedTime: string; // "2m 14s"
  status: 'queued' | 'active' | 'completed' | 'failed';
}

export function ProgressBar({ progress, elapsedTime, status }: ProgressBarProps) {
  if (status === 'completed') {
    return <div className="text-sm text-green-600">Completed</div>;
  }

  if (status === 'failed') {
    return <div className="text-sm text-red-600">Failed</div>;
  }

  if (status === 'queued') {
    return <div className="text-sm text-muted-foreground">Queued</div>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{progress}%</span>
        <span className="text-muted-foreground">{elapsedTime}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

### Nav Badge for Active Renders

```typescript
// editor/src/components/nav-badge.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function NavBadge() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    // Subscribe to global render events
    const eventSource = new EventSource('/api/v1/renders/active-count');

    eventSource.onmessage = (event) => {
      const { count } = JSON.parse(event.data);
      setActiveCount(count);
    };

    return () => eventSource.close();
  }, []);

  return (
    <Link
      href="/dashboard/renders"
      className="text-sm text-muted-foreground hover:text-foreground transition-colors relative"
    >
      Renders
      {activeCount > 0 && (
        <span className="ml-1 text-xs">({activeCount})</span>
      )}
    </Link>
  );
}
```

### Render Card Component (Collapsible)

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { RenderStatusBadge } from './render-status-badge';
import { ProgressBar } from './progress-bar';
import { VideoPreview } from './video-preview';
import { useRenderProgress } from '@/hooks/use-render-progress';

interface RenderCardProps {
  render: {
    id: string;
    status: 'queued' | 'active' | 'completed' | 'failed';
    templateName: string;
    templateThumbnail: string;
    createdAt: Date;
    completedAt?: Date;
    videoUrl?: string;
    errorMessage?: string;
    resolution: string;
    fileSize?: number;
  };
}

export function RenderCard({ render }: RenderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: progress } = useRenderProgress(render.id);

  const isActive = render.status === 'active';
  const currentProgress = isActive && progress ? progress.progress : 100;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Card header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 text-left"
      >
        {isExpanded ? <ChevronDown className="size-5 mt-1 flex-shrink-0" /> : <ChevronRight className="size-5 mt-1 flex-shrink-0" />}

        <img
          src={render.templateThumbnail}
          alt={render.templateName}
          className="w-20 h-12 object-cover rounded flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{render.templateName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <RenderStatusBadge status={render.status} />
            <span className="text-xs text-muted-foreground">
              {new Date(render.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </button>

      {/* Progress bar for active renders */}
      {isActive && (
        <ProgressBar
          progress={currentProgress}
          elapsedTime={formatElapsedTime(render.createdAt)}
          status={render.status}
        />
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="pt-3 border-t space-y-3">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Resolution:</span> {render.resolution}
            </div>
            {render.fileSize && (
              <div>
                <span className="text-muted-foreground">Size:</span> {formatFileSize(render.fileSize)}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created:</span> {new Date(render.createdAt).toLocaleString()}
            </div>
            {render.completedAt && (
              <div>
                <span className="text-muted-foreground">Completed:</span> {new Date(render.completedAt).toLocaleString()}
              </div>
            )}
          </div>

          {/* Video preview for completed */}
          {render.status === 'completed' && render.videoUrl && (
            <VideoPreview
              videoUrl={render.videoUrl}
              thumbnailUrl={render.templateThumbnail}
              fileName={`${render.templateName}.mp4`}
            />
          )}

          {/* Error message for failed */}
          {render.status === 'failed' && render.errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {render.errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatElapsedTime(startTime: Date): string {
  const elapsed = Date.now() - startTime.getTime();
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Long polling for progress | Server-Sent Events (SSE) | ~2015 | Native browser API with automatic reconnection, lower latency, less server load |
| Manual URLSearchParams | Type-safe libraries (nuqs) | ~2023 | Type safety, automatic state sync, SSR support |
| Custom toast libraries | Radix UI + Sonner | ~2024 | Accessible, unstyled primitives with great DX |
| react-player for all video | Native HTML5 video | 2025-2026 | Smaller bundle, sufficient for simple playback, better mobile support |
| WebSocket for all real-time | SSE for one-way updates, WebSocket for bidirectional | ~2020 | Simpler protocol, automatic reconnection, better for one-way data streams |

**Deprecated/outdated:**
- Socket.io for progress updates: Heavyweight for one-way communication. SSE is lighter and standard.
- ioredis pub/sub for SSE: BullMQ QueueEvents already provides event system. Don't add second layer.
- Custom pagination components: Radix UI Pagination primitives + simple Link navigation is cleaner.
- Third-party URL state libraries: nuqs is now standard for Next.js, official-quality DX.

## Open Questions

1. **Multiple concurrent renders display strategy**
   - What we know: User can have multiple active renders, each needs progress display
   - What's unclear: Show all inline (could be 10+ progress bars), or collapse to summary badge ("3 renders in progress") with expandable detail modal?
   - Recommendation: Start with all inline (up to 5 active), then collapse to summary badge if >5. Match existing UI patterns from template cards.

2. **SSE connection multiplexing approach**
   - What we know: Browser limits ~6 concurrent SSE connections per domain
   - What's unclear: Single connection for all renders vs one per render? Server-side architecture implications?
   - Recommendation: Start simple with one connection per render, add multiplexing if users hit connection limits in testing. Monitor browser connection count in production.

3. **Sound asset licensing**
   - What we know: Need subtle completion sound for toast notification
   - What's unclear: Use free sound library, generate programmatically, or purchase licensed?
   - Recommendation: Start with free sound from Zapsplat or Freesound (CC0 license), ensure it's subtle (< 0.5s, quiet). User should hear "ding" not "FANFARE!".

## Sources

### Primary (HIGH confidence)
- `/taskforcesh/bullmq` (Context7) - BullMQ progress reporting, QueueEvents, worker patterns
- `/vercel/next.js` (Context7) - Next.js App Router SSE streaming, Route Handlers
- `/emilkowalski/sonner` (Context7) - Toast notification API and styling
- `/47ng/nuqs` (Context7) - URL state management hooks
- [BullMQ Official Documentation](https://docs.bullmq.io/guide/events) - Job events and listeners patterns
- [MDN Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) - EventSource API and reconnection patterns

### Secondary (MEDIUM confidence)
- [OneUptime SSE Guide (Jan 2026)](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view) - Recent React SSE patterns
- [OneUptime BullMQ Events Guide (Jan 2026)](https://oneuptime.com/blog/post/2026-01-21-bullmq-job-events-listeners/view) - BullMQ event best practices
- [Understanding Offset and Cursor Pagination (Jan 2026)](https://medium.com/@siddhantshelake/understanding-offset-and-cursor-pagination-8c5c53b1ad16) - Pagination strategy comparison

### Tertiary (LOW confidence)
- Various blog posts and tutorials on SSE, video preview, audio notifications - used for pattern validation only, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified from Context7 or existing package.json, versions confirmed
- Architecture: HIGH - BullMQ and Next.js patterns from official docs, SSE from MDN, existing codebase patterns observed
- Pitfalls: MEDIUM - Based on documented issues and common patterns, but specific edge cases may emerge in implementation

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable domain with well-established patterns)
