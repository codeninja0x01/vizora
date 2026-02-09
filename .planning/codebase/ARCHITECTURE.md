# Architecture

**Analysis Date:** 2026-02-09

## Pattern Overview

**Overall:** Layered monorepo with core library, runtime adapters, and interactive editor UI. Uses event-driven rendering pipeline with canvas-based compositing.

**Key Characteristics:**
- Modular clip-based abstraction (IClip interface) for flexible media composition
- Pixi.js rendering engine with WebGL for high-performance 2D graphics
- WebCodecs API for hardware-accelerated video encoding/decoding
- Turbo monorepo with pnpm workspaces for build orchestration
- Event emitter pattern for reactive state updates

## Layers

**Core Library (`/packages/openvideo`):**
- Purpose: Video rendering and composition engine with clip abstractions
- Location: `/home/solo/workspace/openvideo/packages/openvideo/src/`
- Contains: Clip implementations, compositor, studio, effects, transitions, animations, rendering utilities
- Depends on: Pixi.js, WebCodecs, gl-transitions, GSAP, media APIs
- Used by: Editor, Node.js renderer, external integrations

**Node.js Renderer (`/packages/node`):**
- Purpose: Server-side headless video rendering for automation and batch processing
- Location: `/home/solo/workspace/openvideo/packages/node/src/`
- Contains: CLI interface, sample rendering, Node.js specific adapters
- Depends on: Core library, node runtime APIs
- Used by: Backend services, CI/CD pipelines

**Editor UI (`/editor`):**
- Purpose: Interactive Next.js web application for video editing
- Location: `/home/solo/workspace/openvideo/editor/src/`
- Contains: React components, timeline UI, media panels, API routes, stores, tools
- Depends on: Core library, Genkit AI (Google), AWS S3, external APIs
- Used by: End users for video creation and editing

**Documentation (`/docs`):**
- Purpose: Docusaurus-based documentation site
- Location: `/home/solo/workspace/openvideo/docs/`

## Data Flow

**Rendering Pipeline (Compositor):**

1. **Input Stage** - Clips are added to compositor via `addSprite(clip)`
2. **Metadata Resolution** - Each clip resolves `ready` promise to get dimensions
3. **Encoding Initialization** - Muxer configured based on composite dimensions/codec
4. **Frame Loop** - For each frame from timestamp 0 to duration:
   - Call `clip.animate(relativeTime)` to update animation state
   - Call `clip.getFrame(relativeTime)` to fetch video/audio data at time
   - Render sprites via Pixi.js (if video track enabled)
   - Encode audio frame via AudioEncoder
   - Encode video frame via VideoEncoder
5. **Output** - ReadableStream of binary MP4 data via `recodemux` muxer

**Interactive Preview (Studio):**

1. **Scene Setup** - Pixi.js Application created with HTMLCanvasElement
2. **Clip Management** - Clips organized into tracks with timeline model
3. **Playback Loop** - Transport manages playhead, triggers `updateFrame(timestamp)` each frame
4. **Frame Rendering**:
   - Animate clips based on relative time
   - Render clips to Pixi stage via PixiSpriteRenderer
   - Apply transitions between clips
   - Apply global effects to rendered output
5. **State Changes** - Events emitted on clip/selection/playback changes

**State Management:**
- **Timeline**: TimelineModel tracks clips, tracks, clip metadata
- **Transport**: Controls playback state, currentTime, playhead position
- **Selection**: SelectionManager tracks selected clips, handles interactivity
- **History**: HistoryManager with microdiff for undo/redo
- **Effects**: GlobalEffects map for adjustment layer effects

## Key Abstractions

**IClip Interface:**
- Purpose: Universal abstraction for all content types (video, image, text, audio, effects, transitions)
- Examples: `Video`, `Image`, `Text`, `Audio`, `Effect`, `Transition`, `Caption`, `Placeholder`
- Pattern: Base class `BaseClip` extends `BaseSprite` and implements `IClip`
  - `ready: Promise<IClipMeta>` resolves dimensions and duration
  - `getFrame(time)` returns `{video: ImageBitmap|null, audio: Float32Array[][], done: boolean}`
  - `animate(time)` updates animation keyframes
  - `clone()` for non-destructive copying

**Compositor:**
- Purpose: Takes multiple clips, renders to video stream via WebCodecs
- Location: `/home/solo/workspace/openvideo/packages/openvideo/src/compositor.ts`
- Core methods:
  - `addSprite(clip)` - add clip for composition
  - `output()` - returns ReadableStream of MP4 binary data
  - `initPixiApp()` - setup WebGL canvas and Pixi renderer (if video track needed)
  - `runEncoding()` - main loop that samples frames and encodes

