import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COLORS } from '../constants';

const FEATURES = [
  {
    icon: '🎬',
    title: 'Multi-Track Timeline',
    desc: 'Video, audio, text & effects',
  },
  { icon: '🧠', title: 'AI Copilot', desc: 'Edit with natural language' },
  { icon: '✨', title: 'Text to Video', desc: 'Generate from a prompt' },
  { icon: '💬', title: 'Auto Captions', desc: 'AI-powered transcription' },
  { icon: '📐', title: 'Templates', desc: 'Reusable & parametric' },
  { icon: '🔌', title: 'REST API', desc: 'Programmatic rendering' },
];

function FeatureCard({
  icon,
  title,
  desc,
  index,
}: {
  icon: string;
  title: string;
  desc: string;
  index: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 5;
  const s = spring({
    frame,
    fps,
    delay,
    config: { damping: 15, stiffness: 120 },
  });

  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = (col - 1) * 420;
  const y = row * 180 - 90;

  const entryY = interpolate(s, [0, 1], [60, 0]);
  const entryX = interpolate(
    s,
    [0, 1],
    [col === 0 ? -40 : col === 2 ? 40 : 0, 0]
  );
  const scale = interpolate(s, [0, 1], [0.85, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: `translate(-50%, -50%) translateY(${entryY}px) translateX(${entryX}px) scale(${scale})`,
        opacity: s,
        width: 380,
        padding: '28px 32px',
        borderRadius: 16,
        backgroundColor: `${COLORS.white}06`,
        border: `1px solid ${COLORS.white}0A`,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: `${COLORS.purple}15`,
          border: `1px solid ${COLORS.purple}25`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 18,
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            color: COLORS.white,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 14,
            fontFamily: 'Geist, sans-serif',
            color: `${COLORS.white}60`,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

export const FeatureHighlights: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sceneOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  /* ── Rotating ring ─────────────────────────────────────────────── */
  const ringRotation = interpolate(frame, [0, 300], [0, 360]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: sceneIn * sceneOut,
      }}
    >
      {/* Background ring */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          border: `1px dashed ${COLORS.purple}15`,
          transform: `rotate(${ringRotation}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          border: `1px dashed ${COLORS.purple}0A`,
          transform: `rotate(${-ringRotation * 0.5}deg)`,
        }}
      />

      {/* Section label */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          fontSize: 14,
          fontFamily: 'Geist, sans-serif',
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: COLORS.purple,
          fontWeight: 600,
          opacity: spring({ frame, fps, delay: 5, config: { damping: 200 } }),
        }}
      >
        Packed with Power
      </div>

      {/* Feature cards */}
      {FEATURES.map((f, i) => (
        <FeatureCard key={f.title} {...f} index={i} />
      ))}
    </AbsoluteFill>
  );
};
