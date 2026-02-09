# Codebase Concerns

**Analysis Date:** 2026-02-09

## Tech Debt

**Deprecated Caption API Pattern:**
- Issue: Caption clip maintains backward compatibility with deprecated properties (`words`, `colors`, `preserveKeywordColor`, `videoWidth`, `videoHeight`, `bottomOffset`) alongside new nested `caption` structure
- Files: `packages/openvideo/src/clips/caption-clip.ts` (lines 166-200)
- Impact: Code duplication, maintenance burden, potential for inconsistencies between old and new API paths
- Fix approach: Phase out deprecated properties, migrate users to new `caption` structure in next major version

**Audio Chunk Loss on Large Seek Operations:**
- Issue: When seek time difference exceeds 3 seconds or time moves backward, audio clip resets state but may theoretically lose audio frames between frames during large jumps
- Files: `packages/openvideo/src/clips/audio-clip.ts` (line 233)
- Impact: Potential audio data gaps in edge cases with large seek operations
- Fix approach: Add explicit frame loss detection and warning; implement frame buffering for large time spans

**Overly Complex Studio Class:**
- Issue: `studio.ts` is 2139 lines with 2000+ line `updateFrame` method handling multiple concerns: clip rendering, transitions, effects, playback, frame synchronization
- Files: `packages/openvideo/src/studio.ts`
- Impact: Difficult to maintain, test, and debug; high risk of state corruption; performance degradation with many clips
- Fix approach: Extract transition rendering to separate TransitionManager; extract effect rendering to separate EffectManager; break updateFrame into smaller methods

**Manually Managed Resource Maps:**
- Issue: Studio maintains 10+ Maps for tracking sprites, renderers, listeners, playback elements - cleanup is manual and scattered across multiple locations
- Files: `packages/openvideo/src/studio.ts` (lines 130, 165, 166, 202-212, 217)
- Impact: High risk of memory leaks; incomplete cleanup on clip removal; resource exhaustion with long-running sessions
- Fix approach: Implement ResourceManager pattern; use WeakMap where possible; centralize cleanup logic

**Excessive `any` Types in GLSL Modules:**
- Issue: Transition and effect GLSL modules use `any` type for uniform values across 30+ definitions
- Files: `packages/openvideo/src/transition/glsl/custom-glsl.ts`, `packages/openvideo/src/transition/glsl/gl-transition.ts`, `packages/openvideo/src/effect/glsl/custom-glsl.ts`
- Impact: Loss of type safety; potential runtime errors with incorrect uniform types
- Fix approach: Create proper TypeScript types for shader uniforms (vec2, vec3, float, etc.)

## Known Bugs

**Playback Speed Not Synced to Studio:**
- Symptoms: Speed slider in editor updates playback store but doesn't affect actual video playback
- Files: `editor/src/stores/playback-store.ts` (line 68)
- Trigger: Set speed via UI, play video - playback rate doesn't change
- Workaround: None currently implemented
- Impact: Speed control feature is non-functional

**Potential Memory Leak with Video Texture Cache:**
- Symptoms: Long-running sessions with many video clips may accumulate cached textures
- Files: `packages/openvideo/src/studio.ts` (line 217) - WeakMap is used but only when video elements are garbage collected
- Trigger: Load many videos without destroying them properly
- Cause: WeakMap keys (HTMLVideoElement) may not be garbage collected if clip lifecycle doesn't properly release references
- Workaround: Manually call destroy() on clips

**Non-null Assertion Risks:**
- Symptoms: Runtime null reference errors in certain edge cases
- Files: `packages/openvideo/src/studio.ts` (lines 1320+), `packages/openvideo/src/studio/timeline-model.ts` (various)
- Cause: Many non-null assertions (`!`) without null checks on properties like `clip?.transition?.start!`, `result.state!`
- Impact: Crashes when assumptions are violated

## Security Considerations

**Missing Input Validation on URLs:**
- Risk: User-provided URLs for clips are not validated before loading
- Files: `packages/openvideo/src/clips/audio-clip.ts`, `packages/openvideo/src/clips/video-clip.ts`, `packages/openvideo/src/clips/image-clip.ts` (fromUrl methods)
- Current mitigation: ResourceManager handles the fetch, but no URL origin validation
- Recommendations:
  - Validate URLs against allowlist of domains
  - Add CORS validation
  - Implement URL parsing and sanitization

