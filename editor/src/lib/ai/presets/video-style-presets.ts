/**
 * Video style presets for text-to-video generation
 * Controls transitions, text styling, and pacing
 */

export interface VideoStylePreset {
  id: string;
  name: string;
  description: string;
  transitionType: string;
  transitionDuration: number;
  textStyle: {
    fontFamily: string;
    fontSize: number;
    color: string;
    fontWeight: string;
    background?: string;
    stroke?: string;
  };
  pacing: 'slow' | 'medium' | 'fast';
  defaultSceneDuration: number;
}

export const VIDEO_STYLE_PRESETS: VideoStylePreset[] = [
  {
    id: 'corporate',
    name: 'Corporate',
    description:
      'Professional business presentation style with clean aesthetics',
    transitionType: 'fade',
    transitionDuration: 1.0,
    textStyle: {
      fontFamily: 'Inter',
      fontSize: 48,
      color: '#FFFFFF',
      fontWeight: '600',
      background: 'rgba(0, 0, 0, 0.5)',
    },
    pacing: 'medium',
    defaultSceneDuration: 5,
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Fast-paced, attention-grabbing style for social platforms',
    transitionType: 'wipe',
    transitionDuration: 0.5,
    textStyle: {
      fontFamily: 'Poppins',
      fontSize: 56,
      color: '#FFFFFF',
      fontWeight: '700',
      stroke: '#000000',
    },
    pacing: 'fast',
    defaultSceneDuration: 3,
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description:
      'Film-like presentation with elegant transitions and serif typography',
    transitionType: 'dissolve',
    transitionDuration: 1.5,
    textStyle: {
      fontFamily: 'Playfair Display',
      fontSize: 52,
      color: '#FFFFFF',
      fontWeight: '400',
    },
    pacing: 'slow',
    defaultSceneDuration: 7,
  },
  {
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Educational content style with clear, readable text',
    transitionType: 'cut',
    transitionDuration: 0.2,
    textStyle: {
      fontFamily: 'Roboto',
      fontSize: 44,
      color: '#1F2937',
      fontWeight: '500',
      background: 'rgba(255, 255, 255, 0.9)',
    },
    pacing: 'medium',
    defaultSceneDuration: 6,
  },
  {
    id: 'energetic',
    name: 'Energetic',
    description: 'High-energy style with bold text and quick transitions',
    transitionType: 'slide',
    transitionDuration: 0.3,
    textStyle: {
      fontFamily: 'Montserrat',
      fontSize: 60,
      color: '#FBBF24',
      fontWeight: '800',
    },
    pacing: 'fast',
    defaultSceneDuration: 2.5,
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description:
      'Sophisticated style with refined typography and smooth transitions',
    transitionType: 'crossfade',
    transitionDuration: 1.2,
    textStyle: {
      fontFamily: 'Lora',
      fontSize: 46,
      color: '#F3F4F6',
      fontWeight: '400',
    },
    pacing: 'slow',
    defaultSceneDuration: 6,
  },
];

/**
 * Get video style preset by ID
 */
export function getVideoStyleById(id: string): VideoStylePreset | undefined {
  return VIDEO_STYLE_PRESETS.find((preset) => preset.id === id);
}
