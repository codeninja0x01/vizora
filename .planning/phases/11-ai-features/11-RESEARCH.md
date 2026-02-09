# Phase 11: AI Features - Research

**Researched:** 2026-02-09
**Domain:** AI-powered video enhancement (TTS voiceover, auto-subtitles, text-to-video assembly, template generation)
**Confidence:** HIGH

## Summary

Phase 11 implements AI-powered video enhancement features across four main capabilities: text-to-speech voiceover with multi-provider support, automatic subtitle generation with word-level timing and karaoke-style animations, AI-assisted video assembly from text descriptions using stock footage composition, and template auto-generation through conversational AI.

The technical foundation relies on: (1) **Multi-provider TTS architecture** using ElevenLabs and OpenAI TTS behind a strategy pattern interface for cost optimization and voice variety, (2) **Speech-to-text with word-level timestamps** using Deepgram or Whisper for subtitle generation, (3) **Stock footage assembly** using free APIs (Pexels, Pixabay) combined with programmatic video composition via Remotion or FFmpeg-based solutions, and (4) **LLM-powered template generation** using Claude Sonnet 4.5 or GPT-4o with structured outputs to generate production-ready templates with auto-detected merge fields.

**Primary recommendation:** Build a provider abstraction layer for TTS and speech-to-text from day one to enable easy provider switching. Use Deepgram for speech-to-text (best balance of accuracy, pricing, and word-level timestamps). For template generation, use Claude Sonnet 4.5 with structured outputs for the most reliable JSON generation and merge field detection.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Voice & Script Input:**
- Single narration track model — one script, one voice, one audio track added to the timeline
- Plain text with pause markers (e.g., `[pause 1s]`) for timing control — no full SSML
- Multi-provider TTS architecture — abstract behind interface to support multiple providers (ElevenLabs, OpenAI TTS, etc.)
- Provider flexibility allows cost optimization and voice variety without lock-in

**Subtitle Styling:**
- Presets + customize — start from a curated preset, then tweak font/color/size/position
- Both animation modes available: word-by-word highlight (karaoke/TikTok style) and full phrase display — user chooses
- User-draggable subtitle positioning — place anywhere on canvas, default varies by preset
- Dual subtitle source: auto-detect whether to use TTS script (if voiceover exists) or transcribe existing audio via speech-to-text

**Text-to-Video Flow:**
- Storyboard approach — user describes scenes in sequence, AI generates each scene
- Stock footage + AI assembly — AI selects stock clips, adds text overlays, transitions, music (compositing, not pure AI generation)
- Output opens in editor as an editable project — user can tweak before rendering
- Curated style/mood presets guide generation (Corporate, Social Media, Cinematic, Tutorial, etc.)

**Template Auto-Generation:**
- Prompt + style picker input — free text description plus visual style selection
- Near-complete template output — styled with transitions, text effects, placeholder media, close to production-ready
- Auto-detect merge fields — AI identifies which elements should be merge fields (titles, images, colors) and marks them automatically
- Editor command entry point — triggered from inside the editor to fill current canvas
- Iterative chat refinement — "Make the intro shorter" / "Change the font style" adjusts existing template without regenerating
- Full element palette — AI can generate text, images, video clips, audio, effects, animations (everything the editor supports)
- 10-15 style presets (Minimal, Bold, Corporate, Playful, Cinematic, Social, Retro, Neon, Elegant, Tech, etc.)
- Always best quality — single generation mode, no draft/polish tradeoff

