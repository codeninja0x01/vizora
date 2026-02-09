'use client';

interface RenderStatusBadgeProps {
  status: 'queued' | 'active' | 'completed' | 'failed';
}

export function RenderStatusBadge({ status }: RenderStatusBadgeProps) {
  const statusConfig = {
    queued: {
      label: 'Queued',
      className: 'bg-yellow-500/10 text-yellow-500',
      showPulse: false,
    },
    active: {
      label: 'Rendering',
      className: 'bg-blue-500/10 text-blue-500',
      showPulse: true,
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-500/10 text-green-500',
      showPulse: false,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-500/10 text-red-500',
      showPulse: false,
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.showPulse && (
        <span className="size-2 animate-pulse rounded-full bg-current" />
      )}
      {config.label}
    </span>
  );
}
