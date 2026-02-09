# Phase 1: Editor Polish - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Full visual overhaul of the existing editor to achieve a modern, professional design matching contemporary creative tools. This is purely frontend polish — refining the existing panels, controls, timeline, and theme. No new features, no backend work, no new capabilities.

</domain>

<decisions>
## Implementation Decisions

### Design references & mood
- Primary reference: CapCut/Descript visual style — clean, approachable, modern consumer creative tool
- Overall mood: Sleek & minimal — generous spacing, content-forward, fewer visible controls
- Progressive disclosure for complexity — show basics by default, reveal advanced options on expand/hover
- Web-native feel — embrace browser context, standard web conventions, polished web app (not faux-desktop)
- Mix of CapCut + Descript inspiration but develop OpenVideo's own distinctive visual identity

### Color palette & accents
- Accent color: Vibrant purple/violet — distinctive creative-tool energy, stands out from competitors
- Background darkness: Softer dark (#242424 range) — warmer dark gray, approachable, comfortable for long sessions
- Clip type color coding: Distinct saturated colors per type (video, audio, text, effects each get their own color)

### Panel layout & density
- Panel separation: No visible borders or gaps — panels flow together with background shade differences only (seamless)
- Left panel navigation: Icon-only sidebar rail on far left (VS Code activity bar pattern) — clicking opens/closes panel content
- 11+ media tabs organized as vertical icon strip, panel content area opens beside it

### Timeline track styling
- Audio clips: Always show waveform visualization inside clips
- Time format: Minutes and seconds (mm:ss) on ruler — intuitive, matches CapCut/Descript convention

### Claude's Discretion
- UI motion/transitions approach (subtle vs snappy — pick what fits the sleek minimal direction)
- Empty/loading state patterns (skeletons, spinners, or contextual — per-panel decision)
- Selection/active state highlight strategy (purple accent vs brightness shift — determine best approach)
- Properties panel behavior (always visible vs on-demand when clip selected)
- Layout structure refinements (keep 3-column or add collapsible sidebars)
- Video clip timeline visualization (thumbnail filmstrip vs solid blocks)
- Timeline track heights (compact vs medium — fit the design direction)

</decisions>

<specifics>
## Specific Ideas

- CapCut web editor and Descript editor as dual visual references — take cues from both
- VS Code activity bar pattern for the left sidebar rail (icon-only vertical strip)
- Purple/violet as the hero accent color — not just functional, part of the brand identity
- Seamless panel transitions with no visible separation lines or gaps
- Progressive disclosure throughout — don't overwhelm with controls upfront

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-editor-polish*
*Context gathered: 2026-02-09*
