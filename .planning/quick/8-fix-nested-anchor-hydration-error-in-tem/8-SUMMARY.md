---
phase: quick-8
plan: 1
subsystem: dashboard/templates
tags: [bugfix, hydration, next-js, navigation, template-card]
dependency_graph:
  requires: []
  provides: [TemplateCard without nested anchor tags]
  affects: [dashboard/templates page]
tech_stack:
  added: [useRouter from next/navigation]
  patterns: [programmatic navigation via router.push, stopPropagation for nested interactive elements]
key_files:
  created: []
  modified:
    - editor/src/app/(protected)/dashboard/templates/template-card.tsx
decisions:
  - Use div+useRouter instead of Link wrapper to avoid nested anchor hydration error
  - Change route from /?templateId= to /editor?templateId= (correct editor route post quick-7)
  - Use stopPropagation (not preventDefault) on action button area so click events are properly blocked from bubbling
metrics:
  duration: ~5 minutes
  completed: 2026-02-20
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-8 Plan 1: Fix Nested Anchor Hydration Error in TemplateCard Summary

**One-liner:** Replaced outer `<Link>` wrapper with `<div onClick={router.push}>` to eliminate nested `<a>` tags causing Next.js hydration errors.

## What Was Built

The TemplateCard component had a nested anchor issue: the outer `<Link>` wrapper and the inner `<Link>` for bulk-generate both rendered `<a>` tags, creating invalid HTML (`<a>` inside `<a>`) that caused Next.js hydration errors.

The fix replaces the outer `<Link>` with a plain `<div>` that uses `useRouter().push()` for programmatic navigation. The inner `<Link>` for bulk-generate navigation is unchanged and correct. The action button container's `onClick` handler was updated from `e.preventDefault()` to `e.stopPropagation()` so clicks on the delete and bulk-generate buttons don't bubble up to the card's `router.push`.

Additionally, the old route `/?templateId=` was corrected to `/editor?templateId=` to match the editor's new location (established in quick-7).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace outer Link with div + useRouter navigation | a66dc30 | editor/src/app/(protected)/dashboard/templates/template-card.tsx |

## Decisions Made

1. **div + useRouter over Link wrapper** — Next.js `<Link>` renders an `<a>` tag; nesting another `<Link>` inside it creates invalid HTML. Using a `<div>` with programmatic navigation via `router.push` is the canonical fix.

2. **stopPropagation not preventDefault** — With a div wrapper (not a Link), `preventDefault` has no effect on navigation. `stopPropagation` is the correct approach to prevent click events on action buttons from reaching the outer div's onClick handler.

3. **Route corrected to /editor** — The outer Link previously used `/?templateId=` which pointed to the old root route. This was corrected to `/editor?templateId=` to match the editor's current location.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `editor/src/app/(protected)/dashboard/templates/template-card.tsx` — FOUND
- [x] Commit a66dc30 — FOUND

## Self-Check: PASSED
