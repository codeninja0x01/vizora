# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
/home/solo/workspace/openvideo/
├── .planning/           # GSD planning documents
├── .husky/             # Git hooks (pre-commit lint)
├── packages/
│   ├── openvideo/      # Core video rendering library
│   ├── node/           # Node.js headless renderer
│   └── openvideo/      # (duplicate name, main library)
├── editor/             # Next.js web editor application
├── docs/               # Docusaurus documentation
├── node_modules/       # pnpm managed dependencies
├── package.json        # Root workspace manifest
├── turbo.json          # Turbo build configuration
├── biome.json          # Biome linter/formatter config
└── tsconfig.json       # Root TypeScript config
```

## Directory Purposes

**Root (`/home/solo/workspace/openvideo/`):**
- Purpose: Monorepo root with shared configs and workspace definition
- Contains: package.json with scripts, turbo.json, biome.json, tsconfig.json
- Key files: `package.json` (workspace definition), `turbo.json` (build graph)

**packages/openvideo (`/home/solo/workspace/openvideo/packages/openvideo/`):**
- Purpose: Core video composition and rendering library (published to npm)
- Contains: All clip types, compositor, studio, effects, transitions, animation
- Structure:
  ```
  src/
  ├── clips/              # Clip implementations (Video, Image, Text, Audio, Effect, etc.)
  ├── animation/          # Animation system (GSAP, keyframes, easing)
  ├── effect/            # GLSL-based effects (blur, brightness, distort)
  ├── transition/        # GL Transitions between clips
  ├── sprite/            # Pixi.js sprite rendering
  ├── studio/            # Interactive preview (Studio, Timeline, Selection, History, etc.)
  ├── transfomer/        # Transform controls for interactive editing
  ├── mp4-utils/         # MP4 utilities (concat, muxing helpers)
  ├── utils/             # Shared utilities (audio, color, fonts, logging, etc.)
  ├── compositor.ts      # Main compositor for batch rendering
  ├── studio.ts          # Interactive studio/preview
  ├── event-emitter.ts   # Custom event emitter
  ├── json-serialization.ts # Save/load projects
  ├── gl-transitions.d.ts # Type definitions for gl-transitions
  └── index.ts           # Public API exports
  ```

**packages/node (`/home/solo/workspace/openvideo/packages/node/`):**
- Purpose: Node.js CLI and runtime adapter for headless rendering
- Contains: CLI interface, sample.ts for testing
- Key files: `src/index.ts` (entry point), `src/renderer.ts` (Node adapter)

**editor (`/home/solo/workspace/openvideo/editor/`):**
- Purpose: Next.js web application for interactive video editing
- Contains: React components, API routes, stores, hooks, utilities
- Structure:
  ```
  src/
  ├── app/                    # Next.js app directory
  │   ├── api/               # API route handlers (audio, transcription, uploads, etc.)
  │   ├── layout.tsx         # Root layout
  │   └── page.tsx           # Home page
  ├── components/
  │   ├── editor/            # Main editor component (contains timeline)
  │   │   ├── timeline/      # Timeline UI component (canvas-based editing)
  │   │   ├── media-panel/   # Media library panel
  │   │   ├── assistant/     # AI assistant integration
  │   │   ├── store/         # Timeline editor state
  │   │   ├── interface/     # UI components for editing
  │   │   ├── constants.ts   # Editor constants
  │   │   └── schema.ts      # Zod validation schemas
  │   └── ui/                # Radix UI primitive components
  ├── stores/                # Zustand state stores
  │   ├── studio-store.ts    # Studio instance and state
  │   ├── timeline-store.ts  # Timeline editing state
  │   ├── playback-store.ts  # Playback state
  │   ├── project-store.ts   # Project metadata
  │   ├── panel-store.ts     # UI panel state
  │   └── generated-store.ts # AI-generated content
  ├── hooks/                 # React hooks
  │   ├── use-editor-hotkeys.ts    # Keyboard shortcuts
  │   ├── use-timeline-*.ts        # Timeline specific hooks
  │   ├── use-mobile.ts            # Mobile detection
  │   └── use-edge-auto-scroll.ts  # Auto-scroll during drag
  ├── lib/
  │   ├── r2.ts             # Cloudflare R2 client
  │   ├── config.ts         # Configuration loading
  │   ├── utils.ts          # General utilities
  │   ├── editor-utils.ts   # Editor-specific utilities
  │   ├── storage/          # Storage adapters (OPFS, IndexedDB)
  │   ├── transcribe/       # Transcription integration
  │   └── caption-generator.ts # Caption generation
  ├── genkit/               # Google Genkit AI integration
  │   ├── chat-flow.ts      # Chat interface
  │   ├── script-to-video-flow.ts # Script to video generation
  │   ├── tools.ts          # AI tool definitions
  │   └── utils.ts          # Genkit utilities
  ├── types/                # TypeScript type definitions
  │   ├── editor.ts         # Editor types
  │   ├── project.ts        # Project types
  │   ├── media.ts          # Media types
  │   ├── timeline.ts       # Timeline types
  │   └── playback.ts       # Playback types
  ├── utils/
  │   ├── caption.ts        # Caption utilities
  │   ├── font-utils.ts     # Font handling
  │   ├── id.ts             # ID generation
  │   └── schema-converter.ts # Convert between formats
  ├── constants/            # Global constants
  │   ├── site.ts           # Site configuration
  │   ├── fonts.ts          # Font lists
  │   └── actions.ts        # Action definitions
  └── env.d.ts              # Environment variable types
  ```

**docs (`/home/solo/workspace/openvideo/docs/`):**
- Purpose: Docusaurus documentation website
- Contains: Markdown docs, configuration
- Key files: `docusaurus.config.js`, `src/pages/`

## Key File Locations

**Entry Points:**

- `packages/openvideo/src/index.ts`: Core library exports (Compositor, Studio, clip classes)
- `editor/src/app/layout.tsx`: Next.js root layout (HTML shell)
- `editor/src/app/page.tsx`: Editor home page (main React app)
- `packages/node/src/index.ts`: Node.js headless renderer entry
- `editor/src/components/editor/index.tsx`: Main editor component

**Configuration:**

- `turbo.json`: Build task graph and caching
- `biome.json`: Linter/formatter rules
- `tsconfig.json`: Root TypeScript config
- `editor/tsconfig.json`: Editor-specific TypeScript config
- `packages/openvideo/tsconfig.json`: Library TypeScript config
- `editor/next.config.js`: Next.js configuration
- `lib/config.ts`: Editor runtime configuration

**Core Logic:**

- `packages/openvideo/src/compositor.ts`: Batch video rendering engine (1400+ lines)
- `packages/openvideo/src/studio.ts`: Interactive preview editor (2100+ lines)
- `packages/openvideo/src/clips/`: Clip implementations
  - `base-clip.ts`: Abstract base for all clips
  - `video-clip.ts`: Video playback
  - `image-clip.ts`: Static images
  - `text-clip.ts`: Text rendering
  - `audio-clip.ts`: Audio playback
  - `caption-clip.ts`: Subtitles/captions
  - `effect-clip.ts`: Global effects
  - `transition-clip.ts`: Transition effects
  - `placeholder-clip.ts`: Placeholder for empty tracks
- `packages/openvideo/src/effect/glsl/gl-effect.ts`: GLSL effect system
- `packages/openvideo/src/transition/glsl/gl-transition.ts`: GLSL transitions

**Timeline UI:**

- `editor/src/components/editor/timeline/index.ts`: Main timeline component
- `editor/src/components/editor/timeline/timeline/index.ts`: Pixi-based canvas timeline
- `editor/src/components/editor/timeline/timeline/clips/`: Clip rendering in timeline
- `editor/src/components/editor/timeline/timeline/handlers/`: Drag, resize, modify operations

**State Management:**

- `editor/src/stores/studio-store.ts`: Global studio state (Zustand)
- `editor/src/stores/timeline-store.ts`: Timeline editing state
- `packages/openvideo/src/studio/history-manager.ts`: Undo/redo with microdiff
- `packages/openvideo/src/studio/timeline-model.ts`: Clip/track data model

**Testing:**

- `packages/openvideo/src/*.spec.ts`: Unit tests (Vitest)
- `vitest.config.ts`: Vitest configuration

## Naming Conventions

**Files:**

- **Clip classes**: `{type}-clip.ts` (e.g., `video-clip.ts`, `text-clip.ts`)
- **Store files**: `{feature}-store.ts` (e.g., `timeline-store.ts`)
- **Hook files**: `use-{feature}.ts` (e.g., `use-editor-hotkeys.ts`)
- **Type definition files**: `{feature}.ts` in `types/` directory
- **Utility files**: `{feature}-utils.ts` or `{feature}.ts` in `utils/`
- **API routes**: Match request path (e.g., `api/audio/sfx/route.ts` handles `/api/audio/sfx`)
- **Test files**: `{file}.spec.ts` or `{file}.test.ts`

**Classes & Exports:**

- **Clip classes**: PascalCase (e.g., `Video`, `Image`, `Text`)
- **Manager classes**: `{Feature}Manager` (e.g., `SelectionManager`, `HistoryManager`)
- **Interfaces**: `I{Feature}` prefix (e.g., `IClip`, `ICompositorOpts`)
- **Type interfaces**: `{Feature}` or `{Feature}Props` (e.g., `ProjectJSON`, `StudioEvents`)
- **Hooks**: `use{Feature}` (e.g., `useEditorHotkeys`)
- **Store files**: `use{Feature}Store` exported (e.g., `useStudioStore`)
- **Utilities**: camelCase functions (e.g., `parseColor`, `getDefaultAudioConf`)

**Directories:**

- **Feature grouping**: Group by feature (e.g., `timeline/`, `media-panel/`) not by file type
- **Lowercase names**: All directories use lowercase with hyphens
- **Deep nesting**: Max 3-4 levels before extracting to separate directories

## Where to Add New Code

**New Clip Type:**
- Implementation: `packages/openvideo/src/clips/{type}-clip.ts`
- Export: Add to `packages/openvideo/src/clips/index.ts`
- Interface: Extend `BaseClip` and implement `IClip`
- Tests: `packages/openvideo/src/clips/{type}-clip.spec.ts`

**New Feature in Library:**
- Core code: `packages/openvideo/src/{feature}/`
- If related to rendering: `packages/openvideo/src/sprite/` or `packages/openvideo/src/compositor.ts`
- If related to editing UI: Goes in editor layer instead

**New Editor Component:**
- React component: `editor/src/components/{feature}/index.tsx` or `{feature}.tsx`
- Store: `editor/src/stores/{feature}-store.ts` if needs persistent state
- Hooks: `editor/src/hooks/use-{feature}.ts` for reusable logic
- Types: `editor/src/types/{feature}.ts`
- Tests: `editor/src/components/{feature}/__tests__/` or `{feature}.test.ts`

**New API Route:**
- Handler: `editor/src/app/api/{endpoint}/route.ts`
- Pattern: Follow Next.js route handlers (GET, POST, PUT, DELETE methods)
- Schema: Define Zod schemas in the same file or `components/schema.ts`
- Integration: Import from library or external APIs

**New Utility:**
- Library utility: `packages/openvideo/src/utils/{feature}.ts`
- Editor utility: `editor/src/lib/{feature}.ts` or `editor/src/utils/{feature}.ts`
- Export from appropriate index file

**New Test:**
- Unit tests: Same directory as code with `.spec.ts` suffix
- Location: `packages/openvideo/src/**/*.spec.ts`
- Framework: Vitest
- Config: `vitest.config.ts` at workspace root

## Special Directories

**node_modules:**
- Purpose: pnpm managed dependencies
- Generated: Yes, not committed
- Committed: No, use pnpm-lock.yaml instead

**.turbo/:**
- Purpose: Turbo cache and daemon state
- Generated: Yes
- Committed: No (git ignored)

**.next/:**
- Purpose: Next.js build output (editor)
- Generated: Yes
- Committed: No

**dist/:**
- Purpose: Compiled output (packages/openvideo)
- Generated: Yes via `pnpm build`
- Committed: No, generated on CI

**build/**:**
- Purpose: Various build artifacts
- Generated: Yes
- Committed: No

**.planning/codebase/:**
- Purpose: GSD mapping documents
- Generated: Yes (by /gsd:map-codebase)
- Committed: Yes for reference

---

*Structure analysis: 2026-02-09*
