'use client';

import { Player } from '@remotion/player';
import { useEffect, useState } from 'react';
import { VizoraDemoVideo } from './VizoraDemoVideo';
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  VIDEO_FPS,
  DURATION_IN_FRAMES,
} from './constants';

export function HeroVideoPlayer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: `${VIDEO_WIDTH}/${VIDEO_HEIGHT}`,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      />
    );
  }

  return (
    <Player
      component={VizoraDemoVideo}
      compositionWidth={VIDEO_WIDTH}
      compositionHeight={VIDEO_HEIGHT}
      fps={VIDEO_FPS}
      durationInFrames={DURATION_IN_FRAMES}
      autoPlay
      loop
      style={{
        width: '100%',
        borderRadius: 16,
      }}
      controls={false}
    />
  );
}
