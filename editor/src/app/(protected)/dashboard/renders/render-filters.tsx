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
      {/* Batch filter chip (if active) */}
      {batchId && onBatchIdChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Filtering by batch:
          </span>
          <button
            type="button"
            onClick={() => onBatchIdChange(undefined)}
            className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-white/[0.05]"
          >
            <span className="font-mono text-xs">{batchId.slice(0, 8)}...</span>
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.03] p-1 border border-border/30">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-all duration-150 ${
                status === tab.value
                  ? 'bg-primary/10 font-medium text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by template name or render ID..."
            className="w-full rounded-xl border border-border/40 bg-white/[0.03] py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-border/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>
    </div>
  );
}