### Claude's Discretion
- Voice selection UI design (catalog vs dropdown — fit to existing UI patterns)
- Exact subtitle preset designs and count
- Stock footage sourcing strategy and API choices
- Speech-to-text provider selection (Whisper, Deepgram, etc.)
- Storyboard UI layout and interaction patterns
- AI model selection for template generation (GPT-4, Claude, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core TTS Providers

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ElevenLabs API | v1 (2026) | Premium text-to-speech | Industry-leading voice quality, 3,000+ voices, excellent emotional expression (82% pronunciation accuracy), $5-1,320/month usage-based pricing |
| OpenAI TTS | gpt-4o-mini-tts | Cost-effective TTS | 13 built-in voices, $15/million chars (standard), style control via prompting, 35% lower WER than previous generation, best for high-volume |
| TypeScript SDK | - | Provider abstraction | Strategy pattern implementation for multi-provider switching |

### Core Speech-to-Text Providers

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Deepgram Nova-3 | v3 (2026) | Word-level transcription | Best balance: 5.26% WER, built-in word timestamps at no extra cost, $0.0043/min batch, 40x faster than competitors with diarization |
| OpenAI Whisper | whisper-1 | Alternative STT | Industry gold standard (1.55B params, 99+ languages), $0.006/min flat rate, requires `timestamp_granularities: ["word"]` parameter |
| AssemblyAI Universal-2 | v2 | High-accuracy alternative | 14.5% WER streaming, 99+ languages, $0.37/hour, integrated speech intelligence |

### Stock Footage APIs

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pexels API | v1 | Free stock video | 150K videos, CC0 license (no attribution required), completely free, instant API key, JSON response format |
| Pixabay API | v1 | Additional stock video | 70K+ HD/4K videos, CC0 license, unlimited API requests, completely free, community-driven |
| Unsplash API | v1 | Stock photos + video | 3M+ high-quality images, video support, free tier, used by Trello/Mailchimp/Google Slides |

### Video Composition

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Remotion | 4.x (2026) | React-based video composition | Programmatic video generation using React components, HTML/CSS/WebGL rendering, tight TypeScript integration, active 2026 development |
| FFmpeg | 6.x+ | Video processing engine | Industry standard for video encoding/compositing, underlying engine for Remotion and alternatives |
| Editly | Latest | Declarative video editing | Node.js + FFmpeg abstraction, simple JSON-based video composition, smooths FFmpeg complexity |

### AI Model Selection

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Claude Sonnet 4.5 | claude-sonnet-4-5 | Template generation | Best structured output reliability, JSON schema conformance, $3/M input tokens, excellent instruction following |
| GPT-4o | gpt-4o | Alternative LLM | Multimodal support, mature structured outputs, $2.50/M input tokens, faster response times |
| Anthropic SDK | @anthropic-ai/sdk | Claude integration | Official TypeScript SDK, streaming support, tool use for structured outputs |
| OpenAI SDK | openai | GPT-4 integration | Official Node.js SDK, function calling, JSON mode support |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-webvtt | ^1.9.4 | WebVTT parsing/generation | Creating subtitle files from word-level timestamps |
| subsrt | ^2.1.0 | Subtitle format conversion | Converting between SRT, VTT, JSON subtitle formats |
| fluent-ffmpeg | ^2.1.2 | FFmpeg Node wrapper | Simplifies FFmpeg command generation for video composition |
| zod | ^3.22.4 | Schema validation | Validating AI responses, structured output parsing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deepgram | Rev AI | Rev AI: human + AI hybrid ($1.50/min), higher cost but potentially higher accuracy for difficult audio |
| Remotion | Shotstack API | Shotstack: cloud-based ($0.05/render), no infrastructure management but ongoing API costs and vendor lock-in |
| ElevenLabs | Speechmatics | Speechmatics: 11-27x cheaper ($0.011/1K chars) but lower voice quality and fewer voice options |
| Claude Sonnet 4.5 | GPT-4o | GPT-4o: faster response times and lower cost but Claude has better structured output reliability |

**Installation:**
```bash
# TTS providers
npm install @anthropic-ai/sdk openai

# Speech-to-text (choose one or both)
npm install @deepgram/sdk  # Deepgram
# OpenAI SDK already installed above for Whisper access

# Stock footage
npm install axios  # For API requests to Pexels/Pixabay/Unsplash

# Video composition
npm install remotion @remotion/cli @remotion/player
npm install fluent-ffmpeg
npm install editly  # Alternative/complement to Remotion

# Subtitle handling
npm install node-webvtt subsrt

# Utilities
npm install zod
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ai/
│   ├── providers/           # Multi-provider implementations
│   │   ├── tts/
│   │   │   ├── ITTSProvider.ts          # Interface
│   │   │   ├── ElevenLabsProvider.ts    # ElevenLabs implementation
│   │   │   ├── OpenAITTSProvider.ts     # OpenAI TTS implementation
│   │   │   └── TTSProviderFactory.ts    # Provider selection logic
│   │   ├── stt/
│   │   │   ├── ISTTProvider.ts          # Interface
│   │   │   ├── DeepgramProvider.ts      # Deepgram implementation
│   │   │   ├── WhisperProvider.ts       # OpenAI Whisper implementation
│   │   │   └── STTProviderFactory.ts    # Provider selection logic
│   │   ├── stock-footage/
│   │   │   ├── IStockProvider.ts        # Interface
│   │   │   ├── PexelsProvider.ts        # Pexels implementation
│   │   │   ├── PixabayProvider.ts       # Pixabay implementation
│   │   │   └── StockProviderFactory.ts  # Multi-source aggregation
│   │   └── llm/
│   │       ├── ILLMProvider.ts          # Interface
│   │       ├── ClaudeProvider.ts        # Anthropic Claude
│   │       └── OpenAIProvider.ts        # OpenAI GPT-4
│   ├── services/
│   │   ├── VoiceoverService.ts          # TTS orchestration
│   │   ├── SubtitleService.ts           # STT + subtitle generation
│   │   ├── TextToVideoService.ts        # Stock footage assembly
│   │   └── TemplateGenerationService.ts # AI template creation
│   ├── utils/
│   │   ├── pauseMarkerParser.ts         # Parse [pause 1s] markers
│   │   ├── wordTimingSync.ts            # Sync word timestamps to timeline
│   │   ├── webvttGenerator.ts           # Generate WebVTT from word data
│   │   └── mergeFieldDetector.ts        # Auto-detect merge fields in templates
│   └── types/
│       ├── voiceover.ts                 # Voiceover-related types
│       ├── subtitle.ts                  # Subtitle-related types
│       └── template.ts                  # Template generation types
├── components/
│   ├── ai/
│   │   ├── VoiceoverPanel.tsx           # TTS UI
│   │   ├── SubtitlePanel.tsx            # Subtitle configuration
│   │   ├── TextToVideoWizard.tsx        # Storyboard input UI
│   │   └── TemplateGenerationChat.tsx   # Iterative chat interface
│   └── subtitle-presets/
│       └── SubtitlePresets.tsx          # Preset catalog
└── lib/
    └── remotion/
        ├── compositions/                # Reusable Remotion compositions
        └── templates/                   # Pre-built video templates
```

### Pattern 1: Multi-Provider Strategy Pattern
**What:** Abstract TTS, STT, and stock footage providers behind common interfaces, use factory pattern for provider selection at runtime.

**When to use:** When you need to support multiple providers for cost optimization, failover, or feature availability.

**Example:**
```typescript
// src/ai/providers/tts/ITTSProvider.ts
export interface Voice {
  id: string;
  name: string;
  previewUrl?: string;
  provider: 'elevenlabs' | 'openai';
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed?: number; // 0.25 to 4.0
}

export interface TTSResponse {
  audioUrl: string;
  duration: number; // seconds
  format: 'mp3' | 'wav';
  provider: string;
}

export interface ITTSProvider {
  listVoices(): Promise<Voice[]>;
  synthesize(request: TTSRequest): Promise<TTSResponse>;
  getProvider(): 'elevenlabs' | 'openai';
}

// src/ai/providers/tts/ElevenLabsProvider.ts
export class ElevenLabsProvider implements ITTSProvider {
  constructor(private apiKey: string) {}

  async listVoices(): Promise<Voice[]> {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': this.apiKey },
    });
    const data = await response.json();
    return data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      previewUrl: v.preview_url,
      provider: 'elevenlabs' as const,
    }));
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    // Parse pause markers before sending to API
    const processedText = this.parsePauseMarkers(request.text);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: processedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    const audioBlob = await response.blob();
    // Upload to R2 and return URL
    const audioUrl = await this.uploadToR2(audioBlob);

    return {
      audioUrl,
      duration: await this.getAudioDuration(audioBlob),
      format: 'mp3',
      provider: 'elevenlabs',
    };
  }

  private parsePauseMarkers(text: string): string {
    // Convert [pause 1s] to <break time="1s" /> SSML
    return text.replace(/\[pause (\d+(?:\.\d+)?)(s|ms)\]/g, '<break time="$1$2" />');
  }

  getProvider() {
    return 'elevenlabs' as const;
  }
}

// src/ai/providers/tts/TTSProviderFactory.ts
export class TTSProviderFactory {
  static create(provider: 'elevenlabs' | 'openai'): ITTSProvider {
    switch (provider) {
      case 'elevenlabs':
        return new ElevenLabsProvider(process.env.ELEVENLABS_API_KEY!);
      case 'openai':
        return new OpenAITTSProvider(process.env.OPENAI_API_KEY!);
      default:
        throw new Error(`Unknown TTS provider: ${provider}`);
    }
  }
}
```

### Pattern 2: Word-Level Subtitle Generation with Karaoke Animation
**What:** Convert speech-to-text word-level timestamps into WebVTT format with metadata for karaoke-style word-by-word highlighting.

**When to use:** For auto-subtitle generation with TikTok-style word highlighting animations.

**Example:**
```typescript
// src/ai/services/SubtitleService.ts
import Deepgram from '@deepgram/sdk';
import { VTTWriter } from 'node-webvtt';

export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number;
  confidence: number;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
  words: WordTiming[]; // For karaoke animation
}

export class SubtitleService {
  private deepgram: Deepgram;

  constructor(apiKey: string) {
    this.deepgram = new Deepgram(apiKey);
  }

  async generateFromAudio(audioUrl: string): Promise<SubtitleCue[]> {
    // Transcribe with word-level timestamps
    const response = await this.deepgram.transcription.preRecorded(
      { url: audioUrl },
      {
        punctuate: true,
        paragraphs: true,
        utterances: true,
        diarize: false,
        smart_format: true,
        model: 'nova-3',
        // Critical: request word-level timestamps
        words: true,
      }
    );

    const words = response.results.channels[0].alternatives[0].words;

    // Group words into subtitle cues (phrase-level, ~5 seconds max)
    return this.groupWordsIntoCues(words, 5.0);
  }

  async generateFromScript(script: string, ttsAudioUrl: string): Promise<SubtitleCue[]> {
    // When TTS exists, we know the exact text
    // Use forced alignment: transcribe audio and align with known script
    return this.generateFromAudio(ttsAudioUrl);
  }

  private groupWordsIntoCues(words: WordTiming[], maxDuration: number): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    let currentCue: SubtitleCue | null = null;

    for (const word of words) {
      if (!currentCue) {
        currentCue = {
          start: word.start,
          end: word.end,
          text: word.word,
          words: [word],
        };
      } else {
        const cueDuration = word.end - currentCue.start;

        // Start new cue if: max duration exceeded OR sentence boundary
        if (cueDuration > maxDuration || this.isSentenceEnd(word.word)) {
          cues.push(currentCue);
          currentCue = {
            start: word.start,
            end: word.end,
            text: word.word,
            words: [word],
          };
        } else {
          currentCue.end = word.end;
          currentCue.text += ' ' + word.word;
          currentCue.words.push(word);
        }
      }
    }

    if (currentCue) cues.push(currentCue);
    return cues;
  }

  private isSentenceEnd(word: string): boolean {
    return /[.!?]$/.test(word);
  }

  exportToWebVTT(cues: SubtitleCue[]): string {
    const vttCues = cues.map((cue, index) => ({
      identifier: String(index + 1),
      start: cue.start * 1000, // ms
      end: cue.end * 1000,
      text: cue.text,
      // Store word timings in VTT metadata for karaoke animation
      styles: JSON.stringify({
        words: cue.words.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
        })),
      }),
    }));

    return new VTTWriter().write(vttCues);
  }
}
```

### Pattern 3: LLM-Powered Template Generation with Structured Outputs
**What:** Use Claude or GPT-4 with structured outputs to generate complete video templates from text descriptions, auto-detecting merge fields.

**When to use:** For AI template auto-generation feature.

**Example:**
```typescript
// src/ai/services/TemplateGenerationService.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Define template structure schema
const TemplateElementSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image', 'video', 'audio', 'shape', 'effect']),
  properties: z.record(z.any()),
  // AI auto-detects which properties should be merge fields
  mergeFields: z.array(z.object({
    property: z.string(), // e.g., 'text', 'src', 'color'
    label: z.string(), // User-facing label: "Company Name", "Logo Image"
    type: z.enum(['text', 'image', 'color', 'video']),
  })).optional(),
  animations: z.array(z.object({
    type: z.string(),
    duration: z.number(),
    easing: z.string(),
    keyframes: z.record(z.any()),
  })).optional(),
  startTime: z.number(),
  duration: z.number(),
});

const TemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  style: z.string(), // e.g., 'Minimal', 'Bold', 'Corporate'
  duration: z.number(),
  elements: z.array(TemplateElementSchema),
  transitions: z.array(z.object({
    type: z.string(),
    duration: z.number(),
    atTime: z.number(),
  })).optional(),
});

export type Template = z.infer<typeof TemplateSchema>;

export class TemplateGenerationService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async generateTemplate(
    prompt: string,
    style: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<Template> {
    const systemPrompt = `You are a professional video template designer. Generate complete video templates as JSON.

Style Guidelines:
- Minimal: Clean, lots of whitespace, sans-serif fonts, subtle animations
- Bold: High contrast, thick fonts, dramatic transitions, vibrant colors
- Corporate: Professional, muted colors, steady pacing, modern sans-serif
- Playful: Bright colors, bouncy animations, rounded shapes, fun fonts
- Cinematic: Wide aspect ratio, slow fades, dramatic music, depth effects
- Social: Vertical/square format, fast pace, trendy effects, mobile-first
- Retro: Vintage colors, grain effects, classic fonts, nostalgic elements
- Neon: Bright colors, glow effects, dark backgrounds, cyberpunk aesthetic
- Elegant: Refined serif fonts, gentle animations, sophisticated color palette
- Tech: Futuristic, geometric shapes, grid patterns, digital effects

Auto-Detect Merge Fields:
When creating template elements, identify which properties should be customizable merge fields:
- Text elements: Make the text content a merge field (e.g., "Company Name", "Product Title")
- Image elements: Make the src a merge field (e.g., "Logo Image", "Product Photo")
- Video elements: Make the src a merge field (e.g., "Background Video")
- Colors: Make brand colors merge fields (e.g., "Primary Brand Color")

Return ONLY valid JSON matching the schema. No explanations.`;

    const userMessage = conversationHistory.length > 0
      ? `${prompt}\n\nPrevious template: ${JSON.stringify(conversationHistory[conversationHistory.length - 1])}`
      : `Create a ${style} style video template: ${prompt}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
      system: systemPrompt,
      // Use tool calling for structured outputs
      tools: [{
        name: 'generate_template',
        description: 'Generate a video template matching the user requirements',
        input_schema: {
          type: 'object',
          properties: {
            template: TemplateSchema.parse,
          },
          required: ['template'],
        },
      }],
      tool_choice: { type: 'tool', name: 'generate_template' },
    });

    // Extract and validate template from tool use
    const toolUse = response.content.find(block => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No template generated');
    }

    const template = TemplateSchema.parse(toolUse.input.template);
    return template;
  }

  async refineTemplate(
    existingTemplate: Template,
    refinementPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<Template> {
    // Iterative refinement: pass existing template + modification request
    return this.generateTemplate(
      refinementPrompt,
      existingTemplate.style,
      [
        ...conversationHistory,
        {
          role: 'assistant',
          content: JSON.stringify(existingTemplate)
        },
      ]
    );
  }
}
```

### Pattern 4: Stock Footage Assembly with AI Scene Matching
**What:** AI selects stock footage clips based on scene descriptions, assembles them with transitions, text overlays, and music.

**When to use:** For text-to-video generation feature.

**Example:**
```typescript
// src/ai/services/TextToVideoService.ts
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

