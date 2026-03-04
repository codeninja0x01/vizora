import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { LogoReveal } from './scenes/LogoReveal';
import { KineticHeadline } from './scenes/KineticHeadline';
import { EditorShowcase } from './scenes/EditorShowcase';
import { DashboardShowcase } from './scenes/DashboardShowcase';
import { FeatureHighlights } from './scenes/FeatureHighlights';
import { FinalCTA } from './scenes/FinalCTA';
import { COLORS } from './constants';

export const VizoraDemoVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Scene 1: Logo reveal — 0s to 3s */}
      <Sequence from={0} durationInFrames={3 * fps}>
        <LogoReveal />
      </Sequence>

      {/* Scene 2: Kinetic headline — 2.5s to 5.5s */}
      <Sequence from={Math.round(2.5 * fps)} durationInFrames={3 * fps}>
        <KineticHeadline />
      </Sequence>

      {/* Scene 3: Real editor screenshot — 5s to 9.5s */}
      <Sequence from={5 * fps} durationInFrames={Math.round(4.5 * fps)}>
        <EditorShowcase />
      </Sequence>

      {/* Scene 4: Real dashboard screenshot — 9s to 12.5s */}
      <Sequence from={9 * fps} durationInFrames={Math.round(3.5 * fps)}>
        <DashboardShowcase />
      </Sequence>

      {/* Scene 5: Feature highlights — 12s to 15s */}
      <Sequence from={12 * fps} durationInFrames={3 * fps}>
        <FeatureHighlights />
      </Sequence>

      {/* Scene 6: Final CTA — 14.5s to 18s */}
      <Sequence
        from={Math.round(14.5 * fps)}
        durationInFrames={Math.round(3.5 * fps)}
      >
        <FinalCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
