---
phase: quick-5
plan: 5
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/components/editor/header.tsx
autonomous: true
requirements: [QUICK-5]
must_haves:
  truths:
    - "Discord button is no longer visible in the editor header"
    - "Share button is replaced by a Dashboard button"
    - "Clicking Dashboard navigates to /dashboard"
  artifacts:
    - path: "editor/src/components/editor/header.tsx"
      provides: "Updated header without Discord, with Dashboard link"
      contains: "Dashboard"
  key_links:
    - from: "editor/src/components/editor/header.tsx"
      to: "/dashboard"
      via: "Link href"
      pattern: "href.*dashboard"
---

<objective>
Remove the Discord share button from the editor header and replace the non-functional Share button with a Dashboard navigation button.

Purpose: Clean up the editor header to present a professional SaaS interface — no social links, and a clear path back to the user's dashboard.
Output: Updated header.tsx with Discord removed and a Dashboard Link button added.
</objective>

<execution_context>
@/home/solo/.claude/get-shit-done/workflows/execute-plan.md
@/home/solo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@editor/src/components/editor/header.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Discord button and replace Share with Dashboard navigation</name>
  <files>editor/src/components/editor/header.tsx</files>
  <action>
    Make two targeted edits to editor/src/components/editor/header.tsx:

    1. DELETE the Discord Link block (lines 253-257):
       ```tsx
       <Link href="https://discord.gg/SCfMrQx8kr" target="_blank">
         <Button className="size-8" variant="ghost" size="icon">
           <LogoIcons.discord className="size-4" />
         </Button>
       </Link>
       ```

    2. REPLACE the non-functional Share button (lines 297-300) with a Dashboard Link:
       ```tsx
       <Button variant="outline" className="h-8 px-3 rounded-lg gap-1.5">
         <Share2 className="size-4" />
         <span className="hidden md:block">Share</span>
       </Button>
       ```
       Replace with:
       ```tsx
       <Link href="/dashboard">
         <Button variant="outline" className="h-8 px-3 rounded-lg gap-1.5">
           <Layout className="size-4" />
           <span className="hidden md:block">Dashboard</span>
         </Button>
       </Link>
       ```
       Note: `Layout` icon is already imported from lucide-react (line 18). `Link` is already imported from next/link (line 10). `Share2` import can be removed from the lucide-react import if it is no longer used elsewhere in the file — check before removing.

    3. After edits, verify `Share2` is not used anywhere else in the file. If unused, remove it from the lucide-react import destructure on line 13-19.
  </action>
  <verify>
    Run: `cd /home/solo/workspace/openvideo && npx tsc --noEmit -p editor/tsconfig.json 2>&1 | head -20`
    Expected: No TypeScript errors related to header.tsx.
    Also confirm: `grep -n "discord\|Share2\|share" editor/src/components/editor/header.tsx` shows no Discord link and no Share2 usage.
  </verify>
  <done>
    Header renders without Discord button. Share button is replaced by a Dashboard button that links to /dashboard. No TypeScript errors. Share2 import cleaned up if unused.
  </done>
</task>

</tasks>

<verification>
- `grep -n "discord" editor/src/components/editor/header.tsx` returns nothing
- `grep -n "dashboard" editor/src/components/editor/header.tsx` returns the Link href="/dashboard"
- TypeScript check passes with no errors in header.tsx
</verification>

<success_criteria>
Editor header no longer shows Discord button. The Share button is replaced by a Dashboard button. Clicking Dashboard navigates to /dashboard. No build errors.
</success_criteria>

<output>
After completion, create `.planning/quick/5-professional-editor-integration-remove-d/5-SUMMARY.md` with what was changed and the commit hash.
</output>
