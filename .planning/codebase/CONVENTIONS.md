# Coding Conventions

**Analysis Date:** 2026-02-09

## Naming Patterns

**Files:**
- Class/Component files: PascalCase (`base-clip.ts`, `resource-manager.ts`, `studio.ts`)
- Utility files: kebab-case (`asset-manager.ts`, `stream-utils.ts`, `audio-codec-detector.ts`)
- Test files: `.spec.ts` suffix (`studio.spec.ts`, `resource-manager.spec.ts`)

**Functions:**
- camelCase for all function and method names
- Example: `preload()`, `loadResource()`, `getStatus()`, `getCurrentTime()`

**Variables:**
- camelCase for local variables and parameters
- Example: `resourceManager`, `imageUrl`, `clipIds`, `totalDuration`

**Types and Interfaces:**
- PascalCase for interface names, prefixed with `I` for public interfaces
- Example: `IClip`, `IStudioOpts`, `IClipMeta`, `IMP4ClipOpts`
- Type aliases: PascalCase without `I` prefix
- Example: `EffectKey`, `TransitionKey`, `ClipJSON`

**Classes:**
- PascalCase for all class names
- Example: `Studio`, `BaseClip`, `ResourceManager`, `EventEmitter`

**Enums:**
- PascalCase for enum name, UPPER_SNAKE_CASE for values
- Located in `src/studio/resource-manager.ts`:
  ```typescript
  export enum ResourceStatus {
    PENDING = 'pending',
    LOADING = 'loading',
    COMPLETED = 'completed',
    FAILED = 'failed',
  }
  ```

## Code Style

**Formatter:** Biome 2.2.5 (biome.json)

**Formatting Rules:**
- Indentation: 2 spaces
- Quote style: Single quotes for regular strings
- JSX quotes: Double quotes for JSX attributes
- Semicolons: Always required
- Trailing commas: ES5 style (allowed in arrays/objects, not function params)

**Example from `src/clips/base-clip.ts`:**
```typescript
async getFrame(time: number): Promise<{
  video: ImageBitmap | null;
  audio: Float32Array[];
  done: boolean;
}> {
  const timestamp = time * this.playbackRate;
  const { video, audio, state } = await this.tick(timestamp);
  // ...
}
```

**Linter:** Biome with recommended rules

**Linting Configuration:**
- Rule: `noExcessiveCognitiveComplexity` - warns on overly complex functions
- Rule: `useExhaustiveDependencies` - disabled
- Rule: `noExplicitAny` - disabled (allow `any` type when needed)
- Rule: Accessibility rules relaxed for canvas-based rendering

## Import Organization

**Order:**
1. External npm packages
2. Relative imports from parent/sibling directories
3. Type imports (using `import type` keyword)

**Example from `src/studio.ts`:**
```typescript
import {
  Application,
  Sprite,
  Texture,
  Container,
  Graphics,
  RenderTexture,
  BlurFilter,
  ColorMatrixFilter,
} from "pixi.js";

import { Caption } from "./clips/caption-clip";
import { Image } from "./clips/image-clip";
import type { IClip, IPlaybackCapable } from "./clips/iclip";
import { Text } from "./clips/text-clip";
import { Video } from "./clips/video-clip";
import { Effect } from "./clips/effect-clip";
```

**Path Aliases:**
- `src/` maps to the src directory root in `vite.config.ts`
- Used as: `import { Log } from "src/utils/log"`

## Error Handling

**Pattern:** Try-catch with meaningful error messages

**Example from `src/studio/resource-manager.ts`:**
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch: ${response.status} ${response.statusText}`
    );
  }
  const stream = response.body;
  if (!stream) throw new Error('Response body is null');
  // ...
} catch (err) {
  item.status = ResourceStatus.FAILED;
  item.error = err instanceof Error ? err : new Error(String(err));
  return item;
}
```

**Best Practices:**
- Always check `instanceof Error` before accessing error properties
- Wrap string errors in `new Error()` for consistency
- Provide context in error messages (what failed, why, status codes if relevant)
- Don't swallow errors silently - either log, throw, or handle explicitly

