---
phase: quick
plan: 4
subsystem: editor
tags: [upstream-sync, cherry-pick, timeline, animations, playhead]
dependency-graph:
  requires: []
  provides: [upstream-animation-presets, upstream-timeline-fixes]
  affects: [timeline, animation-system, playhead]
tech-stack:
  added: []
  patterns: [selective-cherry-pick, manual-merge-resolution]
key-files:
  created: []
  modified:
    - packages/openvideo/src/animation/presets.ts
    - packages/openvideo/src/animation/keyframe-animation.ts
    - editor/src/components/editor/timeline/index.tsx
    - editor/src/components/editor/timeline/timeline-playhead.tsx
    - editor/src/components/editor/timeline/timeline-ruler.tsx
    - editor/src/components/editor/timeline/timeline/canvas.ts
    - editor/src/components/editor/timeline/timeline/clips/video.ts
    - editor/src/hooks/use-timeline-playhead.ts
    - editor/src/app/api/assets/[...path]/route.ts
decisions:
  - Chose option-b (selective cherry-pick) to avoid upstream mass deletions
  - Applied timeline improvements manually to preserve TimelineDropZone
  - Fixed Next.js 16 async params compatibility
metrics:
  duration: 833s
  completed: 2026-02-11
---

# Quick Task 4: Fetch Upstream and Cherry-pick Editor Improvements

**One-liner:** Selectively cherry-picked 7 upstream commits for animation presets overhaul and timeline/playhead improvements while preserving local SaaS features.

## Summary

Successfully synchronized with upstream (openvideodev/openvideo) by cherry-picking only editor/animation improvements while avoiding upstream's mass deletion of SaaS features. Applied animation preset updates, easing support, timeline ruler fixes, and playhead autoscroll enhancements.

## Implementation Details

### Upstream Analysis
Upstream had 20 commits (v0.1.3 through v0.1.7) containing:
- **Valuable changes:** Animation preset overhaul, easing support, timeline fixes
- **Unwanted changes:** Complete removal of auth, billing, AI, API routes, Prisma schema, workers, integrations

### Cherry-picked Commits
1. **b431f5b** - Animation params update (f6f58e8)
2. **1608ea8** - Preset params update (e452684)
3. **b317a36** - Easing animations refactor (6952691)
4. **b677eb0** - New animation presets (992000d) - 2115 line addition
5. **e379310** - Logic animations update (1f58e55) - 1758 line refactor
6. **6b6fcca** - Timeline/playhead improvements (0ebeb5b, 247925b)

### Manual Merge Strategy
For timeline files (0ebeb5b, 247925b):
- Applied `timeline-playhead.tsx`, `timeline-ruler.tsx`, `canvas.ts`, `video.ts`, `use-timeline-playhead.ts` directly from upstream
- Manually merged `timeline/index.tsx` to preserve local `TimelineDropZone` component
- Added `handleScrollChange` callback for autoscroll integration
- Fixed Next.js 16 async params in API route

### Code Changes

**Animation System:**
- 3198 net line changes in `presets.ts`
- Added easing property to keyframe animations
- New preset parameters and logic

**Timeline System:**
- Improved ruler rendering and frame snapping
- Enhanced playhead autoscroll behavior
- Better scroll synchronization between ruler and canvas
- Preserved local TimelineDropZone drag-and-drop functionality

**Next.js 16 Compatibility:**
- Fixed `params` async handling in `/api/assets/[...path]/route.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Next.js 16 params incompatibility**
- **Found during:** Task 2 (build verification)
- **Issue:** Next.js 16 breaking change - route params are now Promise<{}>
- **Fix:** Changed `params: { path: string[] }` to `params: Promise<{ path: string[] }>` and added `await`
- **Files modified:** `editor/src/app/api/assets/[...path]/route.ts`
- **Commit:** 6b6fcca

**2. [Rule 3 - Blocking] Resolved merge conflicts in timeline files**
- **Found during:** Task 2 (cherry-pick execution)
- **Issue:** Timeline files had conflicts due to quote style changes and structural differences
- **Fix:** Applied upstream files directly, then manually re-integrated local TimelineDropZone
- **Files modified:** All timeline-related files
- **Commit:** 6b6fcca

**3. [Rule 3 - Blocking] Fixed syntax errors from -X theirs merge**
- **Found during:** Task 2 (build verification)
- **Issue:** Automated merge created duplicate code blocks and missing closing tags
- **Fix:** Manually corrected JSX structure and removed duplicates
- **Files modified:** `editor/src/components/editor/timeline/index.tsx`
- **Commit:** 6b6fcca

## Verification

### Completed
- ✅ Cherry-picked 7 commits successfully
- ✅ All animation preset changes applied (3198 lines)
- ✅ Timeline improvements integrated
- ✅ Local uncommitted changes preserved (0 files lost)
- ✅ No unresolved merge conflicts
- ✅ TypeScript compilation successful
- ✅ Local SaaS features intact (auth, billing, AI, API routes all preserved)

### Known Issues (Pre-existing)
- ⚠️ Build fails on useSearchParams() suspense boundary warning (not caused by upstream changes)
- ⚠️ Biome linting warnings in upstream code (complexity, unused params)

Build reaches SSR/export phase before failing on pre-existing useSearchParams issue unrelated to cherry-picked changes. The upstream improvements are successfully integrated.

## Dependencies

**Upstream commits used:**
- f6f58e8, e452684 (animation params)
- 6952691 (easing)
- 0ebeb5b, 247925b (timeline/playhead)
- 992000d, 1f58e55 (animation presets)

**Upstream commits skipped:**
- All merge commits
- All release tag commits
- Package.json version bumps (applied manually)

## Next Steps

1. Fix pre-existing useSearchParams suspense issue (separate task)
2. Address biome linting warnings from upstream code (optional)
3. Test animation presets in editor UI
4. Verify timeline ruler and playhead behavior

## Self-Check: PASSED

**Created files:** 0 (no new files, only modifications)

**Modified files exist:**
```
✓ packages/openvideo/src/animation/presets.ts
✓ packages/openvideo/src/animation/keyframe-animation.ts
✓ editor/src/components/editor/timeline/index.tsx
✓ editor/src/components/editor/timeline/timeline-playhead.tsx
✓ editor/src/components/editor/timeline/timeline-ruler.tsx
✓ editor/src/components/editor/timeline/timeline/canvas.ts
✓ editor/src/components/editor/timeline/timeline/clips/video.ts
✓ editor/src/hooks/use-timeline-playhead.ts
✓ editor/src/app/api/assets/[...path]/route.ts
```

**Commits exist:**
```
✓ b431f5b - update params animations
✓ 1608ea8 - update presetparams
✓ b317a36 - update easing animations
✓ b677eb0 - new presets animations
✓ e379310 - update logic animations
✓ 6b6fcca - apply timeline and playhead improvements
```

**Local features preserved:**
```
✓ .planning/ directory intact
✓ Auth pages exist
✓ API routes exist
✓ Prisma schema exists
✓ AI services exist
✓ TimelineDropZone component preserved
```
