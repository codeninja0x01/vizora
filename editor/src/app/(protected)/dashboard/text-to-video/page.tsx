import { StoryboardWizard } from '@/components/editor/ai/storyboard-wizard';
import { Wand2 } from 'lucide-react';

export default function TextToVideoPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
        style={{ animationFillMode: 'both' }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-purple-500/30 bg-accent-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-purple-400">
            <Wand2 className="size-2.5" />
            AI
          </span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Text to Video
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground/70">
          Describe your story — AI finds footage and assembles your video
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
