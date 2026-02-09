# Phase 11: AI Features - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can enhance videos with AI voiceover, auto-subtitles, and text-to-video generation. Includes AI-powered template auto-generation from text descriptions. All AI features integrate with the existing editor, template system, and rendering pipeline.

</domain>

<decisions>
## Implementation Decisions

### Voice & Script Input
- Single narration track model — one script, one voice, one audio track added to the timeline
- Plain text with pause markers (e.g., `[pause 1s]`) for timing control — no full SSML
- Multi-provider TTS architecture — abstract behind interface to support multiple providers (ElevenLabs, OpenAI TTS, etc.)
- Provider flexibility allows cost optimization and voice variety without lock-in

### Subtitle Styling
- Presets + customize — start from a curated preset, then tweak font/color/size/position
- Both animation modes available: word-by-word highlight (karaoke/TikTok style) and full phrase display — user chooses
- User-draggable subtitle positioning — place anywhere on canvas, default varies by preset
- Dual subtitle source: auto-detect whether to use TTS script (if voiceover exists) or transcribe existing audio via speech-to-text

### Text-to-Video Flow
- Storyboard approach — user describes scenes in sequence, AI generates each scene
- Stock footage + AI assembly — AI selects stock clips, adds text overlays, transitions, music (compositing, not pure AI generation)
- Output opens in editor as an editable project — user can tweak before rendering
- Curated style/mood presets guide generation (Corporate, Social Media, Cinematic, Tutorial, etc.)

### Template Auto-Generation
- Prompt + style picker input — free text description plus visual style selection
- Near-complete template output — styled with transitions, text effects, placeholder media, close to production-ready
- Auto-detect merge fields — AI identifies which elements should be merge fields (titles, images, colors) and marks them automatically
- Editor command entry point — triggered from inside the editor to fill current canvas
- Iterative chat refinement — "Make the intro shorter" / "Change the font style" adjusts existing template without regenerating
- Full element palette — AI can generate text, images, video clips, audio, effects, animations (everything the editor supports)
- 10-15 style presets (Minimal, Bold, Corporate, Playful, Cinematic, Social, Retro, Neon, Elegant, Tech, etc.)
- Always best quality — single generation mode, no draft/polish tradeoff

### Claude's Discretion
- Voice selection UI design (catalog vs dropdown — fit to existing UI patterns)
- Exact subtitle preset designs and count
- Stock footage sourcing strategy and API choices
- Speech-to-text provider selection (Whisper, Deepgram, etc.)
- Storyboard UI layout and interaction patterns
- AI model selection for template generation (GPT-4, Claude, etc.)

</decisions>

<specifics>
## Specific Ideas

- Text-to-video is an assembler, not a black-box generator — AI selects and composes stock footage with text, transitions, and music into an editable project
- Template auto-generation should feel like having an AI design assistant inside the editor — describe what you want, get a production-ready starting point, then refine through conversation
- Subtitle word-by-word animation should match the popular CapCut/TikTok style that users expect from modern short-form content
- Pause markers in scripts (e.g., `[pause 1s]`) give creators timing control without requiring them to learn SSML

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-ai-features*
*Context gathered: 2026-02-09*
