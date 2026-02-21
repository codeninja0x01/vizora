import { StoryboardWizard } from '@/components/editor/ai/storyboard-wizard';

export default function TextToVideoPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Text to Video
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground/70">
          Create videos from text descriptions using AI-powered stock footage
          assembly
        </p>
      </div>

      {/* Wizard */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <StoryboardWizard />
      </div>
    </div>
  );
}
