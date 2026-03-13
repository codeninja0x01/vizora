/**
 * Template style preset definitions for AI template generation
 * 12 distinct visual styles with color palettes, typography, and mood descriptors
 */

interface TemplateStylePreset {
  id: string;
  name: string;
  description: string;
  colorPalette: string[];
  fontPrimary: string;
  fontSecondary: string;
  mood: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
}

/**
 * 12 curated template style presets covering diverse visual aesthetics
 */
export const TEMPLATE_STYLE_PRESETS: TemplateStylePreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean design with lots of whitespace and simple shapes',
    colorPalette: ['#1a1a1a', '#f5f5f5', '#888888'],
    fontPrimary: 'Inter',
    fontSecondary: 'Inter',
    mood: 'clean, professional, understated',
    aspectRatio: '16:9',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast with thick fonts and vibrant colors',
    colorPalette: ['#000000', '#FFD700', '#FF4500'],
    fontPrimary: 'Oswald',
    fontSecondary: 'Roboto',
    mood: 'energetic, attention-grabbing, powerful',
    aspectRatio: '16:9',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional business aesthetic with muted blues',
    colorPalette: ['#1B365D', '#4A90D9', '#F0F4F8'],
    fontPrimary: 'Inter',
    fontSecondary: 'Lora',
    mood: 'professional, trustworthy, polished',
    aspectRatio: '16:9',
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Bright colors, rounded shapes, and fun typography',
    colorPalette: ['#FF6B6B', '#4ECDC4', '#FFE66D'],
    fontPrimary: 'Poppins',
    fontSecondary: 'Quicksand',
    mood: 'fun, cheerful, lighthearted',
    aspectRatio: '16:9',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description:
      'Wide aspect ratio with dramatic dark tones and elegant typography',
    colorPalette: ['#000000', '#C0A36E', '#2C1B0E'],
    fontPrimary: 'Playfair Display',
    fontSecondary: 'Montserrat',
    mood: 'dramatic, elegant, cinematic',
    aspectRatio: '16:9',
  },
  {
    id: 'social',
    name: 'Social',
    description:
      'Vertical format optimized for social media with trendy colors',
    colorPalette: ['#FF0050', '#00F2EA', '#FFFFFF'],
    fontPrimary: 'Poppins',
    fontSecondary: 'Inter',
    mood: 'trendy, fast-paced, social',
    aspectRatio: '9:16',
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Vintage aesthetic with classic colors and nostalgic feel',
    colorPalette: ['#F4E9CD', '#8B4513', '#2F4F4F'],
    fontPrimary: 'Merriweather',
    fontSecondary: 'Courier New',
    mood: 'nostalgic, vintage, warm',
    aspectRatio: '16:9',
  },
  {
    id: 'neon',
    name: 'Neon',
    description:
      'Bright glowing effects on dark backgrounds with futuristic fonts',
    colorPalette: ['#0D0D0D', '#00FFFF', '#FF00FF', '#FFFF00'],
    fontPrimary: 'Orbitron',
    fontSecondary: 'Space Mono',
    mood: 'futuristic, electric, vibrant',
    aspectRatio: '16:9',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Refined and sophisticated with serif typography',
    colorPalette: ['#1C1C1C', '#C5A880', '#F5F1EB'],
    fontPrimary: 'Playfair Display',
    fontSecondary: 'Lato',
    mood: 'sophisticated, refined, elegant',
    aspectRatio: '16:9',
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Futuristic with geometric shapes and monospace fonts',
    colorPalette: ['#0A0E17', '#00D4FF', '#7B61FF'],
    fontPrimary: 'Space Grotesk',
    fontSecondary: 'JetBrains Mono',
    mood: 'futuristic, technical, modern',
    aspectRatio: '16:9',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Earthy organic tones with natural aesthetic',
    colorPalette: ['#2D5016', '#8FBC8F', '#F5F5DC'],
    fontPrimary: 'Libre Baskerville',
    fontSecondary: 'Source Sans Pro',
    mood: 'natural, organic, earthy',
    aspectRatio: '16:9',
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Premium feel with gold accents and elegant typography',
    colorPalette: ['#0B0B0B', '#D4AF37', '#F5F5F5'],
    fontPrimary: 'Didot',
    fontSecondary: 'Montserrat',
    mood: 'premium, luxurious, exclusive',
    aspectRatio: '16:9',
  },
];

/**
 * Get a template style preset by ID
 */
export function getTemplateStyleById(id: string): TemplateStylePreset | null {
  return TEMPLATE_STYLE_PRESETS.find((preset) => preset.id === id) || null;
}

/**
 * Get the default template style preset (Corporate)
 */
export function getDefaultTemplateStyle(): TemplateStylePreset {
  return TEMPLATE_STYLE_PRESETS.find((preset) => preset.id === 'corporate')!;
}
