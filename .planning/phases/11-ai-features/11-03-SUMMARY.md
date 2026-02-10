---
phase: 11-ai-features
plan: 03
subsystem: ai
tags: [deepgram, stt, transcription, subtitles, webvtt, karaoke, captions]

# Dependency graph
requires:
  - phase: 11-01
    provides: TTS abstraction layer and word timing utilities
  - phase: existing
    provides: Deepgram transcription service
provides:
  - SubtitleService for audio transcription and subtitle generation
  - 8 curated subtitle presets with karaoke and phrase modes
  - POST /api/ai/subtitles endpoint for subtitle generation
  - WebVTT generation with word-level metadata
  - Caption clip data generation compatible with video editor
affects: [11-04, 11-05, ui-subtitle-integration, video-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [subtitle-service-pattern, preset-system, dual-source-detection]

key-files:
  created:
    - editor/src/lib/ai/presets/subtitle-presets.ts
    - editor/src/app/api/ai/subtitles/route.ts
  modified:
    - editor/src/lib/ai/services/subtitle-service.ts

key-decisions:
  - "8 subtitle presets covering both karaoke and phrase animation modes"
  - "modern-karaoke as default preset for viral/social content"
  - "Dual source detection: TTS script vs audio transcription"
  - "50ms timing offset compensation for transcription drift"
  - "1.5s word gap threshold for pause detection"
  - "Caption-compatible clip format for seamless editor integration"

patterns-established:
  - "Subtitle preset pattern: id, name, description, mode, position, style, colors"
  - "SubtitleService pattern: generateFromAudio, generateFromScript, detectSource"
  - "Word grouping with sentence boundaries, pauses, duration limits"

# Metrics
duration: 7m 55s
completed: 2026-02-09
---

# Phase 11 Plan 03: Subtitle Generation Service Summary

**AI subtitle generation with word-level timing, 8 curated presets (karaoke/phrase), Deepgram STT integration, and WebVTT export**

## Performance

- **Duration:** 7m 55s (475 seconds)
- **Started:** 2026-02-09T21:33:22Z
- **Completed:** 2026-02-09T21:41:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- SubtitleService integrates Deepgram transcription with word-level timestamp extraction
- 8 curated subtitle presets covering karaoke (TikTok-style) and phrase (traditional) modes
- POST /api/ai/subtitles endpoint returns Caption-compatible clips or WebVTT format
- Intelligent word grouping with sentence boundaries, pause detection, and timing compensation
- Dual source detection for TTS voiceover vs regular audio transcription

## Task Commits

Each task was committed atomically:

1. **Task 1: Subtitle service with word timing and WebVTT generation** - `2402bbb` (feat)
2. **Task 2: Subtitle presets and API endpoint** - `7c8405e` (feat)

## Files Created/Modified

- `editor/src/lib/ai/services/subtitle-service.ts` - SubtitleService orchestrating transcription and subtitle generation with dual source detection
- `editor/src/lib/ai/utils/word-timing.ts` - Word timing utilities with groupWordsIntoCues for phrase-level subtitle cues (created in 11-01, used here)
- `editor/src/lib/ai/utils/webvtt-generator.ts` - WebVTT generator and Caption clip data converter (created in 11-01, used here)
- `editor/src/lib/ai/presets/subtitle-presets.ts` - 8 subtitle presets with complete styling and color configurations
- `editor/src/app/api/ai/subtitles/route.ts` - POST endpoint for subtitle generation from audio URL

## Decisions Made

1. **8 subtitle presets** covering diverse visual styles:
   - modern-karaoke (default): TikTok/CapCut orange highlight
   - classic-phrase: Traditional black bar subtitles
   - neon-glow: Cyberpunk cyan/pink aesthetic
   - minimal-clean: Professional light gray
   - bold-impact: High-contrast yellow/black
   - gradient-pop: Orange-to-yellow energetic
   - typewriter: Terminal/hacker monospace
   - social-viral: Red highlight for vertical video

2. **Dual source detection**: Automatically detects if video has TTS voiceover (voiceovers/ path) vs regular audio for appropriate subtitle generation strategy

3. **Timing compensation**: 50ms offset adjustment applied to all word timestamps to compensate for transcription drift

4. **Intelligent grouping**: Words grouped into cues based on:
   - Sentence boundaries (., !, ?)
   - Pause detection (1.5s gap threshold)
   - Max duration (5 seconds default)
   - Max words (10 words default)

5. **Caption clip compatibility**: generateSubtitleClipData outputs clip JSON matching existing caption-generator.ts format for seamless editor integration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - existing Deepgram transcription infrastructure worked seamlessly with word-level timestamp extraction.

## User Setup Required

None - no external service configuration required. Uses existing Deepgram API key from environment.

## Next Phase Readiness

- Subtitle generation service ready for UI integration (11-04)
- 8 preset options ready for subtitle style picker UI
- WebVTT export ready for download feature
- Caption clip format ready for timeline integration
- Dual source detection ready for automatic subtitle mode selection

---
*Phase: 11-ai-features*
*Completed: 2026-02-09*
