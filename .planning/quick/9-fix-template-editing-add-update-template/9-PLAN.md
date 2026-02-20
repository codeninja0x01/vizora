---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/components/editor/template-mode/template-bar.tsx
  - editor/src/components/editor/timeline/timeline-studio-sync.tsx
autonomous: true
requirements: [QUICK-9]

must_haves:
  truths:
    - "Save Changes button is visible in the template bar during template mode"
    - "Clicking Save Changes exports project data and calls updateTemplate server action"
    - "Success and error toasts appear after save attempt"
    - "Timeline canvas renders clips immediately after template load (studio:restored event)"
  artifacts:
    - path: "editor/src/components/editor/template-mode/template-bar.tsx"
      provides: "Save Changes button with update logic"
    - path: "editor/src/components/editor/timeline/timeline-studio-sync.tsx"
      provides: "Immediate canvas refresh after studio:restored"
  key_links:
    - from: "template-bar.tsx"
      to: "updateTemplate server action"
      via: "direct import and call with templateId from useTemplateStore"
    - from: "timeline-studio-sync.tsx handleStudioRestored"
      to: "timelineCanvas.setTracks()"
      via: "useRef capturing current timelineCanvas prop"
---

<objective>
Fix two template editing bugs: add a Save Changes button to the template bar so users can persist edits to existing templates, and fix the timeline canvas not rendering clips after a template is loaded.

Purpose: Template editing is broken without a save mechanism, and clips are invisible after template load, making the feature unusable.
Output: Working save-to-template flow and reliable clip rendering on template restore.
</objective>

<execution_context>
@/home/solo/.claude/get-shit-done/workflows/execute-plan.md
@/home/solo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@editor/src/components/editor/template-mode/template-bar.tsx
@editor/src/components/editor/timeline/timeline-studio-sync.tsx
@editor/src/components/editor/save-template-dialog.tsx
@editor/src/app/(protected)/dashboard/templates/actions.ts
@editor/src/stores/template-store.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Save Changes button to TemplateBar</name>
  <files>editor/src/components/editor/template-mode/template-bar.tsx</files>
  <action>
Add a "Save Changes" button to the right side of the template bar, left of the Exit button.

Implementation steps:
1. Import `useState` from react, `useStudioStore` from `@/stores/studio-store`, `updateTemplate` from `@/app/(protected)/dashboard/templates/actions`, `extractMergeFields` from `@/lib/merge-fields`, `toast` from `sonner`, and `Save` icon from `lucide-react`.
2. In the component, destructure `templateId` and `markedFields` from `useTemplateStore()` (alongside existing `templateName`, `exitTemplateMode`).
3. Destructure `studio` from `useStudioStore()`.
4. Add `const [isSaving, setIsSaving] = useState(false)`.
5. Implement `handleSave`:
   - Guard: if `!studio || !templateId` return early
   - Set `isSaving(true)` in try block
   - `const projectData = studio.exportToJSON() as unknown as Record<string, unknown>`
   - Capture thumbnail: `const canvas = document.querySelector('canvas'); let thumbnailUrl = ''; if (canvas) { try { thumbnailUrl = canvas.toDataURL('image/png') } catch { /* ignore */ } }`
   - `const mergeFields = extractMergeFields(projectData, markedFields)`
   - `const result = await updateTemplate(templateId, { projectData, thumbnailUrl: thumbnailUrl || undefined, mergeFields })`
   - If `'error' in result`: `toast.error(result.error)` else `toast.success('Template saved')`
   - In catch: `toast.error('Failed to save template')`
   - In finally: `setIsSaving(false)`
6. Add button in JSX between the left info area and the Exit button:
   ```tsx
   <Button
     variant="ghost"
     size="sm"
     onClick={handleSave}
     disabled={isSaving}
     className="h-6 px-2 text-xs gap-1"
   >
     <Save className="size-3" />
     <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
   </Button>
   ```
   Wrap the right side buttons in a `flex items-center gap-1` div.

Do NOT add console.log statements. Use toast for all user feedback.
  </action>
  <verify>
Open the editor in template mode. Confirm the Save Changes button appears in the template bar. Click it and confirm a success toast appears. Check the network tab or Prisma logs to verify `updateTemplate` was called.
  </verify>
  <done>Save Changes button visible in template bar; clicking it saves template data and shows success/error toast.</done>
</task>

<task type="auto">
  <name>Task 2: Fix timeline canvas clips not rendering after template load</name>
  <files>editor/src/components/editor/timeline/timeline-studio-sync.tsx</files>
  <action>
The `handleStudioRestored` handler updates the zustand store but the React effect that calls `canvas.setTracks()` may not fire before the canvas renders, leaving the timeline blank.

Fix: Capture `timelineCanvas` in a ref so `handleStudioRestored` (inside the `studio` effect closure) can access the current prop value and call `setTracks()` immediately after updating the store.

Implementation steps:
1. Add `import { useEffect, useRef } from 'react'` (replace existing `useEffect` import).
2. After the hook destructures at the top of `TimelineStudioSync`, add:
   ```ts
   const timelineCanvasRef = useRef<TimelineCanvas | null | undefined>(null);
   ```
3. Add a `useEffect` that keeps the ref current whenever the prop changes (place it before the existing studio effect):
   ```ts
   useEffect(() => {
     timelineCanvasRef.current = timelineCanvas;
   }, [timelineCanvas]);
   ```
4. Inside the existing `handleStudioRestored` function (within the studio `useEffect`), after the `useTimelineStore.setState(...)` call on line ~307, add:
   ```ts
   // Force immediate canvas refresh so clips render without waiting for React effect
   if (timelineCanvasRef.current) {
     timelineCanvasRef.current.setTracks(tracks);
   }
   ```
   The `tracks` variable is already in scope from the handler's destructured argument.

Do NOT restructure any other handlers or effects. Make the minimal targeted change.
  </action>
  <verify>
Load a template in the editor (from the templates dashboard). Confirm that clips appear in the timeline immediately after the template loads, without requiring any interaction or page refresh.
  </verify>
  <done>Timeline clips are visible immediately after template load; the timeline canvas is not blank on studio:restored.</done>
</task>

</tasks>

<verification>
1. Start the dev server: `cd /home/solo/workspace/openvideo/editor && npm run dev`
2. Log in and navigate to `/dashboard/templates`
3. Open an existing template in the editor
4. Verify: clips appear in the timeline immediately (Bug 2 fixed)
5. Make a change (move a clip), click Save Changes in the template bar
6. Verify: success toast appears and the template is updated in the database (Bug 1 fixed)
7. Verify TypeScript: `cd /home/solo/workspace/openvideo/editor && npx tsc --noEmit`
</verification>

<success_criteria>
- Save Changes button visible in template bar when in template mode
- Clicking Save Changes persists projectData, thumbnail, and mergeFields via updateTemplate action
- Success toast on save, error toast on failure
- Timeline canvas shows clips immediately on template restore (no blank state)
- No TypeScript errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/9-fix-template-editing-add-update-template/9-SUMMARY.md` following the standard summary template.
</output>
