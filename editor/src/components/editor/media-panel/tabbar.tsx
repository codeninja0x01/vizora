'use client';

import { cn } from '@/lib/utils';
import { type Tab, tabs, useMediaPanelStore } from './store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ActivityBar() {
  const { activeTab, togglePanel } = useMediaPanelStore();

  return (
    <div className="flex flex-col items-center w-12 h-full bg-[var(--activity-bar-bg)] py-3 gap-1">
      {(Object.keys(tabs) as Tab[]).map((tabKey) => {
        const tab = tabs[tabKey];
        const isActive = activeTab === tabKey;
        return (
          <Tooltip key={tabKey} delayDuration={10}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-md transition-all duration-150',
                  isActive
                    ? 'bg-white/5 text-foreground border-l-2 border-accent-purple-500'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border-l-2 border-transparent'
                )}
                onClick={() => togglePanel(tabKey)}
              >
                <tab.icon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" sideOffset={8}>
              {tab.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
