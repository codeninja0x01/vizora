'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface RenderFiltersProps {
  status: string;
  search: string;
  onStatusChange: (status: string) => void;
  onSearchChange: (search: string) => void;
}

/**
 * Tab-style status filters and search bar for renders
 *
 * Status tabs: All | Queued | Rendering | Completed | Failed
 * Search bar debounced to 300ms to avoid excessive queries
 */
export function RenderFilters({
  status,
  search,
  onStatusChange,
  onSearchChange,
}: RenderFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, onSearchChange]);

  // Sync with external search changes (e.g., URL updates)
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
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Status tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onStatusChange(tab.value)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
              status === tab.value
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by template name or render ID..."
          className="w-full rounded-md border border-border bg-white/5 py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
