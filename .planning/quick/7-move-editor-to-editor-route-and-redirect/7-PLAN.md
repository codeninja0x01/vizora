---
phase: quick-7
plan: 7
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/app/page.tsx
  - editor/src/app/editor/page.tsx (new)
autonomous: true
requirements: [QUICK-7]
must_haves:
  truths:
    - "Visiting / redirects to /dashboard"
    - "Visiting /editor loads the editor (auth required, redirects to /login if no session)"
  artifacts:
    - path: "editor/src/app/editor/page.tsx"
      provides: "Editor page at /editor with auth guard"
      contains: "redirect"
    - path: "editor/src/app/page.tsx"
      provides: "Root redirect to /dashboard"
      contains: "redirect('/dashboard')"
---

<objective>
Move the editor from / to /editor, and make / redirect to /dashboard.

Architecture:
- `app/editor/page.tsx` — new file, inherits `app/layout.tsx` only (no sidebar, full-screen). Server component with auth guard (same pattern as quick-6). Renders <Suspense><Editor /></Suspense>.
- `app/page.tsx` — replace contents with a simple redirect('/dashboard'). No auth needed since /dashboard will handle its own auth.

Why `app/editor/` and not `app/(protected)/editor/`:
The (protected) layout adds a dashboard sidebar + max-width container which breaks the full-screen editor. By placing the editor directly under `app/`, it inherits only the root layout (html/body/fonts) — no sidebar. Auth is handled inline in the page itself.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Create /editor page with auth guard</name>
  <files>editor/src/app/editor/page.tsx (new)</files>
  <action>
    Create `editor/src/app/editor/page.tsx` with this content:

    ```tsx
    import { auth } from '@/lib/auth';
    import { headers } from 'next/headers';
    import { redirect } from 'next/navigation';
    import { Suspense } from 'react';
    import Editor from '@/components/editor/editor';

    export default async function EditorPage() {
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
  </action>
  <verify>
    File exists at editor/src/app/editor/page.tsx and contains redirect('/login') and Editor import.
  </verify>
  <done>
    /editor loads the editor for authenticated users, redirects to /login otherwise.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace root page with redirect to /dashboard</name>
  <files>editor/src/app/page.tsx</files>
  <action>
    Replace the entire contents of `editor/src/app/page.tsx` with:

    ```tsx
    import { redirect } from 'next/navigation';

    export default function Page() {
      redirect('/dashboard');
    }
    ```
  </action>
  <verify>
    Run: `cd /home/solo/workspace/openvideo && npx tsc --noEmit -p editor/tsconfig.json 2>&1 | head -20`
    Expected: No TypeScript errors.
    Also: `grep "redirect" editor/src/app/page.tsx` shows redirect('/dashboard').
  </verify>
  <done>
    Visiting / redirects to /dashboard.
  </done>
</task>

</tasks>

<verification>
- `cat editor/src/app/page.tsx` shows only the redirect to /dashboard
- `cat editor/src/app/editor/page.tsx` shows auth guard + Editor render
- TypeScript check passes
</verification>

<success_criteria>
/ redirects to /dashboard. /editor loads the editor with auth protection.
</success_criteria>

<output>
After completion, create `.planning/quick/7-move-editor-to-editor-route-and-redirect/7-SUMMARY.md` with what was changed and the commit hash.
</output>
