import Anthropic from '@anthropic-ai/sdk';
import { IClip, ITimelineTrack } from '@/types/timeline';
import {
  detectMergeFields,
  type MergeFieldSuggestion,
} from '@/lib/ai/utils/merge-field-detector';

/**
 * Generated template result with merge field suggestions and conversation history
 */
export interface GeneratedTemplate {
  template: any;
  mergeFields: MergeFieldSuggestion[];
  conversationHistory: Anthropic.MessageParam[];
}

/**
 * Template element schema for Claude tool calling
 */
const TOOL_SCHEMA: Anthropic.Tool = {
  name: 'generate_template',
  description: 'Generate a video template as structured JSON',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Template name' },
      description: { type: 'string', description: 'Template description' },
      duration: { type: 'number', description: 'Total duration in seconds' },
      settings: {
        type: 'object',
        properties: {
          width: { type: 'number', description: 'Video width in pixels' },
          height: { type: 'number', description: 'Video height in pixels' },
          fps: { type: 'number', description: 'Frames per second (30 or 60)' },
          backgroundColor: {
            type: 'string',
            description: 'Background color hex',
          },
        },
        required: ['width', 'height', 'fps'],
      },
      tracks: {
        type: 'array',
        description: 'Timeline tracks for organizing clips',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: {
              type: 'string',
              enum: ['Video', 'Audio', 'Image', 'Text', 'Caption', 'Effect'],
            },
            clipIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'name', 'type', 'clipIds'],
        },
      },
      clips: {
        type: 'array',
        description: 'Timeline clips/elements',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['Text', 'Image', 'Video', 'Audio', 'Caption'],
            },
            name: { type: 'string' },
            text: {
              type: 'string',
              description: 'Text content for Text/Caption types',
            },
            src: {
              type: 'string',
              description: 'Media source URL for Image/Video/Audio',
            },
            display: {
              type: 'object',
              properties: {
                from: {
                  type: 'number',
                  description: 'Start time in microseconds',
                },
                to: { type: 'number', description: 'End time in microseconds' },
              },
              required: ['from', 'to'],
            },
            duration: {
              type: 'number',
              description: 'Duration in microseconds',
            },
            left: { type: 'number', description: 'X position (0-100%)' },
            top: { type: 'number', description: 'Y position (0-100%)' },
            width: { type: 'number', description: 'Width (0-100%)' },
            height: { type: 'number', description: 'Height (0-100%)' },
            zIndex: { type: 'number', description: 'Layer order' },
            opacity: { type: 'number', description: 'Opacity 0-1' },
            style: {
              type: 'object',
              description:
                'Element styling (fontSize, fontFamily, color, etc.)',
            },
            animation: {
              type: 'object',
              description: 'Animation settings',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'fadeIn',
                    'fadeOut',
                    'slideInLeft',
                    'slideInRight',
                    'slideInUp',
                    'slideInDown',
                    'scaleIn',
                    'scaleOut',
                    'rotateIn',
                  ],
                },
                duration: {
                  type: 'number',
                  description: 'Animation duration in ms',
                },
                easing: {
                  type: 'string',
                  enum: [
                    'linear',
                    'ease',
                    'ease-in',
                    'ease-out',
                    'ease-in-out',
                  ],
                },
              },
            },
          },
          required: ['id', 'type', 'name', 'display', 'duration'],
        },
      },
      transitions: {
        type: 'array',
        description: 'Scene transitions',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['fade', 'dissolve', 'wipe', 'slide'],
            },
            duration: {
              type: 'number',
              description: 'Transition duration in ms',
            },
            atTime: {
              type: 'number',
              description: 'Time in microseconds when transition starts',
            },
          },
          required: ['type', 'duration', 'atTime'],
        },
      },
    },
    required: ['name', 'description', 'duration', 'tracks', 'clips'],
  },
};

/**
 * System prompt for template generation
 * Instructs the model on template structure, style guidelines, and best practices
 */
