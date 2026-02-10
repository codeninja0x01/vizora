---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/components/editor/assistant/assistant.tsx
  - editor/src/components/editor/assistant/tools.ts
  - editor/src/genkit/tools.ts
  - editor/src/app/api/chat/editor/route.ts
  - editor/src/components/editor/media-panel/index.tsx
  - editor/src/components/editor/media-panel/store.ts
autonomous: true
must_haves:
  truths:
    - "Template style suggestions (minimal, bold, corporate, etc.) appear as clickable suggestions in the Coco AI assistant panel"
    - "User can ask Coco to generate a template via natural language (e.g. 'Generate a bold product launch template')"
    - "Generated template is applied to the canvas directly from the Coco assistant"
    - "The separate AI Generate tab in the left media panel is removed"
  artifacts:
    - path: "editor/src/components/editor/assistant/assistant.tsx"
      provides: "Template style suggestions in Coco assistant UI"
    - path: "editor/src/genkit/tools.ts"
      provides: "generate_template tool definition for Genkit chat flow"
    - path: "editor/src/components/editor/assistant/tools.ts"
      provides: "handleGenerateTemplate tool handler that calls /api/ai/template and applies result to canvas"
  key_links:
    - from: "editor/src/genkit/tools.ts"
      to: "editor/src/components/editor/assistant/tools.ts"
      via: "generate_template tool emitted as tool event, handled client-side"
      pattern: "generate_template"
    - from: "editor/src/components/editor/assistant/tools.ts"
      to: "/api/ai/template"
      via: "fetch POST to template generation API"
      pattern: "fetch.*api/ai/template"
---

<objective>
Refactor the AI template generator to integrate with the Coco AI assistant (right panel).

Purpose: Consolidate the template generation experience into the existing Coco AI chat assistant instead of having a separate panel in the left media sidebar. Users will be able to generate templates (minimal, bold, corporate, etc.) by chatting with Coco, and template style suggestions will appear as quick-action suggestions in the assistant.

Output: Template generation accessible through Coco AI assistant; "AI Generate" tab removed from left media panel.
</objective>

<context>
@.planning/STATE.md

Key files to understand:
- @editor/src/components/editor/assistant/assistant.tsx (Coco AI assistant UI - right panel)
- @editor/src/components/editor/assistant/tools.ts (Client-side tool handlers)
- @editor/src/genkit/tools.ts (Genkit tool definitions for chat flow)
- @editor/src/genkit/chat-flow.ts (Genkit chat flow with Gemini)
- @editor/src/components/editor/ai/template-chat.tsx (Current standalone template chat - to be removed from panel)
- @editor/src/components/editor/ai/template-style-picker.tsx (Style picker component)
- @editor/src/lib/ai/presets/template-style-presets.ts (12 style presets: minimal, bold, corporate, etc.)
- @editor/src/lib/ai/services/template-generation-service.ts (Anthropic-based template generation service)
- @editor/src/app/api/ai/template/route.ts (Template generation API endpoint)
- @editor/src/components/editor/media-panel/store.ts (Media panel tab store)
- @editor/src/components/editor/media-panel/index.tsx (Media panel with tab routing)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add generate_template tool to Genkit chat flow and client-side handler</name>
  <files>
    editor/src/genkit/tools.ts
    editor/src/components/editor/assistant/tools.ts
  </files>
  <action>
**In `editor/src/genkit/tools.ts`:**

Add a new `generate_template` tool to the Genkit tools list. This tool will be called by the Gemini model when the user asks to generate a video template.

```typescript
const generate_template = ai.defineTool(
  {
    name: 'generate_template',
    description: 'Generate a complete video template from a description and optional style. Use this when the user asks to create, generate, or make a video template. Available styles: minimal, bold, corporate, playful, cinematic, social, retro, neon, elegant, tech, nature, luxury.',
    inputSchema: z.object({
      prompt: z.string().describe('Description of the template to generate (e.g. "product launch video", "restaurant social media ad")'),
      styleId: z.string().default('corporate').describe('Style preset ID. One of: minimal, bold, corporate, playful, cinematic, social, retro, neon, elegant, tech, nature, luxury'),
    }),
    outputSchema: z.object({
      message: z.string(),
    }),
  },
  async ({ prompt, styleId }) => {
    return {
      message: `Generating ${styleId} template: "${prompt}"`,
    };
  }
);
```

Add `generate_template` to the `toolsCache` array at the end of `getTools()`, before `fallback`.

**In `editor/src/components/editor/assistant/tools.ts`:**

Add a new `handleGenerateTemplate` function that:

