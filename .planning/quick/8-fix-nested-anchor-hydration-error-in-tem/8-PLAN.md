---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/app/(protected)/dashboard/templates/template-card.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "TemplateCard renders without nested anchor hydration error"
    - "Clicking the card body navigates to /editor?templateId={id}"
    - "Clicking the bulk-generate button navigates to /dashboard/bulk-generate?templateId={id}"
    - "Clicking the delete button does not trigger card navigation"
  artifacts:
    - path: "editor/src/app/(protected)/dashboard/templates/template-card.tsx"
      provides: "TemplateCard with no nested <a> tags"
  key_links:
    - from: "TemplateCard div wrapper"
      to: "/editor?templateId={id}"
      via: "useRouter().push on onClick"
      pattern: "router\\.push.*editor.*templateId"
---

<objective>
Fix the nested anchor hydration error in TemplateCard by replacing the outer Link wrapper with a div and useRouter for programmatic navigation.

Purpose: The outer `<Link>` wrapping the entire card and the inner `<Link>` for the bulk-generate button produce nested `<a>` tags — invalid HTML that causes a Next.js hydration error.

Output: Updated template-card.tsx with no nested anchors, correct navigation behavior preserved.
</objective>

<execution_context>
@/home/solo/.claude/get-shit-done/workflows/execute-plan.md
@/home/solo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@editor/src/app/(protected)/dashboard/templates/template-card.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace outer Link with div + useRouter navigation</name>
  <files>editor/src/app/(protected)/dashboard/templates/template-card.tsx</files>
  <action>
    Refactor TemplateCard to eliminate nested anchors:

    1. Remove the outer `<Link href={...}>` wrapper at line 43 and its closing tag at line 109.

    2. Replace it with a `<div>` that has:
       - `onClick` handler calling `router.push('/editor?templateId=${template.id}')`
       - `className="cursor-pointer"` added to the outer div (the Card already gets hover styles via group)
       - Keep all existing Card className attributes unchanged

    3. Add `useRouter` import from `'next/navigation'` and initialize `const router = useRouter()` inside the component.

    4. Remove the `Link` import from `'next/link'` only if no other Link usages remain. The inner `<Link href="/dashboard/bulk-generate?templateId=${template.id}">` at line 91 must remain unchanged — it is the correct inner navigation.

    5. Update the action button wrapper's onClick handler: the current `onClick={(e) => e.preventDefault()}` prevents the outer Link from firing. With a div wrapper, change this to `onClick={(e) => e.stopPropagation()}` so clicks on action buttons do not bubble up to the outer div's router.push.

    The editor route is `/editor` (not `/`). The outer link currently uses `/?templateId=` which was the old root — correct it to `/editor?templateId=` in the router.push call.

    Final structure (pseudocode):
    ```tsx
    <div onClick={() => router.push(`/editor?templateId=${template.id}`)} className="cursor-pointer">
      <Card className="group h-full ...">
        ...
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/bulk-generate?templateId=${template.id}`}>
            <Button ...>...</Button>
          </Link>
          <DeleteButton ... />
        </div>
        ...
      </Card>
    </div>
    ```
  </action>
  <verify>
    Run TypeScript check:
    ```bash
    cd /home/solo/workspace/openvideo/editor && npx tsc --noEmit 2>&1 | head -30
    ```
    Confirm no type errors in template-card.tsx.

    Also check no nested anchor in rendered HTML by searching for `<a` inside `<a`:
    ```bash
    grep -n "Link\|href" /home/solo/workspace/openvideo/editor/src/app/(protected)/dashboard/templates/template-card.tsx
    ```
    Expected: only the inner Link (bulk-generate) remains; no outer Link wrapping the Card.
  </verify>
  <done>
    - template-card.tsx has no outer Link component
    - useRouter().push navigates to /editor?templateId={id} on card click
    - Inner Link for bulk-generate is unchanged
    - Action button area uses stopPropagation (not preventDefault)
    - TypeScript check passes with no errors
  </done>
</task>

</tasks>

<verification>
```bash
cd /home/solo/workspace/openvideo/editor && npx tsc --noEmit 2>&1 | grep "template-card"
```
No errors. Confirm file structure: outer div with onClick, inner Link for bulk-generate only.
</verification>

<success_criteria>
- No nested `<a>` tags in TemplateCard output
- Card click navigates to /editor?templateId={id}
- Bulk-generate button navigates to /dashboard/bulk-generate?templateId={id}
- Delete button click does not trigger card navigation
- Zero TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/8-fix-nested-anchor-hydration-error-in-tem/8-SUMMARY.md`
</output>
