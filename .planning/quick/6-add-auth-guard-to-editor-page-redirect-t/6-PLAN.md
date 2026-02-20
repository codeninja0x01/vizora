---
phase: quick-6
plan: 6
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/app/page.tsx
autonomous: true
requirements: [QUICK-6]
must_haves:
  truths:
    - "Unauthenticated users visiting / are redirected to /login"
    - "Authenticated users can access the editor at /"
  artifacts:
    - path: "editor/src/app/page.tsx"
      provides: "Server component with auth guard"
      contains: "redirect"
  key_links:
    - from: "editor/src/app/page.tsx"
      to: "/login"
      via: "redirect"
      pattern: "redirect.*login"
---

<objective>
Add an auth guard to the editor root page so unauthenticated users are redirected to /login.

The page at `/` is currently a `'use client'` component — no auth check, totally open.
The fix: convert it to a server component that calls `auth.api.getSession`, redirects to `/login`
if no session, then renders the `<Editor />` client component wrapped in `<Suspense>`.

This matches the exact pattern used in `editor/src/app/(protected)/layout.tsx`.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Convert editor page to server component with auth guard</name>
  <files>editor/src/app/page.tsx</files>
  <action>
    Replace the contents of `editor/src/app/page.tsx` with:

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

    Key points:
    - Remove `'use client'` directive — this becomes a server component
    - Import `auth` from `@/lib/auth` (same as protected layout)
    - Import `headers` from `next/headers` (same as protected layout)
    - Import `redirect` from `next/navigation` (same as protected layout)
    - Keep `Suspense` wrapper around `<Editor />` (already existed)
  </action>
  <verify>
    Run: `cd /home/solo/workspace/openvideo && npx tsc --noEmit -p editor/tsconfig.json 2>&1 | head -20`
    Expected: No TypeScript errors related to page.tsx.
  </verify>
  <done>
    page.tsx is a server component. Unauthenticated requests to / redirect to /login. Authenticated users see the editor.
  </done>
</task>

</tasks>

<verification>
- `grep -n "redirect" editor/src/app/page.tsx` shows redirect('/login')
- `grep -n "use client" editor/src/app/page.tsx` returns nothing
- TypeScript check passes
</verification>

<success_criteria>
Visiting / without a session redirects to /login. Authenticated users load the editor normally.
</success_criteria>

<output>
After completion, create `.planning/quick/6-add-auth-guard-to-editor-page-redirect-t/6-SUMMARY.md` with what was changed and the commit hash.
</output>
