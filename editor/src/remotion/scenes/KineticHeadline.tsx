import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Sequence,
} from 'remotion';
import { COLORS } from '../constants';

const WORDS_LINE1 = ['Create', 'video', 'at', 'the'];
const WORDS_LINE2 = ['speed', 'of', 'thought'];

function AnimatedWord({
  word,
  index,
  isAccent,
}: {
  word: string;
  index: number;
  isAccent: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 3;
  const s = spring({
    frame,
    fps,
    delay,
    config: { damping: 14, stiffness: 140 },
  });

  const y = interpolate(s, [0, 1], [80, 0]);
  const opacity = s;
  const rotate = interpolate(s, [0, 1], [8, 0]);
  const scale = interpolate(s, [0, 1], [0.8, 1]);

  return (
    <span
      style={{
        display: 'inline-block',
        opacity,
        transform: `translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
        fontFamily: 'Outfit, sans-serif',
        fontSize: 96,
        fontWeight: 800,
        letterSpacing: -3,
        color: isAccent ? 'transparent' : COLORS.white,
        background: isAccent
          ? `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.violet}, ${COLORS.indigo})`
          : 'none',
        WebkitBackgroundClip: isAccent ? 'text' : undefined,
        marginRight: 20,
        lineHeight: 1.15,
      }}
    >
      {word}
    </span>
  );
}

export const KineticHeadline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  /* ── Scene entrance ────────────────────────────────────────────── */
  const sceneIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /* ── Scene exit ────────────────────────────────────────────────── */
  const sceneOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  /* ── Decorative elements ───────────────────────────────────────── */
  const lineWidth = interpolate(
    spring({ frame, fps, delay: 25, config: { damping: 200 } }),
    [0, 1],
    [0, 300]
  );

  /* ── Floating shapes ───────────────────────────────────────────── */
  const shapes = Array.from({ length: 6 }, (_, i) => {
    const s = spring({
      frame,
      fps,
      delay: 30 + i * 4,
      config: { damping: 200 },
    });
    return {
      x: [300, -350, 450, -400, 280, -320][i],
      y: [-200, 150, 100, -150, 250, -250][i],
      size: [40, 30, 50, 35, 45, 25][i],
      rotation: interpolate(frame, [0, 200], [0, 360 * (i % 2 === 0 ? 1 : -1)]),
      opacity: interpolate(s, [0, 1], [0, 0.08]),
    };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: sceneIn * sceneOut,
      }}
    >
      {/* Floating geometric shapes */}
      {shapes.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: s.size,
            height: s.size,
            border: `2px solid ${COLORS.purple}`,
            borderRadius: i % 2 === 0 ? 8 : '50%',
            opacity: s.opacity,
            transform: `translate(${s.x}px, ${s.y}px) rotate(${s.rotation}deg)`,
          }}
        />
      ))}

      {/* Main text */}
      <div style={{ textAlign: 'center', maxWidth: 1200 }}>
        <div>
          {WORDS_LINE1.map((word, i) => (
            <AnimatedWord key={word} word={word} index={i} isAccent={false} />
          ))}
        </div>
        <div>
          {WORDS_LINE2.map((word, i) => (
            <AnimatedWord
              key={word}
              word={word}
              index={i + WORDS_LINE1.length}
              isAccent={word === 'speed' || word === 'thought'}
            />
          ))}
        </div>
      </div>

      {/* Accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: '30%',
          width: lineWidth,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${COLORS.purple}, transparent)`,
          borderRadius: 2,
        }}
      />

      {/* Subtitle */}
      <div
        style={{
          position: 'absolute',
          bottom: '22%',
          opacity: interpolate(
            spring({ frame, fps, delay: 35, config: { damping: 200 } }),
            [0, 1],
            [0, 1]
          ),
          transform: `translateY(${interpolate(
            spring({ frame, fps, delay: 35, config: { damping: 200 } }),
            [0, 1],
            [15, 0]
          )}px)`,
          fontSize: 26,
          fontFamily: 'Geist, sans-serif',
          color: COLORS.muted,
          textAlign: 'center',
          maxWidth: 700,
          lineHeight: 1.6,
        }}
      >
        Professional timeline editor meets AI intelligence
      </div>
    </AbsoluteFill>
  );
};
