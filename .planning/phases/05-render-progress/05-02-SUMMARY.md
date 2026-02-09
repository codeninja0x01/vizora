---
phase: 05-render-progress
plan: 02
subsystem: render-ui
tags:
  - ui-components
  - react
  - client-components
  - render-progress
dependency_graph:
  requires:
    - lucide-react icons
    - tailwind css
    - shadcn/ui patterns
  provides:
    - ProgressBar component with live elapsed time
    - RenderStatusBadge with color-coded states
    - VideoPreview with HTML5 video and download
    - RenderCard composable container
  affects:
    - 05-03 (Render History Dashboard)
    - 05-04 (Notification System)
tech_stack:
  added: []
  patterns:
    - React hooks (useState, useEffect) for interactive state
    - Interval-based elapsed time calculation
    - Color-coded status indicators
    - HTML5 video with download link
    - Expandable/collapsible card pattern
key_files:
  created:
    - editor/src/components/render/progress-bar.tsx
    - editor/src/components/render/render-status-badge.tsx
    - editor/src/components/render/video-preview.tsx
    - editor/src/components/render/render-card.tsx
  modified: []
decisions:
  - Simple arithmetic elapsed time formatting (avoiding date-fns edge cases)
  - Pulsing dot indicator for active renders
  - HTML5 native video controls (no custom player needed)
  - Progress bar always visible for active renders (not just when expanded)
  - Inline expansion pattern (no dedicated detail page)
metrics:
  tasks_completed: 2
  duration: 138
  completed_at: "2026-02-09T14:15:49Z"
---

# Phase 05 Plan 02: Render UI Component Library Summary

**One-liner:** Progress bar with live elapsed time, color-coded status badges, HTML5 video player with download, and expandable render card composing all three.

## What Was Built

Created the render UI component library with four reusable React client components in `editor/src/components/render/`:

### 1. ProgressBar (`progress-bar.tsx`)
- **Props:** `progress` (0-100), `startedAt` (Date), `className`
- **Features:**
  - Displays percentage text (e.g., "67%") and live elapsed time (e.g., "2m 14s")
  - Updates elapsed time every second via `useEffect` interval
  - Horizontal bar with smooth width transition (300ms ease-out)
  - Elapsed time formatting: `< 60s` → "Xs", `1-59 min` → "Xm Ys", `60+ min` → "Xh Ym"
  - Simple arithmetic approach (avoiding date-fns dependency)
- **Usage:** Displayed in active render cards to show real-time progress

### 2. RenderStatusBadge (`render-status-badge.tsx`)
- **Props:** `status` ('queued' | 'active' | 'completed' | 'failed')
- **Features:**
  - Color-coded pill badges with status-specific colors:
    - Queued: yellow (`bg-yellow-500/10 text-yellow-500`)
    - Active: blue with pulsing dot (`bg-blue-500/10 text-blue-500`)
    - Completed: green (`bg-green-500/10 text-green-500`)
    - Failed: red (`bg-red-500/10 text-red-500`)
  - Pulsing 2px dot indicator for active status
- **Usage:** Status indicator in render card header

### 3. VideoPreview (`video-preview.tsx`)
- **Props:** `videoUrl`, `thumbnailUrl` (optional), `fileName`
- **Features:**
  - Native HTML5 `<video>` element with controls, playsInline, preload="metadata"
  - Poster thumbnail support via `poster` attribute
  - Download button (absolute positioned bottom-right):
    - Styled as backdrop-blur button with Download icon
    - Uses native `<a>` tag with `download` attribute
  - Fallback text for unsupported browsers
- **Usage:** Displayed in expanded render card for completed renders

### 4. RenderCard (`render-card.tsx`)
- **Props:** `render` (RenderCardData with 15+ fields)
- **Features:**
  - **Collapsed header (always visible):**
    - ChevronRight/Down toggle icon
    - Template thumbnail (80x48) or Layers icon placeholder
    - Template name, status badge, relative timestamp
    - Duration and file size (completed renders only)
  - **Progress bar for active renders:**
    - Always visible when status is 'active' (not just when expanded)
    - Updates from `liveProgress` prop (SSE-provided data)
  - **Expanded details (on click):**
    - Metadata grid: render ID, resolution, created/started/completed times, duration, file size
    - Status-specific content:
      - **Completed:** VideoPreview with video player and download
      - **Failed:** Error box with category badge and message (red theme)
      - **Queued:** "Waiting in queue..." message
  - **Helper functions:**
    - `formatRelativeTime`: "Xm ago", "Xh ago", "Xd ago" (same pattern as template-card)
    - `formatDuration`: "Xm Ys" format
    - `formatFileSize`: "XX.X MB" or "XX KB"
    - `formatFullDateTime`: Full locale-formatted date/time
