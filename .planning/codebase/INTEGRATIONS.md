# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**Speech-to-Text:**
- Deepgram (Nova-3 model) - Audio transcription with word-level timestamps
  - SDK/Client: `@deepgram/sdk` 4.11.2
  - Auth: `DEEPGRAM_API_KEY`
  - Config: `DEEPGRAM_URL` (default: `https://api.deepgram.com/v1`), `DEEPGRAM_MODEL` (default: `nova-3`)
  - Integration: `editor/src/lib/transcribe/index.ts` - Transcribes audio URLs to captions
  - Features: Language detection, smart formatting, paragraph support, word-level timestamps

**Text-to-Speech & Audio Generation:**
- ElevenLabs - Voice synthesis, sound effects, and music generation
  - SDK/Client: Direct fetch (no SDK)
  - Auth: `ELEVENLABS_API_KEY`
  - Config: `ELEVENLABS_URL` (default: `https://api.elevenlabs.io`), `ELEVENLABS_MODEL` (default: `eleven_multilingual_v2`)
  - Endpoints:
    - `/v1/text-to-speech/{voiceId}` - Voiceover generation at `editor/src/app/api/elevenlabs/voiceover/route.ts`
    - `/v1/sound-generation` - Sound effects and music at `editor/src/app/api/elevenlabs/sfx/route.ts` and `/music/route.ts`
  - Integration: Generated audio uploaded to R2 storage after generation
  - Voice Settings: Stability 0.5, Similarity Boost 0.5

**Stock Media Search:**
- Pexels - Image and video asset search
  - SDK/Client: Direct fetch (no SDK)
  - Auth: `PEXELS_API_KEY`
  - Config: `PEXELS_URL` (default: `https://api.pexels.com`)
  - Endpoints:
    - `GET https://api.pexels.com/v1/search` - Search images
    - `GET https://api.pexels.com/v1/curated` - Curated images
    - `GET https://api.pexels.com/videos/search` - Search videos
    - `GET https://api.pexels.com/videos/popular` - Popular videos
  - Integration: `editor/src/app/api/pexels/route.ts` - Proxy endpoint for stock media search
  - Features: Pagination support, type filtering (image/video)

**AI Copilot & Reasoning:**
- Google Generative AI (Gemini 2.5 Flash) - AI assistant for video editing
  - SDK/Client: `@genkit-ai/google-genai` 1.28.0, `genkit` 1.28.0
  - Auth: Implicit via Google Application Credentials or API key
  - Integration: `editor/src/genkit/chat-flow.ts` - Multi-modal AI assistant
  - Capabilities:
    - Video/audio/image analysis (multimodal input)
    - Tool calling for video editing operations
    - Extended thinking with 2000-token budget
    - Streaming responses with reasoning exposure
  - Tools available: Add/remove/update clips, transitions, effects, search media, generate audio, navigation
  - Endpoint: `editor/src/app/api/chat/editor/route.ts` - POST `/api/chat/editor` for streaming AI responses

## Data Storage

**File Storage:**
- Cloudflare R2 (S3-compatible) - Primary storage for media assets
  - Connection: AWS S3 SDK configured with R2 endpoint
  - Client: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Auth:
    - `R2_ACCESS_KEY_ID` - API token access key
    - `R2_SECRET_ACCESS_KEY` - API token secret
    - `R2_ACCOUNT_ID` - Cloudflare account ID for endpoint
  - Bucket: `R2_BUCKET_NAME`
  - CDN URL: `R2_PUBLIC_DOMAIN` - Public URL prefix for assets
  - Endpoint: `https://{accountId}.r2.cloudflarestorage.com`
  - Implementation: `editor/src/lib/r2.ts` - `R2StorageService` class handles:
    - Direct file uploads with presigned URLs
    - JSON data uploads
    - Presigned URL generation for client uploads (3600s default expiry)
    - MIME type detection and handling
  - Storage paths:
    - `voiceovers/{timestamp}.mp3` - Generated voiceovers
    - `music/{timestamp}.mp3` - Generated music
    - `sfx/{timestamp}.mp3` - Generated sound effects

**Databases:**
- Not detected - Application is stateless with serverless architecture

**Caching:**
- Not detected - No explicit caching layer configured

## Authentication & Identity

**Auth Provider:**
- Custom/Multi-provider approach
- Google Genkit implicit auth for AI features
- API key-based authentication for third-party services

## Monitoring & Observability

**Error Tracking:**
- Not detected - Errors logged to console

**Logs:**
- Browser console (frontend)
- Server-side console.error() calls in API routes
- Examples: R2 upload errors, API failures, Deepgram/ElevenLabs failures

## CI/CD & Deployment

**Hosting:**
- Next.js deployment ready (Vercel or Node.js server)
- `packages/node` includes Express-based server for server-side video rendering

**CI Pipeline:**
- Not detected explicitly, but Husky + lint-staged configured for pre-commit hooks
- Git-based workflow with Biome linting enforcement

## Environment Configuration

**Required env vars:**

Editor app (`editor/.env.sample`):
- `DEEPGRAM_URL` - Deepgram API base URL
- `DEEPGRAM_API_KEY` - Deepgram speech-to-text API key
- `DEEPGRAM_MODEL` - Deepgram model (default: nova-3)
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `ELEVENLABS_URL` - ElevenLabs base URL
- `ELEVENLABS_MODEL` - ElevenLabs TTS model (default: eleven_multilingual_v2)
- `R2_BUCKET_NAME` - Cloudflare R2 bucket name
- `R2_ACCESS_KEY_ID` - R2 API key ID
- `R2_SECRET_ACCESS_KEY` - R2 API secret
- `R2_ACCOUNT_ID` - Cloudflare account ID
- `R2_PUBLIC_DOMAIN` - R2 public CDN domain
- `PEXELS_API_KEY` - Pexels stock media API key

**Secrets location:**
- `.env` file (local development)
- Environment variables injected at deployment time (CI/CD, serverless platforms)
- `.env.sample` provides template for configuration

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected - One-directional API calls to external services

## Data Flow

**Video Asset Generation Pipeline:**
1. User requests asset (voiceover, music, SFX)
2. Request sent to Next.js API route (`/api/elevenlabs/*` or `/api/pexels`)
3. API authenticates with external service (ElevenLabs or Pexels)
4. Asset generated or retrieved from external service
5. For ElevenLabs: Audio converted to Buffer and uploaded to R2
6. Public URL returned to frontend for insertion into video
7. User can preview/edit within video editor

**AI-Assisted Editing Pipeline:**
1. User sends message + optional media context to `/api/chat/editor`
2. Genkit processes multimodal input (video, audio, images from project)
3. Google Generative AI (Gemini) analyzes and generates response
4. AI may invoke tools to modify video project (add clips, effects, etc.)
5. Stream responses back to frontend with:
   - Reasoning steps
   - Tool calls and results
   - Final assistant reply
6. Frontend applies changes to video state

**Transcription Pipeline:**
1. Audio URL provided (external URL or R2-hosted)
2. Deepgram transcription request sent
3. Returns captions with word-level timestamps
4. Converted to openvideo caption format
5. Applied to video project

---

*Integration audit: 2026-02-09*