**Studio:**
- Purpose: Interactive preview with playback, selection, transformation, history
- Location: `/home/solo/workspace/openvideo/packages/openvideo/src/studio.ts`
- Aggregates:
  - `SelectionManager` - clip selection, interactive transform controls
  - `Transport` - playback control (play/pause/seek)
  - `TimelineModel` - clip/track management
  - `HistoryManager` - undo/redo with state snapshots
  - `ResourceManager` - resource deduplication
- Core methods:
  - `addClip(clip)` - add to timeline
  - `updateFrame(timestamp)` - render current frame
  - `play()`, `pause()`, `seek(time)` - playback control
  - `undo()`, `redo()` - history operations

**Effects & Transitions:**
- **Effect**: GLSL shader-based image filters (blur, brightness, distort, etc.)
  - Location: `/home/solo/workspace/openvideo/packages/openvideo/src/effect/`
  - `makeEffect({name, renderer})` creates filter + render function
  - Applied via Pixi.js filters or post-processing
- **Transition**: GL Transitions between two clips with progress parameter
  - Location: `/home/solo/workspace/openvideo/packages/openvideo/src/transition/`
  - `makeTransition({name, renderer})` creates transition renderer
  - Renders two input textures with interpolated progress

**Animation:**
- Purpose: Keyframe-based property animation (opacity, position, scale, rotation, etc.)
- Types:
  - `GsapAnimation` - uses GSAP tweening engine
  - `KeyframeAnimation` - manual keyframe definition with easing
- Location: `/home/solo/workspace/openvideo/packages/openvideo/src/animation/`

**PixiSpriteRenderer:**
- Purpose: Wrapper around Pixi.js Sprite for clip rendering
- Location: `/home/solo/workspace/openvideo/packages/openvideo/src/sprite/pixi-sprite-renderer.ts`
- Manages sprite lifecycle, texture updates, transform application

## Entry Points

**Library Consumer (Compositor):**
- Location: `packages/openvideo/src/index.ts` exports public API
- Usage: Import clip classes, create compositor, add clips, call output()
- Example: `new Compositor({width:1920, height:1080}).addSprite(...).output()`

**Library Consumer (Studio):**
- Location: `packages/openvideo/src/index.ts` exports Studio class
- Usage: Create studio, add clips, listen to events, control playback
- Example: `new Studio({width:1280, height:720}).addClip(...).play()`

**Editor Application:**
- Location: `/editor/src/app/layout.tsx` and `/editor/src/app/page.tsx`
- Next.js app router entry point
- Loads React component tree with editor UI

**API Routes:**
- Location: `/editor/src/app/api/**/*.ts` (Next.js route handlers)
- Routes: Audio generation, transcription, media search, S3 uploads, chat

**Node Renderer CLI:**
- Location: `/packages/node/src/index.ts`
- Provides Node.js entry point for headless rendering

## Error Handling

**Strategy:** Layered error handling with event emission and logging

**Patterns:**

1. **Async/Await with Try-Catch**: Most async operations wrapped in try-catch
   - Example: `compositor.output()` catches and emits `error` event

2. **Event-Based Errors**: EventEmitter pattern for async error propagation
   - Compositor emits `error` events during encoding failures
   - Studio emits errors during clip operations

3. **Validation**: Input validation via Zod schemas in editor layer
   - Example: `/editor/src/components/schema.ts` validates clip data

4. **Fallback Rendering**: Null checks for missing frames (e.g., transition fallback frames)
   - Studio caches last valid frame for transition display

5. **Resource Cleanup**: Explicit destroy() calls on all Pixi objects
   - Prevents WebGL context loss and memory leaks
   - Compositor and Studio implement cleanup on destroy

## Cross-Cutting Concerns

**Logging:** Log utility in `/packages/openvideo/src/utils/log.ts`
- Creates prefixed loggers per module
- Methods: `.info()`, `.warn()`, `.error()`, `.debug()`

**Validation:** Zod schemas for API/clip data validation
- Example: `/editor/src/components/schema.ts` validates project structure

**JSON Serialization:** Custom serialization for clips and projects
- Functions: `clipToJSON()`, `jsonToClip()`, `ProjectJSON` type
- Enables undo/redo and project save/load
- Location: `/packages/openvideo/src/json-serialization.ts`

**Timing:** All timing in microseconds for high precision
- Converts to seconds only at media API boundaries (audio sampleRate, display time)
- Example: `fps=30 → timeSlice=Math.round(1e6/30)` microseconds per frame

**Resource Management:** WeakMap/Map caches for deduplication
- Studio caches video textures: `videoTextureCache = new WeakMap<HTMLVideoElement, Texture>()`
- HistoryManager caches clips by ID for rapid restoration

---

*Architecture analysis: 2026-02-09*
