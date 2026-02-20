---
phase: quick-9
plan: "01"
subsystem: editor/template-mode
tags: [template-editing, timeline, canvas, save]
dependency_graph:
  requires: []
  provides: [template-save-flow, timeline-immediate-render]
  affects: [editor/template-mode, editor/timeline]
tech_stack:
  added: []
  patterns: [useRef-for-closure-access, toast-feedback]
key_files:
  created: []
  modified:
    - editor/src/components/editor/template-mode/template-bar.tsx
    - editor/src/components/editor/timeline/timeline-studio-sync.tsx
decisions:
  - Save Changes exports projectData + thumbnail + mergeFields via updateTemplate server action
  - useRef pattern to give studio effect closure access to current timelineCanvas prop
metrics:
  duration: "1 minute"
  tasks_completed: 2
  files_modified: 2
  completed_date: "2026-02-20"
---

# Quick Task 9: Fix Template Editing - Add Update Template Summary

**One-liner:** Added Save Changes button to TemplateBar calling updateTemplate server action, and fixed blank timeline canvas after template load using useRef for immediate setTracks call.

## What Was Built

### Task 1: Save Changes button in TemplateBar (commit: 42b4044)

Added a "Save Changes" button to `TemplateBar` that persists template edits. The button:
- Exports current project data via `studio.exportToJSON()`
- Captures a canvas thumbnail via `canvas.toDataURL('image/png')`
- Extracts merge fields via `extractMergeFields(projectData, markedFields)`
- Calls the `updateTemplate` server action with all three
- Shows `toast.success('Template saved')` on success or `toast.error(...)` on failure
- Disables with "Saving..." text during the async operation

### Task 2: Fix timeline canvas clips not rendering after template load (commit: 68e2b99)

Fixed blank timeline after template restore. Root cause: `handleStudioRestored` updated the Zustand store, but the React effect that calls `timelineCanvas.setTracks()` ran asynchronously after rendering, leaving the canvas blank.

Fix: Added `useRef<TimelineCanvas>` that mirrors the `timelineCanvas` prop. A dedicated `useEffect` keeps it current. Inside `handleStudioRestored` (within the studio effect closure that can't directly see the latest prop value), the ref is used to call `timelineCanvasRef.current.setTracks(tracks)` immediately after the store update — forcing the canvas to render clips synchronously.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

### Files exist:
- editor/src/components/editor/template-mode/template-bar.tsx: FOUND
- editor/src/components/editor/timeline/timeline-studio-sync.tsx: FOUND
- .planning/quick/9-fix-template-editing-add-update-template/9-SUMMARY.md: FOUND

### Commits exist:
- 42b4044 feat(quick-9): add Save Changes button to TemplateBar
- 68e2b99 fix(quick-9): fix timeline canvas clips not rendering after template load

## Self-Check: PASSED
