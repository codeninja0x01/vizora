# Testing Patterns

**Analysis Date:** 2026-02-09

## Test Framework

**Runner:** Vitest 4.0.18
- Config file: `packages/openvideo/vitest.config.ts`
- Setup file: `packages/openvideo/vitest.setup.ts`

**Assertion Library:** Vitest built-in (uses standard assertions)

**Browser Testing:** Enabled
- Provider: Playwright (playwright 1.49.0)
- Browser: Chromium (headless)
- Mode: Enabled for all tests in `unit-chromium` project

**Run Commands:**
```bash
pnpm test              # Run all tests (watch mode)
pnpm test:browser      # Run browser tests with Chromium
```

From `packages/openvideo/package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:browser": "vitest run --project unit-chromium"
  }
}
```

## Test File Organization

**Location:** Co-located with source files in same directory

**Naming Convention:** `.spec.ts` suffix

**Structure:**
- `src/studio.spec.ts` - Tests for `src/studio.ts`
- `src/studio/resource-manager.spec.ts` - Tests for `src/studio/resource-manager.ts`

**Discovery Pattern:** `vitest.config.ts` includes files matching `src/**/*.spec.ts`

## Test Structure

**Framework:** describe/it pattern with setup/teardown

**Example from `src/studio.spec.ts`:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Studio, Text, Image as ImageClip } from './index';

describe('studio-core-functionality', () => {
  let studio: Studio;
  let canvas: HTMLCanvasElement;

  beforeEach(async () => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    studio = new Studio({
      canvas,
      width: 1280,
      height: 720,
    });

    await studio.ready;
  });

  afterEach(() => {
    studio?.destroy();
    if (canvas && canvas.parentElement) {
      document.body.removeChild(canvas);
    }
  });

  describe('clip-management', () => {
    it('should-add-and-remove-a-text-clip', async () => {
      const text = new Text('Hello World');
      text.duration = 5e6;
      await studio.addClip(text);

      expect(studio.clips.length).toBe(1);
      expect(studio.clips[0].id).toBe(text.id);

      await studio.removeClip(text.id);
      expect(studio.clips.length).toBe(0);
    });
  });
});
```

## Mocking

**Framework:** `vi` from vitest

**Module Mocking Pattern:**
Use `vi.mock()` at top of test file. Example from `src/studio/resource-manager.spec.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceManager, ResourceStatus } from './resource-manager';
import { AssetManager } from '../utils/asset-manager';

vi.mock('../utils/asset-manager', () => ({
  AssetManager: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));
```

**Function Mocking:**
Use `vi.fn()` to mock functions within tests:
```typescript
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    },
  }),
});
vi.stubGlobal('fetch', fetchMock);
```

**Clearing Mocks:**
Reset between tests:
```typescript
beforeEach(() => {
  resourceManager = new ResourceManager();
  vi.clearAllMocks();
});
```

**What to Mock:**
- External services and API clients
- Global objects (fetch, window, etc.)
- Dependencies with complex state
- AsyncIterator-based operations

**Mock Assertion Patterns:**
```typescript
// Verify call count
expect(fetchMock).toHaveBeenCalledTimes(2);

// Verify call arguments
expect(AssetManager.get).toHaveBeenCalledWith(url);

// Verify not called
expect(fetchMock).not.toHaveBeenCalled();
```

## Fixtures and Test Data

**Inline Data Fixtures:**
Base64-encoded image data used directly in tests. Example from `src/studio.spec.ts`:
```typescript
const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const image = await ImageClip.fromUrl(dataUrl, dataUrl);
```

**Constructor Patterns:**
Use actual constructors with test-friendly defaults. Example from `src/studio.spec.ts`:
```typescript
// Text with default options
const text = new Text('Hello World');

// Text with custom style
const text = new Text('Serial Test', { fontSize: 80, fill: '#ff0000' });

