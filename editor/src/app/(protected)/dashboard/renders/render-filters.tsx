'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface RenderFiltersProps {
  status: string;
  search: string;
  batchId?: string;
  onStatusChange: (status: string) => void;
  onSearchChange: (search: string) => void;
  onBatchIdChange?: (batchId: string | undefined) => void;
}

export function RenderFilters({
  status,
  search,
  batchId,
  onStatusChange,
  onSearchChange,
  onBatchIdChange,
}: RenderFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, onSearchChange]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'queued', label: 'Queued' },
    { value: 'rendering', label: 'Rendering' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Batch filter chip */}
      {batchId && onBatchIdChange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/60">
            Filtering by batch:
          </span>
          <button
            type="button"
            onClick={() => onBatchIdChange(undefined)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-foreground transition-colors hover:bg-white/[0.06]"
          >
            <span className="font-mono">{batchId.slice(0, 8)}…</span>
            <X className="size-3 text-muted-foreground/50" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Status tabs */}
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-1">
          {tabs.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusChange(tab.value)}
                className={`relative cursor-pointer rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? 'text-white'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                }`}
              >
                {active && (
                  <span
                    className="absolute inset-0 rounded-md"
                    style={{
                      background:
                        'linear-gradient(105deg, #22D3EE 0%, #3B82F6 50%, oklch(0.60 0.24 285) 100%)',
                      opacity: 0.85,
                    }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by template name or render ID…"
            className="w-full rounded-lg border border-white/[0.07] bg-white/[0.02] py-2 pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/40 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>
    </div>
  );
}
