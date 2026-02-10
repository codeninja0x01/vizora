import { StoryboardWizard } from '@/components/editor/ai/storyboard-wizard';

export default function TextToVideoPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
          Text to Video
        </h1>
        <p className="text-muted-foreground">
          Create videos from text descriptions using AI-powered stock footage
          assembly
        </p>
      </div>

      {/* Wizard */}
      <StoryboardWizard />
    </div>
  );
}