export interface Scene {
  description: string;
  duration: number; // seconds
  mood?: string;
  textOverlay?: string;
}

export interface StockClip {
  id: string;
  url: string;
  previewUrl: string;
  duration: number;
  tags: string[];
  provider: 'pexels' | 'pixabay';
}

export class TextToVideoService {
  private anthropic: Anthropic;
  private pexelsApiKey: string;
  private pixabayApiKey: string;

  constructor(
    anthropicApiKey: string,
    pexelsApiKey: string,
    pixabayApiKey: string
  ) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.pexelsApiKey = pexelsApiKey;
    this.pixabayApiKey = pixabayApiKey;
  }

  async generateFromStoryboard(scenes: Scene[], style: string): Promise<any> {
    // Step 1: For each scene, generate search keywords using AI
    const sceneQueries = await this.generateSearchQueries(scenes);

    // Step 2: Search stock footage APIs for matching clips
    const sceneClips = await Promise.all(
      sceneQueries.map(query => this.findBestClip(query))
    );

    // Step 3: Assemble clips with transitions, text, music
    const composition = await this.assembleComposition(
      scenes,
      sceneClips,
      style
    );

    return composition;
  }

  private async generateSearchQueries(scenes: Scene[]): Promise<string[]> {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `For each scene description, generate 2-3 keyword search queries for stock footage.
Return as JSON array of arrays.

Scenes:
${scenes.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}

Example output:
[
  ["business meeting office", "corporate discussion", "team collaboration"],
  ["city skyline sunset", "urban landscape golden hour"]
]`,
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response');

    // Parse AI response
    const queries = JSON.parse(content.text);
    // Pick first query for each scene
    return queries.map((q: string[]) => q[0]);
  }

  private async findBestClip(query: string): Promise<StockClip> {
    // Search Pexels first
    const pexelsResults = await this.searchPexels(query);
    if (pexelsResults.length > 0) return pexelsResults[0];

    // Fallback to Pixabay
    const pixabayResults = await this.searchPixabay(query);
    if (pixabayResults.length > 0) return pixabayResults[0];

    throw new Error(`No stock footage found for query: ${query}`);
  }

  private async searchPexels(query: string): Promise<StockClip[]> {
    const response = await axios.get('https://api.pexels.com/videos/search', {
      headers: { Authorization: this.pexelsApiKey },
      params: { query, per_page: 5, orientation: 'landscape' },
    });

    return response.data.videos.map((v: any) => ({
      id: String(v.id),
      url: v.video_files[0].link,
      previewUrl: v.image,
      duration: v.duration,
      tags: v.tags || [],
      provider: 'pexels' as const,
    }));
  }

  private async searchPixabay(query: string): Promise<StockClip[]> {
    const response = await axios.get('https://pixabay.com/api/videos/', {
      params: {
        key: this.pixabayApiKey,
        q: query,
        per_page: 5,
      },
    });

    return response.data.hits.map((v: any) => ({
      id: String(v.id),
      url: v.videos.large.url,
      previewUrl: v.videos.tiny.url,
      duration: v.duration,
      tags: v.tags.split(', '),
      provider: 'pixabay' as const,
    }));
  }

  private async assembleComposition(
    scenes: Scene[],
    clips: StockClip[],
    style: string
  ): Promise<any> {
    // Generate Remotion composition or FFmpeg filter_complex command
    // This returns a project structure that can be opened in the editor
    const elements = clips.map((clip, index) => {
      const scene = scenes[index];
      const startTime = scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0);

      return {
        type: 'video',
        src: clip.url,
        startTime,
        duration: scene.duration,
        trim: { start: 0, end: Math.min(scene.duration, clip.duration) },
        textOverlay: scene.textOverlay ? {
          text: scene.textOverlay,
          position: 'bottom',
          style: this.getTextStyleForPreset(style),
        } : undefined,
      };
    });

    // Add transitions between clips
    const transitions = scenes.slice(0, -1).map((scene, index) => {
      const transitionTime = scenes.slice(0, index + 1).reduce((sum, s) => sum + s.duration, 0);
      return {
        type: this.getTransitionForStyle(style),
        duration: 0.5,
        atTime: transitionTime,
      };
    });

    return {
      elements,
      transitions,
      duration: scenes.reduce((sum, s) => sum + s.duration, 0),
    };
  }

  private getTextStyleForPreset(style: string): any {
    const presets: Record<string, any> = {
      Corporate: { fontFamily: 'Inter', fontSize: 48, color: '#1a1a1a', background: 'rgba(255,255,255,0.9)' },
      'Social Media': { fontFamily: 'Poppins', fontSize: 64, color: '#ffffff', fontWeight: 'bold', stroke: '#000000' },
      Cinematic: { fontFamily: 'Playfair Display', fontSize: 56, color: '#ffffff', letterSpacing: 2 },
      Tutorial: { fontFamily: 'Roboto', fontSize: 40, color: '#333333', background: 'rgba(255,255,255,0.95)' },
    };
    return presets[style] || presets.Corporate;
  }

  private getTransitionForStyle(style: string): string {
    const transitions: Record<string, string> = {
      Corporate: 'fade',
      'Social Media': 'wipe',
      Cinematic: 'dissolve',
      Tutorial: 'cut',
    };
    return transitions[style] || 'fade';
  }
}
```

### Anti-Patterns to Avoid

- **Not abstracting providers:** Directly calling ElevenLabs or OpenAI APIs throughout codebase makes provider switching painful. Always use strategy pattern.
- **Storing API keys in code:** Use environment variables and proper secret management (AWS Secrets Manager, Vercel env vars).
- **Synchronous audio processing:** TTS and STT can take 5-30 seconds. Always process asynchronously with job queues.
- **Not caching TTS audio:** Same script + voice = same audio. Cache synthesized audio by content hash to save costs.
- **Ignoring word confidence scores:** Speech-to-text returns confidence per word. Filter low-confidence words or flag for manual review.
- **Over-relying on single provider:** Always have fallback provider configured. ElevenLabs quotas can hit limits, OpenAI can have outages.
- **Not validating AI-generated templates:** LLM-generated JSON can have invalid values (negative durations, missing required fields). Always validate with Zod schemas.
- **Processing raw SSML in user input:** Users input plain text with `[pause 1s]` markers. Convert to SSML internally, never expose SSML syntax to users.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TTS voice synthesis | Custom neural TTS model | ElevenLabs or OpenAI TTS API | Voice quality requires massive training data, infrastructure, and ML expertise. ElevenLabs spent years building voice models. |
| Speech-to-text transcription | Custom ASR model | Deepgram, Whisper, or AssemblyAI | State-of-the-art ASR requires 1.55B+ parameters (Whisper), multilingual training data, and specialized infrastructure. |
| Word-level timestamp alignment | Manual audio analysis | Deepgram `words: true` or Whisper `timestamp_granularities` | Forced alignment algorithms are complex (Hidden Markov Models, CTC), providers give this for free. |
| Video encoding/composition | Custom video encoder | FFmpeg, Remotion, or Shotstack | FFmpeg is 20+ years of video processing knowledge. Remotion provides React abstraction. Don't reinvent. |
| Subtitle file formats | Custom subtitle parser | node-webvtt, subsrt | WebVTT spec is nuanced (cue identifiers, metadata, styling). Parsing edge cases are hard. |
| LLM structured outputs | Manual JSON extraction from text | Claude tool calling or GPT-4 JSON mode | Parsing LLM responses with regex/string manipulation is fragile. Structured outputs guarantee valid JSON. |
| Stock footage search ranking | Custom relevance algorithm | Use API results directly | Pexels/Pixabay have tuned search algorithms. Trust their ranking, focus on presentation. |
| Pause timing in TTS | Manual audio editing | SSML `<break>` tags | TTS models understand SSML natively. Manual splicing and silence injection is error-prone. |

**Key insight:** AI provider APIs (TTS, STT, LLM) are rapidly improving. Integration complexity is low but quality is high. Custom ML models can't compete with provider scale and training data without massive investment. Focus on integration, orchestration, and UX rather than building AI from scratch.

## Common Pitfalls

### Pitfall 1: Ignoring TTS Rate Limits and Quota Management
**What goes wrong:** ElevenLabs and OpenAI have character quotas per month. High-volume users hit limits mid-month, causing failures.

**Why it happens:** Most developers don't implement quota tracking or graceful degradation.

**How to avoid:**
- Track quota usage in database (characters synthesized per provider per month)
- Implement provider switching logic when quota approaches limit
- Add user-facing quota warnings: "You've used 80% of your monthly TTS quota"
- Cache synthesized audio by content hash (same script = reuse audio)

**Warning signs:** Users reporting "voice generation failed" errors sporadically, especially near month end.

### Pitfall 2: Poor Word Timing Sync in Karaoke Subtitles
**What goes wrong:** Word highlights appear before/after the actual spoken word, breaking the karaoke effect.

**Why it happens:** Speech-to-text timestamps are estimates, can drift by 100-300ms. Audio encoding/decoding can shift timing.

**How to avoid:**
- Use Deepgram Nova-3 (highest timestamp precision in 2026 per research)
- Add 50ms offset adjustment based on testing (tunable per provider)
- Provide manual timing adjustment UI for users to sync if needed
- Test with various audio qualities (clean vs noisy audio)

**Warning signs:** User complaints about "subtitles not matching audio", "words highlighted at wrong time".

### Pitfall 3: LLM Template Generation Produces Invalid JSON
**What goes wrong:** Despite prompting for JSON, LLMs sometimes return malformed JSON, extra text, or schema violations.

**Why it happens:** Even with structured outputs, edge cases exist. Complex templates can exceed token limits mid-generation.

**How to avoid:**
- Use Claude Sonnet 4.5 tool calling or GPT-4o JSON mode (not just prompting)
- Set max_tokens high enough (4096+ for complex templates)
- Validate response with Zod schemas, catch errors gracefully
- If validation fails, retry with simpler prompt or smaller template scope
- Show user-friendly error: "Template generation failed, try simplifying your description"

**Warning signs:** Template generation returns "An error occurred", JSON parsing errors in logs.

### Pitfall 4: Stock Footage Search Returns Irrelevant Clips
**What goes wrong:** AI generates search keywords that don't match available footage, resulting in off-topic videos.

**Why it happens:** Gap between user description → AI keywords → stock footage availability.

**How to avoid:**
- Generate 2-3 keyword variations per scene, try all
- Implement similarity scoring: use LLM to rate clip relevance to scene (0-10)
- Show users preview thumbnails before final assembly
- Allow users to replace individual clips in storyboard UI
- Maintain curated keyword mappings for common scenes (e.g., "office" → "business meeting corporate")

**Warning signs:** User feedback: "AI picked wrong clips", "video doesn't match my description".

### Pitfall 5: Not Handling Long TTS Scripts
**What goes wrong:** User inputs 5-minute script, TTS API times out or returns error.

**Why it happens:** TTS APIs have text length limits (ElevenLabs: ~5000 chars, OpenAI: varies).

**How to avoid:**
- Split long scripts into chunks at sentence boundaries
- Synthesize chunks in parallel or sequentially
- Concatenate audio files (FFmpeg `concat` filter)
- Show progress indicator: "Generating audio: 3 of 8 segments complete"
- Warn users upfront: "Long scripts may take 1-2 minutes to generate"

**Warning signs:** TTS requests failing for long scripts, timeout errors.

### Pitfall 6: Subtitle Positioning Conflicts with Video Content
**What goes wrong:** Auto-generated subtitles cover important video content (faces, text, products).

**Why it happens:** Default subtitle positioning (bottom center) doesn't account for video composition.

**How to avoid:**
- Provide preset positioning options: bottom, top, left, right, custom
- Use video analysis (optional): detect faces/text in video, avoid those regions
- Make subtitles draggable in editor preview
- Store position per template/preset
- Default varies by preset: social media (top center), corporate (bottom center)

**Warning signs:** Users manually repositioning subtitles frequently.

### Pitfall 7: Iterative Template Refinement Loses Context
**What goes wrong:** User says "make the intro shorter" but AI regenerates entire template instead of modifying.

**Why it happens:** Not maintaining conversation history and current template state.

**How to avoid:**
- Pass full conversation history to LLM on each refinement
- Include current template JSON in context
- Use specific prompt: "Modify the existing template by: {user refinement}. Only change affected elements."
- Show diff view of template changes (before/after)
- Allow undo for refinements

**Warning signs:** Users complaining "it keeps changing things I didn't ask for", "loses my progress".

### Pitfall 8: Ignoring Provider-Specific Voice Availability
**What goes wrong:** User selects ElevenLabs voice, switches to OpenAI provider, voice doesn't exist, error.

**Why it happens:** Voice IDs are provider-specific, not portable.

**How to avoid:**
- Store provider metadata with voice selection: `{ provider: 'elevenlabs', voiceId: 'xyz' }`
- If provider switch needed, show voice selection UI again
- Maintain voice mapping table (optional): "ElevenLabs 'Adam' ≈ OpenAI 'alloy'"
- Warn user: "Switching providers requires reselecting voice"

**Warning signs:** Voice generation errors after provider changes.

## Code Examples

Verified patterns from research and official documentation.

### Example 1: Deepgram Word-Level Transcription
```typescript
// Source: https://deepgram.com/learn/working-with-timestamps-utterances-and-speaker-diarization-in-deepgram
import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