- **Usage:** Main render display component for dashboard and notifications

## Deviations from Plan

None - plan executed exactly as written.

All components follow the specified patterns:
- Dark theme with muted-foreground and primary accent colors
- Tailwind utility classes matching existing design system
- Lucide React icons (ChevronRight, ChevronDown, Layers, Download)
- 'use client' directive for interactive features
- TypeScript interfaces for type safety

## Technical Implementation

### Progress Bar Elapsed Time Calculation

Used simple arithmetic instead of date-fns:

```typescript
const updateElapsed = () => {
  const now = new Date();
  const diffMs = now.getTime() - startedAt.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  setElapsedSeconds(diffSeconds);
};

// Update every second
const interval = setInterval(updateElapsed, 1000);
```

This avoids date-fns edge cases and reduces dependencies. Format function handles three time ranges (< 60s, 1-59 min, 60+ min).

### Status Badge Pulsing Indicator

Active renders show a pulsing 2px dot using Tailwind's `animate-pulse`:

```typescript
{config.showPulse && (
  <span className="size-2 animate-pulse rounded-full bg-current" />
)}
```

### Video Download Pattern

Native `<a>` tag with `download` attribute positioned absolutely:

```typescript
<a
  href={videoUrl}
  download={fileName}
  className="absolute bottom-2 right-2 ..."
>
  <Download className="size-4" />
  Download
</a>
```

This triggers browser download without custom logic.

### Render Card Expansion State

Simple `useState` toggle with conditional rendering:

```typescript
const [isExpanded, setIsExpanded] = useState(false);

// Header is clickable
<div onClick={() => setIsExpanded(!isExpanded)}>
  {isExpanded ? <ChevronDown /> : <ChevronRight />}
  ...
</div>

// Expanded content shown conditionally
{isExpanded && (
  <div className="mt-3 border-t border-border/50 pt-3">
    ...
  </div>
)}
```

## Verification Results

All verification criteria passed:

1. ✅ TypeScript compilation: `cd editor && npx tsc --noEmit --skipLibCheck` passes
2. ✅ ProgressBar accepts progress (number) and startedAt (Date) props
3. ✅ RenderStatusBadge renders four distinct states with different colors
4. ✅ VideoPreview renders native HTML5 video with download link
5. ✅ All components have 'use client' directive
6. ✅ RenderCard imports and uses all three child components
7. ✅ Card click toggles expansion (ChevronRight ↔ ChevronDown)
8. ✅ Active renders show progress bar even when collapsed
9. ✅ Expanded view shows status-appropriate content (video, error, or queued message)
10. ✅ Components follow existing design patterns (dark theme, muted-foreground, primary accent)
11. ✅ No external dependencies added (uses existing Lucide icons, Tailwind classes)

## Success Criteria Met

- ✅ Progress bar shows percentage text and live elapsed time
- ✅ Status badge has four distinct states with appropriate colors
- ✅ Video preview renders native HTML5 video with poster and download button
- ✅ Render card collapses/expands on click with smooth visual feedback
- ✅ Active renders always show progress bar (not just when expanded)
- ✅ Expanded view shows status-appropriate content (video, error, metadata)
- ✅ All components follow existing dark theme and design patterns

## Dependencies & Integration Points

**Upstream dependencies:**
- Lucide React icons (ChevronRight, ChevronDown, Layers, Download)
- Tailwind CSS for styling
- shadcn/ui card patterns (from template-card reference)

**Downstream consumers:**
- Plan 03 (Render History Dashboard) - will import RenderCard to display render list
- Plan 04 (Notification System) - will reference status badges and progress patterns

**Data contract (RenderCardData interface):**
```typescript
{
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
  liveProgress?: number | null; // From SSE
}
```

This maps to the Render model from Phase 4 with addition of `liveProgress` for real-time updates.

## Next Steps

**Immediate:**
- Plan 03 will create the render history dashboard using RenderCard
- Plan 04 will create the notification system referencing these patterns

**Future considerations:**
- Consider adding retry button to failed render cards (mentioned in phase 4 error handling)
- Consider adding cancel button for active renders (requires queue management API)
- Consider thumbnail generation for renders without template thumbnails

## Self-Check

Verifying all claims before state updates:

### Created Files
- ✅ FOUND: editor/src/components/render/progress-bar.tsx
- ✅ FOUND: editor/src/components/render/render-status-badge.tsx
- ✅ FOUND: editor/src/components/render/video-preview.tsx
- ✅ FOUND: editor/src/components/render/render-card.tsx

### Commits
- ✅ FOUND: 234e8ad - feat(05-02): create progress bar, status badge, and video preview components
- ✅ FOUND: 2ea0691 - feat(05-02): create collapsible render card with inline expandable details

## Self-Check: PASSED
