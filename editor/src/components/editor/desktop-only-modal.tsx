'use client';
import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

/**
 * Desktop-only enforcement modal
 * Shows a blocker on mobile/tablet devices directing users to desktop
 */
export function DesktopOnlyModal() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      const width = window.innerWidth;
      const isTouchDevice =
        'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Consider mobile/tablet if width < 1024px OR touch device with width < 1280px
      setIsMobile(width < 1024 || (isTouchDevice && width < 1280));
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        {/* Icons */}
        <div className="flex items-center justify-center gap-4">
          <div className="relative">
            <Smartphone className="size-16 text-muted-foreground" />
            <div className="absolute -top-1 -right-1 size-6 rounded-full bg-destructive flex items-center justify-center">
              <span className="text-destructive-foreground text-xs font-bold">
                ✕
              </span>
            </div>
          </div>
          <div className="size-16 flex items-center justify-center">
            <svg
              className="size-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>
          <div className="relative">
            <Monitor className="size-16 text-primary" />
            <div className="absolute -top-1 -right-1 size-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">
                ✓
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Desktop Required
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            The video editor requires a desktop computer with a minimum screen
            width of 1024px for the best editing experience.
          </p>
        </div>

        {/* Features list */}
        <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm">
          <p className="font-medium text-foreground">Desktop features:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Multi-panel layout with resizable sections</li>
            <li>• Precise timeline editing with keyboard shortcuts</li>
            <li>• Drag-and-drop media management</li>
            <li>• Real-time canvas preview</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            Please visit this page on a desktop computer or laptop to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
