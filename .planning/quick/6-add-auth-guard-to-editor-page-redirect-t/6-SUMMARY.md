---
phase: quick-6
plan: 6
subsystem: auth
tags: [auth, server-component, redirect, next.js]
dependency_graph:
  requires: []
  provides: [auth-guard-editor-root]
  affects: [editor/src/app/page.tsx]
tech_stack:
  added: []
  patterns: [server-component-auth-guard, next-headers-session]
key_files:
  created: []
  modified:
    - editor/src/app/page.tsx
decisions:
  - Convert editor root page from client to server component to enable server-side auth check
  - Use same auth.api.getSession pattern as protected layout for consistency
metrics:
  duration: ~2 minutes
  completed: 2026-02-20
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 6: Add Auth Guard to Editor Page (redirect to /login) Summary

**One-liner:** Server-side auth guard on editor root using auth.api.getSession with redirect to /login for unauthenticated users.

## What Was Done

Converted `editor/src/app/page.tsx` from an open `'use client'` component to an async server component with a proper authentication guard. The pattern mirrors exactly what `editor/src/app/(protected)/layout.tsx` uses.

## Changes

### editor/src/app/page.tsx

**Before:**
```tsx
'use client';
import { Suspense } from 'react';
import Editor from '@/components/editor/editor';

export default function Page() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
```

**After:**
```tsx
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import Editor from '@/components/editor/editor';

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
```

## Verification

- `grep -n "redirect" editor/src/app/page.tsx` — shows `redirect('/login')` on line 11
- `grep -n "use client" editor/src/app/page.tsx` — returns nothing (correct, it's a server component)
- TypeScript check: no errors in page.tsx

## Commit

- `0852d02`: feat(quick-6): add auth guard to editor root page

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- File exists: editor/src/app/page.tsx — FOUND
- Commit 0852d02 — FOUND