// Image from URL
const image = await ImageClip.fromUrl(dataUrl, dataUrl);
```

**No Centralized Fixture Files:**
Factories are minimal - use inline construction in tests

## Coverage

**Requirements:** Not enforced (no coverage targets configured)

**View Coverage:** No specific command configured

## Test Types

**Unit Tests:**
- Scope: Individual class methods and utility functions
- Approach: Isolate module under test, mock dependencies
- Example: `resource-manager.spec.ts` tests ResourceManager in isolation with mocked AssetManager

**Integration Tests:**
- Scope: Multiple components working together
- Approach: Minimal mocking, test actual interactions
- Example: `studio.spec.ts` tests Studio with actual Text, Image clips, creating realistic workflows

**E2E Tests:**
- Not currently implemented
- Browser testing is enabled but used for integration testing (browser environment requirements)

## Common Patterns

**Browser-Based Tests:**
Tests run in actual browser environment (Chromium via Playwright). Example from `src/studio.spec.ts`:
```typescript
beforeEach(async () => {
  canvas = document.createElement('canvas');
  document.body.appendChild(canvas);

  studio = new Studio({
    canvas,
    width: 1280,
    height: 720,
  });

  await studio.ready;  // Wait for initialization
});
```

**Async Testing:**
Use async/await in test functions:
```typescript
it('should-preload-multiple-urls-in-parallel', async () => {
  const urls = [...];
  await resourceManager.preload(urls);

  const statusA = resourceManager.getStatus(urls[0]);
  expect(statusA?.status).toBe(ResourceStatus.COMPLETED);
});
```

**Promise Testing:**
Use `Promise.allSettled()` for multiple async operations:
```typescript
const promises = uniqueUrls.map((url) => this.loadResource(url));
await Promise.allSettled(promises);
```

**Error Testing:**
Test both success and failure paths:
```typescript
it('should-handle-failed-downloads-gracefully', async () => {
  (AssetManager.get as any).mockResolvedValue(null);
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
  vi.stubGlobal('fetch', fetchMock);

  await resourceManager.loadResource(url);

  const status = resourceManager.getStatus(url);
  expect(status?.status).toBe(ResourceStatus.FAILED);
  expect(status?.error).toBeDefined();
});
```

**Resource Cleanup:**
Always clean up resources in afterEach:
```typescript
afterEach(() => {
  studio?.destroy();
  if (canvas && canvas.parentElement) {
    document.body.removeChild(canvas);
  }
});
```

## Test Organization Strategy

**Suite Nesting:**
Organize related tests in nested describe blocks. Example from `src/studio.spec.ts`:
```typescript
describe('studio-core-functionality', () => {
  // Setup for all tests

  describe('clip-management', () => {
    it('should-add-and-remove-a-text-clip', ...)
    it('should-add-multiple-clips-and-maintain-order', ...)
  });

  describe('selection-operations', () => {
    it('should-delete-selected-clips', ...)
  });

  describe('timeline-control', () => {
    it('should-seek-to-specific-time', ...)
  });
});
```

**Test Naming:**
Use kebab-case names that clearly describe what is tested:
- `should-add-and-remove-a-text-clip`
- `should-batch-update-clips-using-updateclips`
- `should-split-selected-clip-at-current-time`

## Setup Files

**Global Setup:** `packages/openvideo/vitest.setup.ts`

Currently minimal - only imports pixi.js:
```typescript
import { vi } from 'vitest';
import 'pixi.js';
```

**Vitest Configuration:**
From `packages/openvideo/vitest.config.ts`:
```typescript
export default defineConfig({
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit-chromium',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              {
                browser: 'chromium',
              },
            ],
            headless: true,
          },
          include: ['src/**/*.spec.ts'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
  optimizeDeps: {
    include: [
      'pixi.js',
      'gl-transitions',
      'wrapbox',
      'opfs-tools',
      'microdiff',
      'wave-resampler',
    ],
  },
});
```

## Coverage Gaps

**Untested Areas:**
- Most utility files in `src/utils/` lack dedicated test coverage
- Clip types (Audio, Video, Caption, Placeholder) have no tests
- Effect and Transition rendering
- JSON serialization/deserialization
- Timeline and Transport models
- Selection and history managers

**Risk:** Changes to untested modules may introduce regressions silently

**Test File Locations:**
- `src/studio.spec.ts` - Main integration tests
- `src/studio/resource-manager.spec.ts` - Resource caching and loading

---

*Testing analysis: 2026-02-09*
