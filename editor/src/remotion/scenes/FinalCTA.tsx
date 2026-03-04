import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS } from '../constants';

export const FinalCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  /* ── Entrance ──────────────────────────────────────────────────── */
  const titleSpring = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 12, stiffness: 100 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [1.3, 1]);
  const titleOpacity = titleSpring;

  const subtitleSpring = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 200 },
  });

  const btnSpring = spring({ frame, fps, delay: 25, config: { damping: 14 } });
  const btnY = interpolate(btnSpring, [0, 1], [30, 0]);

  /* ── Background pulse ──────────────────────────────────────────── */
  const pulseScale = interpolate(frame, [0, 90], [0.8, 1.4]);
  const pulseOpacity = interpolate(frame, [0, 90], [0.25, 0], {
    extrapolateRight: 'clamp',
  });

  /* ── Converging lines ──────────────────────────────────────────── */
  const lines = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const lineSpring = spring({
      frame,
      fps,
      delay: i * 2,
      config: { damping: 200 },
    });
    const len = interpolate(lineSpring, [0, 1], [600, 200]);
    const x1 = Math.cos(angle) * len;
    const y1 = Math.sin(angle) * len;
    return { x1, y1, opacity: interpolate(lineSpring, [0, 1], [0, 0.15]) };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Radial pulse */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          border: `2px solid ${COLORS.purple}`,
          opacity: pulseOpacity,
          transform: `scale(${pulseScale})`,
        }}
      />

      {/* Converging lines */}
      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', top: 0, left: 0 }}
        viewBox="0 0 1920 1080"
      >
        {lines.map((l, i) => (
          <line
            key={i}
            x1={960 + l.x1}
            y1={540 + l.y1}
            x2={960}
            y2={540}
            stroke={COLORS.purple}
            strokeWidth={1}
            opacity={l.opacity}
          />
        ))}
      </svg>

      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.purple}30 0%, transparent 70%)`,
          filter: 'blur(80px)',
          opacity: interpolate(frame, [0, 30], [0, 0.6], {
            extrapolateRight: 'clamp',
          }),
        }}
      />

      {/* Title */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          fontSize: 80,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 800,
          color: COLORS.white,
          letterSpacing: -2,
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        Start creating.
      </div>

      {/* Subtitle */}
      <div
        style={{
          marginTop: 20,
          opacity: subtitleSpring,
          transform: `translateY(${interpolate(subtitleSpring, [0, 1], [12, 0])}px)`,
          fontSize: 24,
          fontFamily: 'Geist, sans-serif',
          color: COLORS.muted,
          textAlign: 'center',
        }}
      >
        Free to use. No credit card required.
      </div>

      {/* Button */}
      <div
        style={{
          marginTop: 40,
          opacity: btnSpring,
          transform: `translateY(${btnY}px)`,
          padding: '18px 48px',
          borderRadius: 16,
          background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.indigo})`,
          fontSize: 20,
          fontFamily: 'Geist, sans-serif',
          fontWeight: 700,
          color: COLORS.white,
          letterSpacing: 0.5,
          boxShadow: `0 20px 60px -15px ${COLORS.purple}50`,
        }}
      >
        Get Started →
      </div>

      {/* URL */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          opacity: interpolate(
            spring({ frame, fps, delay: 35, config: { damping: 200 } }),
            [0, 1],
            [0, 1]
          ),
          fontSize: 18,
          fontFamily: 'Geist Mono, monospace',
          color: `${COLORS.white}40`,
          letterSpacing: 2,
        }}
      >
        vizora.dev
      </div>
    </AbsoluteFill>
  );
};