**Background Error Handling:**
- For non-critical operations, use `.catch()` with logging instead of blocking:
  ```typescript
  AssetManager.put(url, stream).catch((err) => {
    console.error(`ResourceManager: Failed to cache ${url}`, err);
  });
  ```

## Logging

**Framework:** Custom `Log` utility in `src/utils/log.ts`

**Available Methods:**
- `Log.debug(...args)` - Debug level
- `Log.info(...args)` - Info level
- `Log.warn(...args)` - Warning level
- `Log.error(...args)` - Error level

**Log Levels:**
- DEV mode: DEBUG level (all logs shown)
- TEST mode: WARN level (only warnings and errors)
- PROD: INFO level (default)

**Tagged Loggers:**
```typescript
const log = Log.create('MyModule');
log.debug('message');  // Prefixes with 'MyModule'
```

**Usage Example from `src/utils/log.ts`:**
```typescript
// Get log history as string
const history = await Log.dump();

// Set log level programmatically
Log.setLogLevel(Log.warn);
```

## Comments

**When to Comment:**
- Explain non-obvious algorithmic decisions
- Clarify business logic or tricky workarounds
- Document constraints and assumptions
- Mark incomplete/exploratory code with TODO

**JSDoc/TSDoc Style:**
Use for public APIs and complex functions. Example from `src/clips/base-clip.ts`:
```typescript
/**
 * Get video frame and audio at specified time without rendering to canvas
 * Useful for Pixi.js rendering where canvas context is not needed
 * @param time Specified time in microseconds
 */
async getFrame(time: number): Promise<{
  video: ImageBitmap | null;
  audio: Float32Array[];
  done: boolean;
}> {
  // ...
}
```

**Inline Comments:**
Keep minimal - only explain "why" not "what". Example from `src/clips/base-clip.ts`:
```typescript
// Keep last frame, if clip has no data at current frame, render last frame
// Store as ImageBitmap for reusability (VideoFrames can only be used once)
private lastVf: ImageBitmap | null = null;
```

**TODO Markers:**
Minimal use. Single example found in entire codebase at `src/clips/audio-clip.ts`:
```typescript
// TODO: if time span is large, return done, theoretically may lose some audio frames
```

## Function Design

**Size:** Prefer functions under 50 lines

**Parameters:**
- Use destructuring for object parameters when multiple options exist
- Example from `src/studio.ts`:
  ```typescript
  interface IStudioOpts {
    width: number;
    height: number;
    fps?: number;
    bgColor?: string;
    canvas?: HTMLCanvasElement;
    interactivity?: boolean;
    spacing?: number;
  }
  ```

**Return Values:**
- Always specify explicit return type annotations
- Use Promise<T> for async functions
- Return tuples for multiple values (avoid multiple return statements)
- Example from `src/clips/base-clip.ts`:
  ```typescript
  async tick(time: number): Promise<{
    video?: VideoFrame | ImageBitmap | null;
    audio?: Float32Array[];
    state: "done" | "success";
  }>;
  ```

**Async/Await:**
- Preferred over Promise chaining
- Always use try-catch for error handling

## Module Design

**Exports:**
- Use named exports for classes and utilities
- Default exports only for singleton instances
- Re-export main APIs from `index.ts` for public modules

**Example from `src/index.ts`:**
```typescript
export {
  Audio,
  Caption,
  Image,
  Video,
  Text,
  Effect,
  Transition,
  Placeholder,
} from './clips';

export type { IClip, IMP4ClipOpts } from './clips';
export { Studio } from './studio';
export type { IStudioOpts } from './studio';
```

**Barrel Files:**
Used in `src/clips/index.ts` and `src/animation/index.ts` to consolidate exports:
```typescript
export { Audio } from './audio-clip';
export { Caption } from './caption-clip';
export { Image } from './image-clip';
// ... etc
```

## TypeScript Configuration

**Strict Mode:** Enabled in `packages/openvideo/tsconfig.json`
- `strict: true` - All strict checks enabled
- `noUnusedLocals: true` - Error on unused variables
- `noUnusedParameters: true` - Error on unused parameters
- `noFallthroughCasesInSwitch: true` - Prevent switch statement fall-through
- `noUncheckedSideEffectImports: true` - Warn on modules with side effects

---

*Convention analysis: 2026-02-09*
