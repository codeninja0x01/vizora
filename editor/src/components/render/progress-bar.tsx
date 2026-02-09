'use client';

import { useEffect, useState } from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  startedAt: Date; // For elapsed time calculation
  className?: string;
}

/**
 * Format elapsed time in seconds to human-readable string
 * < 60s: "42s"
 * 1-59 min: "3m 24s"
 * 60+ min: "1h 15m"
 */
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function ProgressBar({
  progress,
  startedAt,
  className,
}: ProgressBarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Calculate initial elapsed time
    const updateElapsed = () => {
      const now = new Date();
      const diffMs = now.getTime() - startedAt.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      setElapsedSeconds(diffSeconds);
    };

    // Update immediately
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    // Cleanup
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className={className}>
      {/* Percentage and elapsed time */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{Math.round(progress)}%</span>
        <span className="text-xs text-muted-foreground">
          {formatElapsedTime(elapsedSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