**CORS Configuration Too Permissive:**
- Risk: Audio elements use `crossOrigin: 'anonymous'` globally
- Files: `packages/openvideo/src/clips/audio-clip.ts` (line 348)
- Current mitigation: Standard HTML5 behavior
- Recommendations: Allow configuration of CORS mode per clip

## Performance Bottlenecks

**O(n) Linear Search Operations:**
- Problem: Multiple O(n) lookups in loops (finding tracks, clips by ID)
- Files: `packages/openvideo/src/studio/timeline-model.ts` (lines 21-38, 372-376)
- Cause: Using `.find()` instead of maintaining hash maps
- Improvement path: Build clip ID -> clip and track ID -> track maps; update on modifications

**Frame-by-Frame Update of All Clips:**
- Problem: `updateFrame()` processes ALL clips every frame, even off-screen or inactive ones
- Files: `packages/openvideo/src/studio.ts` (lines 1159-1596)
- Cause: No culling or dirty flag optimization
- Improvement path:
  - Add clip visibility/dirty flags
  - Batch process by track
  - Skip clips outside display window

**Texture Recreation on Every Frame:**
- Problem: Transition textures created/destroyed frequently even when stable
- Files: `packages/openvideo/src/studio.ts` (lines 1320-1338)
- Cause: No texture reuse between frames
- Improvement path: Cache transition textures, update contents instead of recreating

**Mirror Animation Sprite Swapping:**
- Problem: When `mirror` animation property is active, `PixiSpriteRenderer` destroys and recreates sprites every time mirror state toggles (Sprite <-> TilingSprite swap). TilingSprite is sized at 5x the texture dimensions to cover rotation gaps, which increases GPU memory usage.
- Files: `packages/openvideo/src/sprite/pixi-sprite-renderer.ts`, `packages/openvideo/src/compositor.ts`
- Cause: Pixi.js `Sprite` and `TilingSprite` are different classes; no shared base that supports both modes
- Improvement path: Cache both sprite types and toggle visibility instead of destroy/recreate; consider smaller tiling multiplier with dynamic sizing based on actual animation transform

**Recursive async Operations:**
- Problem: `waitEncoderQueue()` uses recursion for polling
- Files: `packages/openvideo/src/compositor.ts` (lines 64-68)
- Cause: Recursive async pattern can cause stack buildup
- Improvement path: Use Promise polling or event-based approach

## Fragile Areas

**Transition State Management:**
- Files: `packages/openvideo/src/studio.ts` (lines 1303-1488)
- Why fragile: Complex logic for determining "in transition", rendering from/to frames, managing sprite visibility; deeply nested conditions
- Safe modification:
  - Write tests first covering all transition edge cases
  - Document state flow with diagram
  - Extract to separate TransitionController class
- Test coverage: Minimal; no dedicated transition tests found

**Caption Text Rendering and Layout:**
- Files: `packages/openvideo/src/clips/caption-clip.ts` (2103 lines)
- Why fragile: Complex text layout logic with word wrapping, line joining, shadow/stroke rendering; multiple rendering paths (bitmap vs canvas)
- Safe modification:
  - Add unit tests for text layout (wrapping, alignment, positioning)
  - Test with various font sizes and container dimensions
  - Test with RTL languages if supported
- Test coverage: Unknown; 530 test files found but specific coverage unknown

**History/Undo System:**
- Files: `packages/openvideo/src/studio.ts` (lines 304-435), `packages/openvideo/src/studio/history-manager.ts`
- Why fragile: Patch application requires careful ordering; state serialization must be perfect; circular dependency with clip cache
- Safe modification:
  - Test undo/redo chains with various operation sequences
  - Test state consistency after complex operations
  - Verify patch reversal is mathematically inverse
- Test coverage: Minimal

