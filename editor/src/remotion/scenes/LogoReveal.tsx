import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS } from '../constants';

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ── Logo icon entrance ────────────────────────────────────────── */
  const iconScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120 },
  });
  const iconRotate = interpolate(
    spring({ frame, fps, config: { damping: 15 } }),
    [0, 1],
    [-90, 0]
  );

  /* ── Ring pulse ────────────────────────────────────────────────── */
  const ringScale = spring({ frame, fps, delay: 8, config: { damping: 200 } });
  const ringOpacity = interpolate(frame, [8, 30], [0, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /* ── Wordmark entrance ─────────────────────────────────────────── */
  const wordSpring = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 200 },
  });
  const wordX = interpolate(wordSpring, [0, 1], [60, 0]);
  const wordOpacity = wordSpring;

  /* ── Tagline ───────────────────────────────────────────────────── */
  const tagSpring = spring({ frame, fps, delay: 30, config: { damping: 200 } });
  const tagY = interpolate(tagSpring, [0, 1], [20, 0]);

  /* ── Background glow ───────────────────────────────────────────── */
  const glowOpacity = interpolate(frame, [0, 40], [0, 0.5], {
    extrapolateRight: 'clamp',
  });

  /* ── Particle ring ─────────────────────────────────────────────── */
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const delay = i * 2;
    const pSpring = spring({
      frame,
      fps,
      delay,
      config: { damping: 15, stiffness: 80 },
    });
    const radius = interpolate(pSpring, [0, 1], [0, 180]);
    const x = Math.cos(angle + frame * 0.01) * radius;
    const y = Math.sin(angle + frame * 0.01) * radius;
    const opacity = interpolate(pSpring, [0, 0.3, 1], [0, 1, 0.3]);
    return { x, y, opacity, size: 3 + (i % 3) * 2 };
  });

  /* ── Scene fade out ────────────────────────────────────────────── */
  const fadeOut = interpolate(frame, [70, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.purple}40 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: 'blur(60px)',
        }}
      />

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: i % 2 === 0 ? COLORS.purple : COLORS.cyan,
            opacity: p.opacity * fadeOut,
            transform: `translate(${p.x}px, ${p.y}px)`,
          }}
        />
      ))}

      {/* Main logo group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Icon */}
        <div
          style={{
            transform: `scale(${iconScale}) rotate(${iconRotate}deg)`,
            width: 120,
            height: 120,
            flexShrink: 0,
          }}
        >
          <svg width={120} height={120} viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient
                id="logo-bg"
                x1="0"
                y1="0"
                x2="32"
                y2="32"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={COLORS.purple} />
                <stop offset="55%" stopColor={COLORS.violet} />
                <stop offset="100%" stopColor={COLORS.indigo} />
              </linearGradient>
              <linearGradient
                id="logo-sym"
                x1="10"
                y1="5"
                x2="22"
                y2="27"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E9D5FF" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#logo-bg)" />
            <path
              d="M11 7L25 16L11 25V7Z"
              fill="url(#logo-sym)"
              opacity="0.95"
            />
            <circle
              cx="16"
              cy="16"
              r="5.5"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              opacity={ringOpacity}
              style={{
                transform: `scale(${ringScale})`,
                transformOrigin: 'center',
              }}
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            opacity: wordOpacity,
            transform: `translateX(${wordX}px)`,
            fontSize: 72,
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            letterSpacing: -2,
            color: COLORS.white,
            lineHeight: 1,
          }}
        >
          <span style={{ fontWeight: 500 }}>Viz</span>
          <span style={{ fontWeight: 800 }}>ora</span>
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 24,
          opacity: tagSpring,
          transform: `translateY(${tagY}px)`,
          fontSize: 22,
          fontFamily: 'Geist, sans-serif',
          color: COLORS.muted,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        AI Video Creation Platform
      </div>
    </AbsoluteFill>
  );
};
