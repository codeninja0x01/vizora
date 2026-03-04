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

export const DashboardShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  /* ── Label ─────────────────────────────────────────────────────── */
  const labelSpring = spring({
    frame,
    fps,
    delay: 0,
    config: { damping: 200 },
  });

  /* ── Screenshot entrance — slide up from below with perspective ── */
  const enterSpring = spring({
    frame,
    fps,
    delay: 5,
    config: { damping: 15, stiffness: 70 },
  });
  const enterY = interpolate(enterSpring, [0, 1], [120, 0]);
  const enterScale = interpolate(enterSpring, [0, 1], [0.9, 1]);
  const enterOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /* ── 3D tilt effect — starts tilted, settles to flat ───────────── */
  const tiltX = interpolate(
    spring({ frame, fps, delay: 5, config: { damping: 20, stiffness: 60 } }),
    [0, 1],
    [12, 2]
  );

  /* ── Slow cinematic zoom ───────────────────────────────────────── */
  const zoom = interpolate(frame, [25, durationInFrames - 10], [1, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  /* ── Highlight callouts that pop in ────────────────────────────── */
  const callouts = [
    { label: 'Stats Overview', x: -480, y: -200, delay: 35 },
    { label: 'Quick Actions', x: 480, y: -40, delay: 45 },
    { label: 'Recent Renders', x: -200, y: 120, delay: 55 },
  ];

  /* ── Glow ──────────────────────────────────────────────────────── */
  const glowOpacity = interpolate(frame, [5, 30], [0, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /* ── Scene exit ────────────────────────────────────────────────── */
  const sceneOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
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
        perspective: 1200,
        opacity: sceneOut,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${COLORS.indigo}20 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: 'blur(80px)',
        }}
      />

      {/* Section label */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          opacity: labelSpring,
          transform: `translateY(${interpolate(labelSpring, [0, 1], [15, 0])}px)`,
          fontSize: 14,
          fontFamily: 'Geist, sans-serif',
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: COLORS.purple,
          fontWeight: 600,
        }}
      >
        Command Center
      </div>

      {/* Dashboard screenshot with 3D tilt */}
      <div
        style={{
          opacity: enterOpacity,
          transform: `
            translateY(${enterY}px)
            scale(${enterScale})
            rotateX(${tiltX}deg)
          `,
          transformStyle: 'preserve-3d',
          width: 1400,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${COLORS.border}`,
          boxShadow: `
            0 80px 160px -40px ${COLORS.purple}20,
            0 40px 80px -30px rgba(0,0,0,0.5),
            0 0 0 1px rgba(255,255,255,0.03)
          `,
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
            Vizora Dashboard
          </div>
        </div>

        {/* Real screenshot with zoom */}
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <Img
            src={staticFile('screenshots/dashboard.png')}
            style={{
              width: '100%',
              display: 'block',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          />

          {/* Subtle vignette */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, transparent 50%, rgba(13,11,20,0.35) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Floating callout badges */}
      {callouts.map((c) => {
        const cs = spring({
          frame,
          fps,
          delay: c.delay,
          config: { damping: 200 },
        });
        const floatY = Math.sin((frame + c.delay * 8) * 0.035) * 5;

        return (
          <div
            key={c.label}
            style={{
              position: 'absolute',
              left: `calc(50% + ${c.x}px)`,
              top: `calc(50% + ${c.y}px)`,
              transform: `translateY(${interpolate(cs, [0, 1], [12, 0]) + floatY}px)`,
              opacity: cs,
              padding: '8px 18px',
              borderRadius: 12,
              backgroundColor: 'rgba(79, 70, 229, 0.12)',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              fontSize: 13,
              fontFamily: 'Geist, sans-serif',
              fontWeight: 600,
              color: '#818CF8',
              whiteSpace: 'nowrap',
            }}
          >
            {c.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