1. Receives `input` (with `prompt` and `styleId` from the tool call) and `studio` (Studio instance).
2. Calls `POST /api/ai/template` with `{ prompt, styleId }` (reusing the existing API endpoint).
3. On success, applies the generated template to the canvas:
   - Clear all existing clips by iterating `studio.clips.map(c => c.id)` and calling `studio.removeClipById(id)` for each.
   - Remove all tracks via `studio.getTracks()` and `studio.removeTrack(track.id)` for each.
   - Add tracks from `data.template.tracks` using `studio.addTrack({ id, name, type })`.
   - Add clips from `data.template.clips` using `jsonToClip(clipData)` (import from 'openvideo') then `studio.addClip(clip, { trackId })` where trackId is found by checking which track's `clipIds` contains the clip's id.
4. Returns void (no return needed, side effect is canvas update).

Import `jsonToClip` from 'openvideo' at the top of the file (it is already used in action-handlers.ts so the pattern exists).

This handler mirrors the `applyTemplateToCanvas` logic from `template-chat.tsx` but in the tool handler context.
  </action>
  <verify>
Run `cd /home/solo/workspace/openvideo && npx turbo build --filter=editor` to verify TypeScript compilation succeeds with no errors.
  </verify>
  <done>
`generate_template` tool exists in Genkit tools, `handleGenerateTemplate` handler exists in assistant tools, both compile without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire generate_template into Coco assistant UI, add template suggestions, and remove AI Generate tab</name>
  <files>
    editor/src/components/editor/assistant/assistant.tsx
    editor/src/components/editor/media-panel/index.tsx
    editor/src/components/editor/media-panel/store.ts
  </files>
  <action>
**In `editor/src/components/editor/assistant/assistant.tsx`:**

1. Add a `generate_template` case to the `handleToolAction` switch statement inside the `Assistant` component. It should call `ToolHandlers.handleGenerateTemplate(input, studio)`.

2. Update the `SUGGESTIONS` array to include template generation suggestions. Replace or augment the existing suggestions to include template styles. The new suggestions should be:

```typescript
const SUGGESTIONS: Suggestion[] = [
  { text: 'Generate a minimal product launch template' },
  { text: 'Generate a bold social media ad template' },
  { text: 'Generate a corporate presentation template' },
  { text: 'Search and add futurist city video' },
  { text: 'Generate voiceover "Welcome"' },
  { text: 'Auto-caption video' },
];
```

This puts the 3 most popular template styles as top suggestions. The user can also type any natural language request for other styles (playful, cinematic, neon, etc.) and the Gemini model will route to the `generate_template` tool.

**In `editor/src/components/editor/media-panel/store.ts`:**

Remove `'ai-generate'` from the `Tab` union type. Remove its entry from the `tabs` object. This removes the tab from the left sidebar activity bar.

**In `editor/src/components/editor/media-panel/index.tsx`:**

1. Remove the `import { TemplateChat } from '../ai/template-chat';` import.
2. Remove the `'ai-generate': <TemplateChat />,` entry from the `viewMap` object.

Note: Do NOT delete the `template-chat.tsx`, `template-style-picker.tsx`, `template-generation-store.ts`, or any other template files. They may still be used by the dashboard bulk-generate page or could be useful later. Only remove the references from the media panel.
  </action>
  <verify>
Run `cd /home/solo/workspace/openvideo && npx turbo build --filter=editor` to verify TypeScript compilation succeeds. Visually verify that the left sidebar no longer shows "AI Generate" tab, and that the Coco assistant (right panel) shows template suggestions.
  </verify>
  <done>
- The "AI Generate" tab is removed from the left media panel sidebar.
- Coco AI assistant shows template generation suggestions (minimal, bold, corporate).
- Clicking a suggestion or typing a template request routes through the `generate_template` tool, calls the existing `/api/ai/template` API, and applies the result to the canvas.
- All existing Coco assistant functionality (search media, voiceover, captions, clip editing) continues to work unchanged.
  </done>
</task>

</tasks>

<verification>
1. Build passes: `cd /home/solo/workspace/openvideo && npx turbo build --filter=editor`
2. Left sidebar: "AI Generate" tab no longer appears in activity bar
3. Coco assistant (right panel): Shows template generation suggestions
4. Template generation: Clicking "Generate a minimal product launch template" sends message to Coco, which calls generate_template tool, which calls /api/ai/template, which generates template and applies to canvas
5. Existing tools: All other Coco assistant tools (add_text, search_and_add_media, generate_voiceover, generate_captions, etc.) continue to function
</verification>

<success_criteria>
- Template generation is fully accessible through the Coco AI assistant
- "AI Generate" tab removed from left media panel
- Template style suggestions visible in Coco assistant
- Build compiles without errors
- No existing functionality broken
</success_criteria>

<output>
After completion, create `.planning/quick/1-refactor-ai-template-generator-to-integr/1-SUMMARY.md`
</output>
