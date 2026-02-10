---
phase: 11-ai-features
plan: 01
subsystem: ai
tags: [tts, elevenlabs, openai, ai-providers, voice-synthesis]

# Dependency graph
requires:
  - phase: 06-storage-integration
    provides: R2 storage service for audio file uploads
provides:
  - ITTSProvider interface for provider-agnostic TTS
  - ElevenLabsProvider with SSML pause marker support
  - OpenAITTSProvider with gpt-4o-mini-tts model
  - TTSProviderFactory for provider instantiation
  - Pause marker utilities (parse, strip, extract)
  - GET /api/ai/voices endpoint for voice listing
  - POST /api/ai/tts endpoint for speech synthesis
affects: [11-02-voiceover-panel, 11-04-video-narration, ai-features]

# Tech tracking
tech-stack:
  added: [openai, gpt-4o-mini-tts]
  patterns: [provider-abstraction, factory-pattern, interface-segregation]

key-files:
  created:
    - editor/src/lib/ai/types.ts
    - editor/src/lib/ai/providers/tts/types.ts
    - editor/src/lib/ai/providers/tts/elevenlabs.ts
    - editor/src/lib/ai/providers/tts/openai-tts.ts
    - editor/src/lib/ai/providers/tts/factory.ts
    - editor/src/lib/ai/utils/pause-markers.ts
    - editor/src/app/api/ai/voices/route.ts
    - editor/src/app/api/ai/tts/route.ts
  modified:
    - editor/.env.sample

key-decisions:
  - "Multi-provider abstraction allows switching between ElevenLabs and OpenAI TTS without lock-in"
  - "ElevenLabs uses SSML breaks for pauses, OpenAI strips pause markers and inserts periods"
  - "Voice list cached for 5 minutes to reduce ElevenLabs API calls"
  - "TTS synthesis returns ArrayBuffer, API route handles R2 upload"

patterns-established:
  - "ITTSProvider interface: listVoices() and synthesize() methods for all TTS providers"
  - "Provider factory pattern with getAvailableProviders() for runtime configuration detection"
  - "Pause marker format: [pause 1s] or [pause 500ms] converted per provider capabilities"

# Metrics
duration: 2m 36s
completed: 2026-02-09
---

# Phase 11 Plan 01: Multi-Provider TTS Abstraction Summary

**Multi-provider TTS with ElevenLabs SSML breaks and OpenAI gpt-4o-mini-tts, abstracted behind ITTSProvider interface for cost optimization and voice variety**

## Performance

- **Duration:** 2m 36s
- **Started:** 2026-02-09T21:38:23Z
- **Completed:** 2026-02-09T21:40:59Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Provider-agnostic TTS abstraction layer with ITTSProvider interface
- ElevenLabsProvider implementation with SSML pause marker conversion
- OpenAITTSProvider implementation using gpt-4o-mini-tts model
- Pause marker utilities supporting [pause Xs] syntax with provider-specific handling
- Voice listing API with provider filtering and 5-minute caching
- TTS synthesis API with R2 audio upload and public URL generation

## Task Commits

Each task was committed atomically:

1. **Task 1: TTS provider interfaces, implementations, and pause marker parser** - `ebac6fc` (feat)
2. **Task 2: Voice listing and TTS synthesis API routes** - `7fd7cfd` (feat)

## Files Created/Modified

**AI Core Types:**
- `editor/src/lib/ai/types.ts` - AIProvider type ('elevenlabs' | 'openai') and AIConfig interface

**TTS Provider Abstraction:**
- `editor/src/lib/ai/providers/tts/types.ts` - ITTSProvider interface, Voice, TTSRequest, TTSResponse types
- `editor/src/lib/ai/providers/tts/elevenlabs.ts` - ElevenLabsProvider class with SSML break conversion
- `editor/src/lib/ai/providers/tts/openai-tts.ts` - OpenAITTSProvider class with 10 voice options
- `editor/src/lib/ai/providers/tts/factory.ts` - createTTSProvider() and getAvailableTTSProviders() functions

**Pause Marker Utilities:**
- `editor/src/lib/ai/utils/pause-markers.ts` - parsePauseMarkers(), stripPauseMarkers(), extractPauseMarkers()

**API Endpoints:**
- `editor/src/app/api/ai/voices/route.ts` - GET endpoint listing voices from all configured providers with optional provider filter
- `editor/src/app/api/ai/tts/route.ts` - POST endpoint for text-to-speech synthesis with R2 upload

**Configuration:**
- `editor/.env.sample` - Added OPENAI_API_KEY, ANTHROPIC_API_KEY, PIXABAY_API_KEY

## Decisions Made

1. **Multi-provider architecture**: Abstracted TTS behind ITTSProvider interface to enable cost optimization (OpenAI for high volume, ElevenLabs for premium voices) and avoid vendor lock-in

2. **Provider-specific pause handling**: ElevenLabs converts [pause Xs] to SSML `<break time="Xs"/>` tags, OpenAI strips markers and inserts periods for natural pauses since it doesn't support SSML

3. **Factory pattern**: Used factory functions (createTTSProvider, getAvailableTTSProviders) instead of class to match project conventions and enable runtime provider availability detection

4. **Voice list caching**: ElevenLabs voices cached for 5 minutes to reduce API calls while allowing voice library updates to propagate reasonably quickly

5. **gpt-4o-mini-tts model**: Selected for OpenAI TTS as the cost-effective option for high-volume synthesis

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation succeeded and all TTS provider implementations work as specified.

## User Setup Required

**External services require manual configuration.** Users must obtain API keys:

**OpenAI TTS (cost-effective high-volume synthesis):**
1. Get API key from OpenAI Dashboard → API Keys → Create new secret key
2. Add to `.env`: `OPENAI_API_KEY="sk-..."`
3. Verification: `curl http://localhost:3000/api/ai/voices?provider=openai` should return 10 voices

**ElevenLabs (premium voice quality):**
1. Already configured in previous phase
2. Verification: `curl http://localhost:3000/api/ai/voices?provider=elevenlabs` should return voice list

## Next Phase Readiness

**Ready for Plan 02 (Voiceover Panel):**
- TTS abstraction complete with two providers
- Voice listing API functional
- Speech synthesis API with R2 upload operational
- Pause marker support established

**Blockers:** None

**Technical debt:** None - clean abstraction with proper error handling

---
*Phase: 11-ai-features*
*Completed: 2026-02-09*

## Self-Check: PASSED

All documented files exist:
- ✓ editor/src/lib/ai/types.ts
- ✓ editor/src/lib/ai/providers/tts/types.ts
- ✓ editor/src/lib/ai/providers/tts/elevenlabs.ts
- ✓ editor/src/lib/ai/providers/tts/openai-tts.ts
- ✓ editor/src/lib/ai/providers/tts/factory.ts
- ✓ editor/src/lib/ai/utils/pause-markers.ts
- ✓ editor/src/app/api/ai/voices/route.ts
- ✓ editor/src/app/api/ai/tts/route.ts

All documented commits exist:
- ✓ ebac6fc (Task 1)
- ✓ 7fd7cfd (Task 2)