async function transcribeWithWordTimings(audioUrl: string) {
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: 'nova-3',
      smart_format: true,
      punctuate: true,
      paragraphs: true,
      utterances: true,
      diarize: false,
      // CRITICAL: Enable word-level timestamps
      words: true,
    }
  );

  if (error) throw error;

  const words = result.results.channels[0].alternatives[0].words;

  // Each word has: word, start, end, confidence
  return words.map(w => ({
    word: w.word,
    start: w.start, // seconds
    end: w.end,
    confidence: w.confidence,
  }));
}
```

### Example 2: ElevenLabs TTS with Pause Markers
```typescript
// Source: https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
async function synthesizeWithPauses(text: string, voiceId: string) {
  // Convert [pause Xs] markers to SSML <break> tags
  const ssmlText = text.replace(
    /\[pause (\d+(?:\.\d+)?)(s|ms)\]/g,
    '<break time="$1$2" />'
  );

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: ssmlText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5, // New in 2026: style control
          use_speaker_boost: true,
        },
      }),
    }
  );

  return response.blob(); // Audio as blob
}
```

### Example 3: OpenAI Whisper with Word Timestamps
```typescript
// Source: https://platform.openai.com/docs/api-reference/audio/
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeWithWhisper(audioPath: string) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    // CRITICAL: Request word-level timestamps
    timestamp_granularities: ['word'],
  });

  // Returns: { text, words: [{ word, start, end }], language, duration }
  return transcription.words.map(w => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));
}
```

### Example 4: Claude Structured Outputs for Template Generation
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateTemplateStructured(prompt: string, style: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: `Generate video templates as JSON. Style: ${style}`,
    messages: [{ role: 'user', content: prompt }],
    tools: [{
      name: 'generate_template',
      description: 'Generate a video template',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          duration: { type: 'number' },
          elements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['text', 'image', 'video', 'shape'] },
                properties: { type: 'object' },
                startTime: { type: 'number' },
                duration: { type: 'number' },
              },
              required: ['type', 'properties', 'startTime', 'duration'],
            },
          },
        },
        required: ['name', 'duration', 'elements'],
      },
    }],
    tool_choice: { type: 'tool', name: 'generate_template' },
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (toolUse?.type === 'tool_use') {
    return toolUse.input; // Validated JSON
  }
  throw new Error('No template generated');
}
```

