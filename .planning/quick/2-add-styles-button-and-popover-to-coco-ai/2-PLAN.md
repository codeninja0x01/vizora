---
phase: quick-02
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - editor/src/components/editor/assistant/assistant.tsx
autonomous: true
must_haves:
  truths:
    - "User sees a Styles button next to Suggestions button in assistant input area"
    - "Clicking Styles button opens a popover with all 12 template styles in a grid"
    - "Each style card shows name, color palette dots, and mood tag"
    - "Clicking a style closes the popover and immediately triggers template generation"
    - "Existing Suggestions button and chat functionality remain unchanged"
  artifacts:
    - path: "editor/src/components/editor/assistant/assistant.tsx"
      provides: "Styles button with popover and template generation trigger"
      contains: "Popover"
  key_links:
    - from: "assistant.tsx style click handler"
      to: "handleSubmit"
      via: "Generates message 'Generate a {styleName} template' and submits"
      pattern: "Generate a.*template"
---

<objective>
Add a "Styles" button to the Coco AI assistant input area that opens a popover displaying all 12 template style presets in a grid. Clicking a style directly triggers template generation by submitting a message like "Generate a minimal template" through the existing chat flow.

Purpose: Give users quick one-click access to template generation styles without typing, complementing the existing suggestion chips.
Output: Updated assistant.tsx with Styles popover button.
</objective>

<execution_context>
@/home/solo/.claude/get-shit-done/workflows/execute-plan.md
@/home/solo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@editor/src/components/editor/assistant/assistant.tsx
@editor/src/lib/ai/presets/template-style-presets.ts
@editor/src/components/ui/popover.tsx
@editor/src/components/ui/input-group.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Styles button with popover to assistant input area</name>
  <files>editor/src/components/editor/assistant/assistant.tsx</files>
  <action>
    Modify the assistant component to add a Styles button with popover:

    1. Add imports:
       - `Palette` from `lucide-react` (for the Styles button icon)
       - `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover`
       - `TEMPLATE_STYLE_PRESETS` from `@/lib/ai/presets/template-style-presets`
       - `ScrollArea` is already imported

    2. Add state for popover open/close:
       - `const [stylesOpen, setStylesOpen] = useState(false);`

    3. Add a style selection handler function:
       ```
       const handleStyleSelect = (styleId: string, styleName: string) => {
         setStylesOpen(false);
         handleSubmit(`Generate a ${styleName.toLowerCase()} template`);
       };
       ```

    4. In the InputGroupAddon (align="block-end") section, add a Popover wrapping a new Styles button BETWEEN the existing Suggestions button and the Send button:
       ```tsx
       <Popover open={stylesOpen} onOpenChange={setStylesOpen}>
         <PopoverTrigger asChild>
           <InputGroupButton
             variant="ghost"
             className="rounded-lg"
             disabled={isLoading}
           >
             <Palette className="w-4 h-4" />
             <span className="ml-1 text-xs">Styles</span>
           </InputGroupButton>
         </PopoverTrigger>
         <PopoverContent
           side="top"
           align="start"
           className="w-[420px] p-0"
         >
           <div className="p-3 border-b">
             <h3 className="font-semibold text-sm">Template Styles</h3>
             <p className="text-xs text-muted-foreground">Click a style to generate a template</p>
           </div>
           <ScrollArea className="max-h-[360px]">
             <div className="grid grid-cols-3 gap-2 p-3">
               {TEMPLATE_STYLE_PRESETS.map((preset) => (
                 <button
                   key={preset.id}
                   type="button"
                   onClick={() => handleStyleSelect(preset.id, preset.name)}
                   className="p-2.5 rounded-lg border border-border bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left group"
                 >
                   <div className="space-y-1.5">
                     <div className="font-semibold text-xs">{preset.name}</div>
                     <div className="flex gap-1">
                       {preset.colorPalette.slice(0, 4).map((color, idx) => (
                         <div
                           key={idx}
                           className="w-2.5 h-2.5 rounded-full border border-border/50"
                           style={{ backgroundColor: color }}
                         />
                       ))}
                     </div>
                     <div className="text-[10px] text-muted-foreground leading-tight">
                       {preset.mood.split(',')[0]}
                     </div>
                   </div>
                 </button>
               ))}
             </div>
           </ScrollArea>
         </PopoverContent>
       </Popover>
       ```

    5. Keep the existing Suggestions button (`Wand2` icon) and Send button exactly as they are. The final InputGroupAddon order should be: Suggestions button, Styles Popover, Send button.

    IMPORTANT: Do NOT modify handleSubmit, handleToolAction, SUGGESTIONS, or any other existing logic. Only add the popover and its handler.
  </action>
  <verify>
    Run `cd /home/solo/workspace/openvideo && npx tsc --noEmit --project editor/tsconfig.json 2>&1 | head -30` to check for TypeScript errors.
    Run `cd /home/solo/workspace/openvideo && npx next lint --dir editor/src/components/editor/assistant 2>&1 | head -20` to check for lint issues.
    Visually confirm: The assistant input area should show [Suggestions] [Styles] [Send] buttons in the bottom addon bar.
  </verify>
  <done>
    - Styles button with Palette icon visible next to Suggestions button in assistant input area
    - Clicking Styles opens a popover with 12 template styles in a 3-column grid
    - Each style card shows name, color palette dots, and mood keyword
    - Clicking a style closes popover and submits "Generate a {styleName} template" message
    - Existing Suggestions and Send buttons work exactly as before
    - No TypeScript errors
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors
2. The Styles button appears in the assistant input bar
3. Popover opens on click showing all 12 styles in a grid
4. Clicking a style closes the popover and sends the generation message through the chat flow
5. The generate_template tool is invoked by the AI after receiving the style generation message
6. Existing suggestion chips and send functionality remain intact
</verification>

<success_criteria>
- Styles button visible and functional in assistant input area
- Popover displays all 12 template styles from TEMPLATE_STYLE_PRESETS
- Style selection triggers template generation via existing chat flow
- No regressions to existing assistant functionality
</success_criteria>

<output>
After completion, create `.planning/quick/2-add-styles-button-and-popover-to-coco-ai/2-SUMMARY.md`
</output>
