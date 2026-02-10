---
phase: quick-03
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/components/editor/assistant/assistant.tsx
autonomous: true
must_haves:
  truths:
    - "Clicking a style inserts text into the input field without submitting"
    - "User can edit the inserted text before sending"
    - "Popover closes after style selection"
    - "User must manually click Send to submit"
  artifacts:
    - path: "editor/src/components/editor/assistant/assistant.tsx"
      provides: "Updated handleStyleSelect that sets input instead of calling handleSubmit"
      contains: "setInput"
  key_links:
    - from: "handleStyleSelect"
      to: "setInput"
      via: "direct call setting input state"
      pattern: "setInput.*Generate a"
---

<objective>
Change the Styles popover behavior so clicking a style inserts the prompt text into the input field instead of auto-submitting it. This lets users add additional context before sending.

Purpose: Users should be able to customize the template generation prompt (e.g., "Generate a minimal template for a tech product launch") before submission.
Output: Updated assistant.tsx with insert-to-input behavior.
</objective>

<execution_context>
@/home/solo/.claude/get-shit-done/workflows/execute-plan.md
@/home/solo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@editor/src/components/editor/assistant/assistant.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Change handleStyleSelect to insert text into input field</name>
  <files>editor/src/components/editor/assistant/assistant.tsx</files>
  <action>
    In `editor/src/components/editor/assistant/assistant.tsx`, modify the `handleStyleSelect` function (line 255-258):

    **Current behavior (REMOVE):**
    ```typescript
    const handleStyleSelect = (_styleId: string, styleName: string) => {
      setStylesOpen(false);
      handleSubmit(`Generate a ${styleName.toLowerCase()} template`);
    };
    ```

    **New behavior (REPLACE WITH):**
    ```typescript
    const handleStyleSelect = (_styleId: string, styleName: string) => {
      setStylesOpen(false);
      setInput(`Generate a ${styleName.toLowerCase()} template`);
    };
    ```

    The only change is replacing `handleSubmit(...)` with `setInput(...)`. This inserts the text into the textarea so the user can review, edit, or append additional context before manually clicking Send.

    Also update the popover description text (line 480) from:
    ```
    Click a style to generate a template
    ```
    to:
    ```
    Click a style to prefill your prompt
    ```

    This accurately describes the new insert-to-input behavior rather than the old auto-submit behavior.
  </action>
  <verify>
    1. Run `cd /home/solo/workspace/openvideo/editor && npx tsc --noEmit` to verify no type errors
    2. Grep the file to confirm `handleStyleSelect` calls `setInput` (not `handleSubmit`)
    3. Grep the file to confirm the updated description text
  </verify>
  <done>
    - handleStyleSelect sets input state instead of calling handleSubmit
    - Popover closes on style selection (setStylesOpen(false) still present)
    - Description text updated to "Click a style to prefill your prompt"
    - No type errors
  </done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- handleStyleSelect uses setInput, not handleSubmit
- Popover description reflects new behavior
</verification>

<success_criteria>
Clicking a style in the Styles popover inserts the prompt text into the input field, closes the popover, and waits for the user to click Send. The user can edit the text before submission.
</success_criteria>

<output>
After completion, create `.planning/quick/3-update-styles-popover-to-insert-text-int/3-SUMMARY.md`
</output>
