'use client';

import { Button } from '@/components/ui/button';
import { useTemplateStore } from '@/stores/template-store';
import { Layers, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function TemplateBar() {
  const { templateName, exitTemplateMode } = useTemplateStore();
  const router = useRouter();

  const handleExit = () => {
    exitTemplateMode();
    // Navigate back to templates dashboard
    router.push('/dashboard/templates');
  };

  return (
    <div className="h-8 w-full bg-primary/20 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <Layers className="size-4 text-primary" />
        <span className="font-medium text-foreground">Template Mode</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{templateName}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="h-6 px-2 text-xs gap-1"
      >
        <X className="size-3" />
        <span>Exit</span>
      </Button>
    </div>
  );
}
