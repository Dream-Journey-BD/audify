import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface TgVoiceToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const TgVoiceToolbar: React.FC<TgVoiceToolbarProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-neutral-300">
      {/* Search Input */}
      <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search audio/video files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-sky-500 transition-colors placeholder:text-neutral-500"
          />
        </div>
      </div>

      {/* Pagination & Count */}
      <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
        <span className="text-[11px] text-neutral-400 font-mono">
          Showing {filteredCount} of {totalCount}
        </span>

        {/* Page size selector if large list */}
        {totalCount > 20 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-500">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-[11px] text-neutral-300 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={80}>80</option>
              <option value={200}>200</option>
            </select>
          </div>
        )}

        {/* Page controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1 rounded-md bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-neutral-400">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1 rounded-md bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