const SYSTEM_PROMPT = `You are an expert video template generator. You create production-ready video templates as structured JSON using the generate_template tool.

**STYLE PRESETS:**

1. **minimal**: Clean design, lots of whitespace, sans-serif fonts (Inter), muted tones (#1a1a1a, #f5f5f5, #888), simple animations
2. **bold**: High contrast, thick bold fonts (Oswald), vibrant colors (#000, #FFD700, #FF4500), dramatic animations
3. **corporate**: Professional, muted blues (#1B365D, #4A90D9, #F0F4F8), clean typography (Inter/Lora), subtle animations
4. **playful**: Bright colors (#FF6B6B, #4ECDC4, #FFE66D), rounded shapes, fun fonts (Poppins/Quicksand), bouncy animations
5. **cinematic**: Wide aspect (16:9), dramatic dark tones (#000, #C0A36E, #2C1B0E), elegant fonts (Playfair Display/Montserrat)
6. **social**: Vertical format (9:16), fast-paced, trendy colors (#FF0050, #00F2EA, #FFF), modern fonts (Poppins/Inter)
7. **retro**: Vintage colors (#F4E9CD, #8B4513, #2F4F4F), classic fonts (Merriweather/Courier New), grain effects
8. **neon**: Bright glow effects, dark background (#0D0D0D, #00FFFF, #FF00FF, #FFFF00), futuristic fonts (Orbitron)
9. **elegant**: Refined and sophisticated (#1C1C1C, #C5A880, #F5F1EB), serif fonts (Playfair Display/Lato)
10. **tech**: Futuristic, geometric shapes (#0A0E17, #00D4FF, #7B61FF), monospace fonts (Space Grotesk/JetBrains Mono)
11. **nature**: Earthy organic tones (#2D5016, #8FBC8F, #F5F5DC), natural fonts (Libre Baskerville/Source Sans Pro)
12. **luxury**: Premium feel, gold accents (#0B0B0B, #D4AF37, #F5F5F5), elegant fonts (Didot/Montserrat)

**TEMPLATE GUIDELINES:**

- Use realistic dimensions: 1920x1080 for landscape (16:9), 1080x1920 for portrait (9:16), 1080x1080 for square (1:1)
- FPS: Use 30fps for most templates, 60fps for smooth motion/gaming
- Duration: Convert seconds to microseconds (multiply by 1,000,000)
- Positions: Use percentages (0-100) for left/top, or pixel values for precise placement
- Include at least 3 text elements with varied positioning
- Add 1-2 image placeholders with clear placeholder names
- Use placeholder content that clearly identifies merge fields:
  - Text: "Your Company Name", "Brand Tagline Here", "[Product Title]", "Welcome Message"
  - Images: Use descriptive names like "logo", "product-image", "background-photo"
  - Videos: "background-video", "intro-clip"
- Apply animations to key elements (fadeIn for intros, slideIn for text reveals)
- Add transitions between major sections if duration > 5 seconds
- Set proper z-index for layering (backgrounds: 1, images: 2, text: 3)
- Use the style object for text formatting:
  - fontSize (px), fontFamily, color (hex), fontWeight (normal/bold/100-900)
  - textAlign (left/center/right), lineHeight, letterSpacing
- For images/videos: include src placeholder URLs or leave empty for user replacement

**TRACK STRUCTURE:**

- Create separate tracks for different element types
- Typical structure: Video track (backgrounds), Image track, Text track, Audio track
- Each track should have unique id and name
- clipIds array should reference the clips in that track

**TIMING EXAMPLES:**

- 5 second template: duration = 5000000 microseconds
- Clip from 1-3 seconds: display: { from: 1000000, to: 3000000 }, duration: 2000000
- Animation: duration in milliseconds (e.g., 800ms fadeIn)

Generate templates that are immediately usable and visually polished.`;

/**
 * Template generation service using Claude Sonnet 4.5
 */
export class TemplateGenerationService {
  private anthropic: Anthropic;

  constructor({ apiKey }: { apiKey: string }) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate a new template from a text description and style preset
   */
  async generate(prompt: string, stylePreset: any): Promise<GeneratedTemplate> {
    const userMessage = `Create a ${stylePreset.name} style video template: ${prompt}

Style characteristics:
- Mood: ${stylePreset.mood}
- Colors: ${stylePreset.colorPalette.join(', ')}
- Fonts: ${stylePreset.fontPrimary} (primary), ${stylePreset.fontSecondary} (secondary)
- Aspect ratio: ${stylePreset.aspectRatio}

Generate a production-ready template with this style applied.`;

    const messages = [
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'generate_template' },
      });

      // Extract the tool use result
      const toolUse = response.content.find(
        (block) => block.type === 'tool_use'
      );
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No template generated from AI response');
      }

      const templateData = toolUse.input as any;

      // Basic validation
      if (!templateData.clips || !Array.isArray(templateData.clips)) {
        throw new Error('Invalid template structure: missing clips array');
      }

      if (!templateData.tracks || !Array.isArray(templateData.tracks)) {
        throw new Error('Invalid template structure: missing tracks array');
      }

      // Auto-detect merge fields
      const mergeFields = detectMergeFields(templateData.clips);

      // Build conversation history
      const conversationHistory: Anthropic.MessageParam[] = [
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: response.content },
      ];

      return {
        template: templateData,
        mergeFields,
        conversationHistory,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`AI template generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Refine an existing template based on user feedback
   * Preserves conversation history for contextual modifications
   */
  async refine(
    existingTemplate: any,
    refinementPrompt: string,
    conversationHistory: Anthropic.MessageParam[]
  ): Promise<GeneratedTemplate> {
    const userMessage = `Modify the existing template based on this request: ${refinementPrompt}

IMPORTANT: Only change what's requested. Preserve all other elements, styling, and timing.

Current template structure:
- ${existingTemplate.clips?.length || 0} clips
- ${existingTemplate.tracks?.length || 0} tracks
- Duration: ${existingTemplate.duration || 0} seconds

Make the requested changes while maintaining the overall template structure.`;

    // Build messages with conversation history
    const messages = [
      ...conversationHistory,
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'generate_template' },
      });

      // Extract the tool use result
      const toolUse = response.content.find(
        (block) => block.type === 'tool_use'
      );
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No template generated from AI response');
      }

      const templateData = toolUse.input as any;

      // Re-run merge field detection on refined template
      const mergeFields = detectMergeFields(templateData.clips);

      // Extend conversation history
      const updatedHistory: Anthropic.MessageParam[] = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: response.content },
      ];

      return {
        template: templateData,
        mergeFields,
        conversationHistory: updatedHistory,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`AI template refinement failed: ${error.message}`);
      }
      throw error;
    }
  }
}