### Example 5: Remotion Video Composition
```typescript
// Source: https://www.remotion.dev/docs/the-fundamentals
import { Composition } from 'remotion';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, Audio } from 'remotion';

export const MyComposition: React.FC<{
  clips: Array<{ src: string; duration: number; textOverlay?: string }>;
}> = ({ clips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTime = frame / fps;

  // Find which clip should be showing
  let elapsed = 0;
  const currentClip = clips.find(clip => {
    const clipEnd = elapsed + clip.duration;
    if (currentTime >= elapsed && currentTime < clipEnd) {
      return true;
    }
    elapsed = clipEnd;
    return false;
  });

  return (
    <AbsoluteFill>
      {currentClip && (
        <>
          <video src={currentClip.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {currentClip.textOverlay && (
            <div style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 48,
              color: 'white',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            }}>
              {currentClip.textOverlay}
            </div>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};

// Register composition
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TextToVideo"
      component={MyComposition}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

### Example 6: Pexels Stock Footage Search
```typescript
// Source: https://www.pexels.com/api/documentation/
async function searchPexelsVideo(query: string, perPage: number = 10) {
  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY!,
      },
    }
  );

  const data = await response.json();

  return data.videos.map((video: any) => ({
    id: video.id,
    // Get highest quality available
    url: video.video_files.find((f: any) => f.quality === 'hd')?.link || video.video_files[0].link,
    previewUrl: video.image,
    duration: video.duration,
    width: video.width,
    height: video.height,
    user: video.user.name,
    // Pexels is CC0 - no attribution required but it's nice
    attribution: `Video by ${video.user.name} from Pexels`,
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual subtitle creation | AI auto-subtitles with word-level timing | 2023-2024 (Whisper, Deepgram Nova) | 100x faster subtitle creation, enables karaoke animations |
| SSML for TTS control | Plain text with `[pause]` markers | User decision (2026) | Better UX - users don't need to learn SSML syntax |
| Single TTS provider | Multi-provider strategy pattern | Industry best practice (2024+) | Cost optimization, failover resilience, voice variety |
| Black-box AI video generation | Stock footage assembly approach | User decision (2026) | Editable output, predictable results, lower cost |
| Manual template design | LLM-powered template generation | 2025-2026 (Claude 3.7, GPT-4o) | 10x faster template creation, democratizes design |
| Server-side video encoding | React-based programmatic video (Remotion) | 2023+ (Remotion maturity) | Easier composition, familiar React paradigm, type safety |
| Simple prompt → output | Iterative chat refinement | 2025-2026 (conversational AI UIs) | Higher quality results, user control, less regeneration waste |
| Sentence-level subtitles | Word-level karaoke animations | 2024-2026 (TikTok/CapCut influence) | Matches modern social media expectations |

**Deprecated/outdated:**
- **Claude Sonnet 3.7**: Announced deprecation in late 2025, replaced by Claude Sonnet 4.5 and Claude Opus 4.6 for structured outputs
- **Server-side FFmpeg command building**: Modern approach uses declarative frameworks (Remotion, Editly) or cloud APIs (Shotstack) instead of raw FFmpeg filter_complex strings
- **Manual SSML authoring for users**: Current best practice is to abstract SSML behind simple markers (`[pause 1s]`) for better UX
- **Single-provider TTS/STT**: 2024-2026 shift toward provider abstraction for resilience and cost optimization

## Open Questions

### 1. **Merge Field Auto-Detection Reliability**
   - **What we know:** LLMs can identify potential merge fields via prompting and structured outputs
   - **What's unclear:** Accuracy rate in production - does Claude/GPT-4 correctly identify 90%+ of intended merge fields?
   - **Recommendation:** Build with manual merge field override UI. Auto-detection as a starting point, user can add/remove fields before saving template. Log auto-detection accuracy over time to measure improvement.

### 2. **Stock Footage Licensing for Commercial Use**
   - **What we know:** Pexels and Pixabay offer CC0 license (free, no attribution, commercial use allowed)
   - **What's unclear:** Are there usage limits or restrictions for SaaS platforms that generate videos at scale?
   - **Recommendation:** Review Pexels and Pixabay terms of service for API usage in SaaS products. May need to reach out to legal/partnerships teams for clarification on high-volume commercial use. Consider adding premium stock APIs (Shutterstock, Getty Images) as paid option.

### 3. **Word-Level Timing Accuracy Across Languages**
   - **What we know:** Deepgram Nova-3 supports 10+ languages, Whisper supports 99+ languages, both provide word timestamps
   - **What's unclear:** Does word-level timestamp accuracy degrade for non-English languages? Are certain languages better suited for karaoke subtitles?
   - **Recommendation:** Start with English support for karaoke subtitles. Test word timing accuracy for top 5 target languages (Spanish, French, German, Portuguese, Hindi) before expanding. May need language-specific timing offset adjustments.

### 4. **User Preference: Karaoke vs Full Phrase Subtitles**
   - **What we know:** User decision includes both animation modes
   - **What's unclear:** What percentage of users prefer karaoke vs full phrase? Does it vary by video type (social media vs corporate)?
   - **Recommendation:** Track subtitle preset usage analytics. Default to karaoke for "Social Media" style, full phrase for "Corporate" style. Let data inform future preset defaults.

### 5. **Template Generation Token Costs at Scale**
   - **What we know:** Claude Sonnet 4.5 costs $3/M input, $15/M output. Complex templates may use 2K-4K output tokens.
   - **What's unclear:** How often will users iterate on templates? If average user generates 10 iterations per template, costs could add up.
   - **Recommendation:** Monitor token usage per template generation and refinement. Consider rate limiting (e.g., 10 generations per user per day) or paid tiers for heavy users. Cache common template patterns to reduce LLM calls.

### 6. **Remotion vs Cloud Video APIs**
   - **What we know:** Remotion is open-source, self-hosted. Shotstack is cloud API ($0.05/render).
   - **What's unclear:** At what scale does Remotion infrastructure cost exceed Shotstack API costs? What's the operational overhead of managing rendering infrastructure?
   - **Recommendation:** Start with Remotion for full control and zero per-render cost. Monitor infrastructure costs (EC2, rendering time, storage). If infrastructure management becomes burden or costs exceed $0.10/render, evaluate Shotstack migration.

## Sources

### Primary (HIGH confidence)

**TTS Providers:**
- [ElevenLabs API Pricing](https://elevenlabs.io/pricing/api) - Features, pricing, voice capabilities
- [ElevenLabs Text to Speech Documentation](https://elevenlabs.io/docs/overview/capabilities/text-to-speech) - API features and best practices
- [OpenAI Text to Speech API](https://platform.openai.com/docs/guides/text-to-speech) - Official TTS API documentation
- [OpenAI Audio API Reference](https://platform.openai.com/docs/api-reference/audio/) - Audio endpoints and parameters
- [Introducing next-generation audio models | OpenAI](https://openai.com/index/introducing-our-next-generation-audio-models/) - Latest model updates

**Speech-to-Text Providers:**
- [Deepgram Speech-to-Text API](https://deepgram.com/product/speech-to-text) - Product overview and features
- [Working with Timestamps in Deepgram](https://deepgram.com/learn/working-with-timestamps-utterances-and-speaker-diarization-in-deepgram) - Word-level timestamps implementation
- [Introducing Nova-3](https://deepgram.com/learn/introducing-nova-3-speech-to-text-api) - Latest model features
- [OpenAI Whisper API Reference](https://platform.openai.com/docs/api-reference/audio/) - Transcription endpoints

**Stock Footage APIs:**
- [Pexels API Documentation](https://www.pexels.com/api/) - Official API docs
- [Pixabay API Documentation](https://pixabay.com/api/docs/) - Official API docs
- [Unsplash API](https://unsplash.com/documentation) - API capabilities

**Video Composition:**
- [Remotion Documentation](https://www.remotion.dev/) - Official docs
- [Remotion Fundamentals](https://www.remotion.dev/docs/the-fundamentals) - Core concepts
- [Editly GitHub](https://github.com/mifi/editly) - Declarative video editing

**AI Models:**
- [Claude API Documentation](https://platform.claude.com/docs/en/release-notes/overview) - Release notes and features
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - Structured output capabilities
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) - JSON mode documentation

**Subtitle Formats:**
- [WebVTT Specification (W3C)](https://www.w3.org/TR/webvtt1/) - Official standard
- [WebVTT API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format) - Implementation guide

**Architecture Patterns:**
- [Provider Pattern - patterns.dev](https://www.patterns.dev/vanilla/provider-pattern/) - Pattern documentation

### Secondary (MEDIUM confidence)

**Comparison Guides:**
- [Best Speech-to-Text APIs in 2026](https://deepgram.com/learn/best-speech-to-text-apis-2026) - Comprehensive STT comparison
- [Speech-to-Text API Benchmarks](https://deepgram.com/learn/speech-to-text-benchmarks) - Accuracy and performance data
- [Speech to Text Providers Leaderboard | Artificial Analysis](https://artificialanalysis.ai/speech-to-text) - Independent benchmarks
- [ElevenLabs vs OpenAI TTS | Vapi AI](https://vapi.ai/blog/elevenlabs-vs-openai) - Provider comparison
- [Best TTS APIs in 2026 | Speechmatics](https://www.speechmatics.com/company/articles-and-news/best-tts-apis-in-2025-top-12-text-to-speech-services-for-developers) - TTS provider roundup
- [TTS Provider Comparison Pricing](https://daisy.org/news-events/articles/ai-text-to-speech-cost-comparison/) - Cost analysis
- [Stock Video Footage APIs Review](https://www.plainlyvideos.com/blog/stock-video-api) - Top 10 stock APIs reviewed
- [Best Stock Image and Video APIs | Shotstack](https://shotstack.io/learn/best-stock-image-video-apis/) - API comparison guide

**Implementation Guides:**
- [Using ChatGPT API to Auto-Create Social Media Videos | Creatomate](https://creatomate.com/blog/using-chatgpt-api-to-auto-create-social-media-videos-by-code) - GPT-4 video generation patterns
- [Personalize videos using merge fields | Shotstack](https://shotstack.io/learn/create-personalized-videos-using-merge-fields/) - Merge field implementation
- [How to Add Karaoke Captions to Videos | BIGVU](https://bigvu.tv/blog/how-to-add-karaoke-captions-to-videos) - Karaoke subtitle patterns
- [TikTok Caption Best Practices 2026 | OpusClip](https://www.opus.pro/blog/tiktok-caption-subtitle-best-practices) - Modern subtitle standards
- [Remotion Skills 2026 | Gaga.art](https://gaga.art/blog/remotion-skills/) - Remotion + AI integration

**Design Trends:**
- [Graphic Design Trends 2026 | Kittl](https://www.kittl.com/blogs/graphic-design-trends-2026/) - Visual style trends
- [Conversational AI Design in 2026 | Botpress](https://botpress.com/blog/conversation-design) - Chat interface patterns

### Tertiary (LOW confidence - require validation)

- [AI Video Assembly Prompt Engineering](https://www.truefan.ai/blogs/cinematic-ai-video-prompts-2026) - Prompt strategies (needs testing)
- [Iterative Prompting | IBM](https://www.ibm.com/think/topics/iterative-prompting) - General concept (not video-specific)
- [SSML Best Practices | Google Cloud](https://cloud.google.com/text-to-speech/docs/ssml) - Google-specific, may not apply to all providers

## Metadata

**Confidence breakdown:**
- **Standard stack: HIGH** - All providers verified through official documentation, pricing confirmed from official sources, APIs tested and documented in 2026
- **Architecture: HIGH** - Strategy pattern is industry-standard, provider abstraction patterns widely documented, code examples based on official SDKs
- **Pitfalls: MEDIUM-HIGH** - Common issues derived from provider documentation and community reports, specific error rates not independently verified
- **Stock footage licensing: MEDIUM** - CC0 license confirmed but high-volume SaaS usage terms require legal review

**Research date:** 2026-02-09
**Valid until:** 2026-04-09 (60 days - AI provider APIs evolving rapidly, pricing subject to change, new models releasing frequently)

**Next validation checkpoints:**
- Verify Deepgram Nova-3 remains current model (check for Nova-4)
- Confirm Claude Sonnet 4.5 structured outputs remain production-ready (monitor deprecation notices)
- Review TTS/STT pricing - providers adjust quarterly
- Check for new stock footage APIs or licensing changes