**Global Effect Rendering Pipeline:**
- Files: `packages/openvideo/src/studio.ts` (lines 1926-2056)
- Why fragile: Multiple container switches, texture management, render target handling; several manual cleanup points
- Safe modification:
  - Add integration tests showing effect chains
  - Test cleanup after effect removal
  - Verify no texture leaks
- Test coverage: No dedicated effect tests found

## Scaling Limits

**Maximum Clips Before Performance Degrades:**
- Current capacity: ~50-100 clips at reasonable frame rate (depends on clip type and effects)
- Limit: Linear update in updateFrame() scales poorly; transitions between clips cause texture allocations
- Scaling path:
  - Implement dirty flag optimization
  - Add spatial culling
  - Consider virtualizing clip list for many short clips
  - Profile with 500+ clips to identify bottleneck

**Canvas Size Limitations:**
- Current capacity: Tested up to 4K (3840x2160)
- Limit: Pixi.js and WebGL have texture size limits (varies by device, typically 4096x4096 on mobile)
- Scaling path:
  - Add warning for canvas sizes approaching texture limits
  - Consider tiling for very large canvases

**Memory Usage with Long Videos:**
- Current capacity: Audio clips with 1+ hour duration remain manageable
- Limit: Full PCM extraction for audio clips can consume 500MB+ for long files
- Scaling path:
  - Implement streaming audio decoder
  - Add chunked processing for audio
  - Consider memory limits with warning

## Dependencies at Risk

**Pixi.js 8.14 (Browser Rendering):**
- Risk: Major version; API changes between versions; WebGL compatibility issues
- Impact: Core rendering engine; any upgrade requires extensive testing
- Migration plan:
  - Test renderer with various WebGL implementations
  - Maintain separate branch for v9 exploration
  - Document API changes as they occur

**@wrapbox/recodemux (MP4 Remuxing):**
- Risk: Small community; may lack maintenance
- Impact: MP4 export fails if library abandoned
- Migration plan: Evaluate ffmpeg.wasm as alternative

**Custom GLSL Code:**
- Risk: GLSL shaders written inline; no validation framework
- Impact: Shader compilation errors only discovered at runtime
- Migration plan: Implement GLSL validator; add shader unit tests

## Missing Critical Features

**Playback Speed Control:**
- Problem: Speed slider exists in UI but doesn't affect playback (see Known Bugs)
- Blocks: Pause/resume at non-1x speed; tutorial videos at increased speed

**Audio-Only Output Export:**
- Problem: Compositor always includes video track even if clips are audio-only
- Blocks: Creating MP3s or pure audio exports

**A/B Testing for Transitions:**
- Problem: No way to preview transition before applying; must edit clip to see result
- Blocks: Efficient transition selection workflow

## Test Coverage Gaps

**Untested Clip Types:**
- What's not tested: Caption clip rendering (complex text layout), Image clip with effects, Audio sync across clips
- Files: `packages/openvideo/src/clips/caption-clip.ts`, `packages/openvideo/src/clips/image-clip.ts`, `packages/openvideo/src/clips/audio-clip.ts`
- Risk: Text layout bugs, image effect artifacts, audio sync drift
- Priority: **High** - Caption is user-facing and complex

**Untested Editor Integration:**
- What's not tested: Studio-to-Editor state sync, real-time timeline updates, undo/redo with UI
- Files: `editor/src/components/editor/timeline/timeline-studio-sync.tsx`, `editor/src/stores/`
- Risk: Silent state divergence between engine and UI
- Priority: **High** - Primary user interface

**Untested Error Scenarios:**
- What's not tested: Network failures loading clips, corrupted JSON restore, out-of-memory conditions
- Files: Various clip loading and JSON serialization
- Risk: Crashes with cryptic errors instead of graceful degradation
- Priority: **Medium** - Affects production reliability

**No E2E Tests for Rendering:**
- What's not tested: Full render pipeline from Studio to Compositor, multi-track video export, effect chains
- Risk: Regression in export output quality undetected until user reports
- Priority: **High** - Core feature

**No Performance Regression Tests:**
- What's not tested: Frame time budget, memory growth over time, texture leak detection
- Risk: Silent performance degradation over time
- Priority: **Medium** - Detected by users before tests

---

*Concerns audit: 2026-02-09*
