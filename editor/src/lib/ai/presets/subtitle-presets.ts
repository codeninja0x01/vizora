/**
 * Subtitle preset definitions
 *
 * Curated presets covering karaoke (word-by-word highlight) and phrase (full sentence)
 * animation modes with distinct visual styles
 */

export interface SubtitlePreset {
  id: string;
  name: string;
  description: string;
  mode: 'karaoke' | 'phrase';
  position: 'top' | 'center' | 'bottom';
  style: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    align: 'center' | 'left' | 'right';
    fontUrl?: string;
    stroke?: {
      color: string;
      width: number;
    };
    shadow?: {
      color: string;
      alpha: number;
      blur: number;
      offsetX: number;
      offsetY: number;
    };
    background?: string;
  };
  colors: {
    appeared: string; // color for already-spoken words
    active: string; // text color for current word
    activeFill: string; // highlight/fill color for current word
    background: string; // background behind text
    keyword: string; // keyword emphasis color
  };
  preview?: string; // thumbnail/preview image path
}

/**
 * Curated subtitle presets
 */
export const SUBTITLE_PRESETS: SubtitlePreset[] = [
  {
    id: 'modern-karaoke',
    name: 'Modern Karaoke',
    description:
      'TikTok/CapCut style with orange highlight - the default for viral content',
    mode: 'karaoke',
    position: 'bottom',
    style: {
      fontSize: 80,
      fontFamily: 'Poppins',
      fontWeight: '700',
      color: '#ffffff',
      align: 'center',
      fontUrl:
        'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2',
      stroke: {
        color: '#000000',
        width: 4,
      },
      shadow: {
        color: '#000000',
        alpha: 0.5,
        blur: 4,
        offsetX: 2,
        offsetY: 2,
      },
    },
    colors: {
      appeared: '#ffffff',
      active: '#ffffff',
      activeFill: '#FF5700',
      background: '',
      keyword: '#ffffff',
    },
  },
  {
    id: 'classic-phrase',
    name: 'Classic Phrase',
    description:
      'Traditional subtitle look with black bar background - like movies/TV',
    mode: 'phrase',
    position: 'bottom',
    style: {
      fontSize: 60,
      fontFamily: 'Inter',
      fontWeight: '400',
      color: '#ffffff',
      align: 'center',
      fontUrl:
        'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
      background: 'rgba(0, 0, 0, 0.8)',
    },
    colors: {
      appeared: '#ffffff',
      active: '#ffffff',
      activeFill: '',
      background: 'rgba(0, 0, 0, 0.8)',
      keyword: '#ffffff',
    },
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    description: 'Cyberpunk aesthetic with cyan text and pink highlight glow',
    mode: 'karaoke',
    position: 'bottom',
    style: {
      fontSize: 75,
      fontFamily: 'Orbitron',
      fontWeight: '700',
      color: '#00FFFF',
      align: 'center',
      fontUrl:
        'https://fonts.gstatic.com/s/orbitron/v29/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgz.woff2',
      shadow: {
        color: '#00FFFF',
        alpha: 0.8,
        blur: 15,
        offsetX: 0,
        offsetY: 0,
      },
    },
    colors: {
      appeared: '#00FFFF',
      active: '#00FFFF',
      activeFill: '#FF00FF',
      background: '',
      keyword: '#00FFFF',
    },
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    description:
      'Subtle and elegant with light gray text - for professional content',
    mode: 'phrase',
    position: 'bottom',
    style: {
      fontSize: 55,
      fontFamily: 'Inter',
      fontWeight: '300',
      color: '#E5E5E5',
      align: 'center',
      fontUrl:
        'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
    },
    colors: {
      appeared: '#E5E5E5',
      active: '#E5E5E5',
      activeFill: '',
      background: '',
      keyword: '#E5E5E5',
    },
  },
  {
    id: 'bold-impact',
    name: 'Bold Impact',
    description: 'High contrast yellow on black - maximum visibility and drama',
    mode: 'karaoke',
    position: 'center',
    style: {
      fontSize: 90,
      fontFamily: 'Impact',
      fontWeight: '700',
      color: '#FFD700',
      align: 'center',
      stroke: {
        color: '#000000',
        width: 6,
      },
      shadow: {
        color: '#000000',
        alpha: 0.7,
        blur: 8,
        offsetX: 3,
        offsetY: 3,
      },
    },
    colors: {
      appeared: '#FFD700',
      active: '#FFD700',
      activeFill: '#ffffff',
      background: '',
      keyword: '#FFD700',
    },
  },
  {
    id: 'gradient-pop',
    name: 'Gradient Pop',
    description:
      'Energetic gradient-style highlight - orange to yellow transition',
    mode: 'karaoke',
    position: 'bottom',
    style: {
      fontSize: 78,
      fontFamily: 'Montserrat',
      fontWeight: '700',
      color: '#ffffff',
      align: 'center',
      fontUrl:
        'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
      stroke: {
        color: '#000000',
        width: 4,
      },
    },
    colors: {
      appeared: '#ffffff',
      active: '#ffffff',
      activeFill: '#FF8C00', // Simulated gradient with dark orange
      background: '',
      keyword: '#ffffff',
    },
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    description:
      'Terminal/hacker aesthetic with monospace font - for tech content',
    mode: 'phrase',
    position: 'top',
    style: {
      fontSize: 50,
      fontFamily: 'JetBrains Mono',
      fontWeight: '400',
      color: '#00FF41',
      align: 'left',
      fontUrl:
        'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOVkWM.woff2',
      background: 'rgba(0, 0, 0, 0.9)',
    },
    colors: {
      appeared: '#00FF41',
      active: '#00FF41',
      activeFill: '',
      background: 'rgba(0, 0, 0, 0.9)',
      keyword: '#00FF41',
    },
  },
  {
    id: 'social-viral',
    name: 'Social Viral',
    description:
      'Optimized for vertical video with red highlight - Instagram/TikTok',
    mode: 'karaoke',
    position: 'center',
    style: {
      fontSize: 85,
      fontFamily: 'Poppins',
      fontWeight: '800',
      color: '#ffffff',
      align: 'center',
      fontUrl:
        'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2',
      stroke: {
        color: '#000000',
        width: 5,
      },
      shadow: {
        color: '#000000',
        alpha: 0.6,
        blur: 6,
        offsetX: 2,
        offsetY: 2,
      },
    },
    colors: {
      appeared: '#ffffff',
      active: '#ffffff',
      activeFill: '#FF0000',
      background: '',
      keyword: '#ffffff',
    },
  },
];

/**
 * Get a preset by its ID
 */
export function getPresetById(id: string): SubtitlePreset | undefined {
  return SUBTITLE_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get the default subtitle preset
 */
export function getDefaultPreset(): SubtitlePreset {
  const defaultPreset = getPresetById('modern-karaoke');
  if (!defaultPreset) {
    throw new Error('Default preset not found');
  }
  return defaultPreset;
}
