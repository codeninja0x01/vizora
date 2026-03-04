import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import { COLORS } from '../constants';

export const EditorShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  /* ── Label entrance ────────────────────────────────────────────── */
  const labelSpring = spring({
    frame,
    fps,
    delay: 0,
    config: { damping: 200 },
  });
  const labelY = interpolate(labelSpring, [0, 1], [20, 0]);

  /* ── Screenshot frame (device mockup) ──────────────────────────── */
  const mockupSpring = spring({
    frame,
    fps,
    delay: 8,
    config: { damping: 14, stiffness: 80 },
  });
  const mockupScale = interpolate(mockupSpring, [0, 1], [0.88, 1]);
  const mockupY = interpolate(mockupSpring, [0, 1], [80, 0]);
  const mockupOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /* ── Slow cinematic zoom on the screenshot ─────────────────────── */
  const zoomProgress = interpolate(
    frame,
    [20, durationInFrames - 15],
    [1, 1.08],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    }
  );

  /* ── Subtle pan (drift right and up) ───────────────────────────── */
  const panX = interpolate(frame, [20, durationInFrames - 15], [0, -20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const panY = interpolate(frame, [20, durationInFrames - 15], [0, -10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  /* ── Glow pulse behind screenshot ──────────────────────────────── */
  const glowPulse = interpolate(frame % 90, [0, 45, 90], [0.3, 0.5, 0.3]);

  /* ── Floating feature badges ───────────────────────────────────── */
  const badges = [
    { label: 'Multi-Track Timeline', x: -560, y: 260, delay: 40 },
    { label: 'AI Copilot', x: 560, y: -180, delay: 50 },
    { label: 'Template Mode', x: -530, y: -200, delay: 60 },
  ];

  /* ── Scene exit ────────────────────────────────────────────────── */
  const sceneOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: sceneOut,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${COLORS.purple}25 0%, transparent 70%)`,
          opacity: glowPulse,
          filter: 'blur(80px)',
        }}
      />

      {/* Section label */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          opacity: labelSpring,
          transform: `translateY(${labelY}px)`,
          fontSize: 14,
          fontFamily: 'Geist, sans-serif',
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: COLORS.purple,
          fontWeight: 600,
        }}
      >
        Professional Editor
      </div>

      {/* Device mockup frame */}
      <div
        style={{
          opacity: mockupOpacity,
          transform: `translateY(${mockupY}px) scale(${mockupScale})`,
          width: 1400,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${COLORS.border}`,
          boxShadow: `0 60px 140px -30px ${COLORS.purple}30, 0 30px 60px -20px rgba(0,0,0,0.5)`,
          position: 'relative',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 36,
            backgroundColor: '#1A1726',
            borderBottom: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 7,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#EF4444',
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#F59E0B',
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#22C55E',
            }}
          />
          <div
            style={{
              marginLeft: 12,
              fontSize: 11,
              fontFamily: 'Geist, sans-serif',
              color: COLORS.muted,
            }}
          >
            Vizora Editor
          </div>
        </div>

        {/* Real screenshot with zoom + pan */}
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <Img
            src={staticFile('screenshots/editor.png')}
            style={{
              width: '100%',
              display: 'block',
              transform: `scale(${zoomProgress}) translate(${panX}px, ${panY}px)`,
              transformOrigin: 'center center',
            }}
          />

          {/* Scanline overlay for cinematic feel */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.03) 2px,
                rgba(0,0,0,0.03) 4px
              )`,
              pointerEvents: 'none',
            }}
          />

          {/* Vignette */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, transparent 60%, rgba(13,11,20,0.4) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Floating feature badges */}
      {badges.map((badge) => {
        const bs = spring({
          frame,
          fps,
          delay: badge.delay,
          config: { damping: 200 },
        });
        const bY = interpolate(bs, [0, 1], [15, 0]);
        // Gentle float
        const floatY = Math.sin((frame + badge.delay * 10) * 0.04) * 4;

        return (
          <div
            key={badge.label}
            style={{
              position: 'absolute',
              left: `calc(50% + ${badge.x}px)`,
              top: `calc(50% + ${badge.y}px)`,
              transform: `translateY(${bY + floatY}px)`,
              opacity: bs,
              padding: '8px 18px',
              borderRadius: 12,
              backgroundColor: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              fontSize: 13,
              fontFamily: 'Geist, sans-serif',
              fontWeight: 600,
              color: COLORS.purple,
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
            }}
          >
            {badge.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
