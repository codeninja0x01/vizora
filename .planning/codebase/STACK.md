# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- TypeScript 5.9.2 - Core language for entire monorepo
- JavaScript (via TypeScript compilation) - Runtime output

**Secondary:**
- HTML/CSS - Frontend templates and styling

## Runtime

**Environment:**
- Node.js >= 18 (specified in root `package.json`)
- Browser runtime (WebCodecs API via Chromium/Playwright)

**Package Manager:**
- pnpm 9.15.4+ - Monorepo package manager with workspace support
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core UI:**
- Next.js 16.0.7 (editor app) - Server/client rendering framework
- Next.js 16.1.1 (docs app) - Documentation site
- React 19.2.0 - UI component library
- React DOM 19.2.0 - React rendering

**Video Processing:**
- openvideo (workspace package) - Custom video rendering and processing library at `packages/openvideo/src`
- Pixi.js 8.14.3 - WebGL-based 2D rendering
- Fabric.js 6.9.0 - Canvas manipulation for video effects
- WebCodecs API - Native video encoding/decoding

**UI Components:**
- Radix UI (multiple components) - Unstyled, accessible UI primitives
- Tailwind CSS 4 - Utility-first CSS framework
- Lucide React 0.555.0 (editor), 0.562.0 (docs) - Icon library
- Tabler Icons React 3.36.0 - Additional icon set
- Motion 12.23.26 - Animation library

**Documentation:**
- Fumadocs Core 16.4.7 - Documentation framework
- Fumadocs MDX 14.2.5 - Markdown + JSX support
- Fumadocs UI 16.4.7 - Documentation UI components

**AI/Genkit:**
- Genkit 1.28.0 - AI framework from Google
- @genkit-ai/ai 1.28.0 - Core AI module
- @genkit-ai/google-genai 1.28.0 - Google Generative AI integration
- @genkit-ai/next 1.28.0 - Next.js integration

**Testing:**
- Vitest 4.0.18 - Unit test runner
- @vitest/browser 4.0.18 - Browser testing
- @vitest/browser-playwright 4.0.18 - Playwright browser provider
- Playwright 1.49.0 - E2E and browser automation
- JSDOM 27.4.0 - DOM simulation for tests

**Build/Dev:**
- Turbo 2.5.8 - Monorepo build orchestrator
- Vite 7.1.5 - Module bundler (openvideo package)
- Vite Plugin DTS 4.5.4 - TypeScript declaration generation
- PostCSS 8.5.6 - CSS transformation
- Biome 2.2.5 - Linter and formatter (unified tooling)

## Key Dependencies

**Critical:**
- zod 4.1.13 - Runtime type validation
- zustand 5.0.4 - State management
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.4.0 - Tailwind CSS class merging
- react-markdown 10.1.0 - Markdown rendering in React
- remark-gfm 4.0.1 - GitHub-flavored Markdown support

**Video/Media:**
- Pixi.js 8.14.3 - WebGL 2D rendering
- GSAP 3.12.7 - Animation tweening
- gl-transitions 1.43.0 - GLSL-based transitions
- opfs-tools 0.7.2 - Origin Private File System utilities
- wave-resampler 1.0.0 - Audio resampling
- microdiff 1.4.0 - Diffing utility
- wrapbox 0.0.2 - Layout utilities
- Hotkeys.js 4.0.0 - Keyboard shortcuts
- tinyld 1.3.4 - Language detection

**Cloud/Storage:**
- @aws-sdk/client-s3 3.922.0 - AWS S3 client (for Cloudflare R2)
- @aws-sdk/s3-request-presigner 3.946.0 - Presigned URL generation

**Audio:**
- @deepgram/sdk 4.11.2 - Deepgram speech-to-text API
- mediabunny 1.26.0 - Media handling utilities

**Utilities:**
- lodash 4.17.21 - Utility library
- color 5.0.3 - Color manipulation
- mime 4.1.0 - MIME type detection
- next-themes 0.4.6 - Theme provider for Next.js
- sonner 2.0.7 - Toast notifications
- express 4.18.2 (node package) - HTTP server

**Dev-only:**
- @types/react 19.2.8 - React type definitions
- @types/react-dom 19.2.3 - React DOM type definitions
- @types/node 20+, 25.0.5+ - Node.js type definitions
- @types/color 4.2.0 - Color library types
- @types/lodash 4.17.21 - Lodash types
- @types/dom-webcodecs 0.1.17 - WebCodecs types
- @types/express 4.17.21 - Express types
- typescript ~5.9.2 - TypeScript compiler
- @biomejs/biome 2.2.0/2.2.5 - Linting and formatting
- husky 9.1.7 - Git hooks
- lint-staged 16.2.7 - Pre-commit linting
- rollup-plugin-peer-deps-external 2.2.4 - Peer deps handling

## Configuration

**Environment:**
- `.env.sample` (editor app) - Template for required environment variables
- Environment variables sourced via `process.env.*` in code
- Critical configs:
  - Deepgram API (speech-to-text)
  - ElevenLabs API (text-to-speech, sound effects, music)
  - Cloudflare R2 (file storage)
  - Pexels API (stock media)
  - Google Genkit (AI model configuration)

**Build:**
- `tsconfig.json` - TypeScript compilation settings (ES2017 target, strict mode)
- `biome.json` - Unified linter/formatter configuration
- `next.config.ts` (editor), `next.config.mjs` (docs) - Next.js configuration
- `vite.config.ts` (openvideo) - Vite bundler configuration
- `vitest.config.ts` (openvideo) - Vitest test configuration
- `postcss.config.mjs` - PostCSS + Tailwind configuration
- `turbo.json` - Turbo build orchestration (if present)

## Platform Requirements

**Development:**
- Node.js >= 18
- pnpm >= 9.15.4
- Git (for Husky pre-commit hooks)

**Production:**
- Deployment: Next.js on Node.js server or serverless platform (Vercel, etc.)
- Browser: Modern browser with WebCodecs support (Chrome, Edge)
- External services: Deepgram, ElevenLabs, Cloudflare R2, Pexels, Google Generative AI

## Path Aliases

**editor app** (`editor/tsconfig.json`):
- `@/*` → `./src/*`
- `openvideo` → `../packages/openvideo/src/index.ts`

**openvideo package** (`packages/openvideo/vitest.config.ts`):
- `src` → `./src`

## Build Outputs

- `editor/.next/` - Next.js build output
- `docs/.next/` - Documentation build output
- `packages/openvideo/dist/` - Library distribution (ES, UMD modules)
- `packages/node/dist/` - Node.js renderer build

---

*Stack analysis: 2026-02-09*
