import React from 'react';
import {
  Search,
  CheckSquare,
  Square as SquareIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Trash2,
} from 'lucide-react';

interface VoiceBatchToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalItemsCount: number;
  filteredCount: number;
  selectedCount: number;
  onSelectAll: (select: boolean) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNormalizeSelected: () => void;
  onExportSelected: () => void;
  onDeleteSelected: () => void;
  isProcessing: boolean;
}

export const VoiceBatchToolbar: React.FC<VoiceBatchToolbarProps> = ({
  searchQuery,
  onSearchChange,
  totalItemsCount,
  filteredCount,
  selectedCount,
  onSelectAll,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
  onNormalizeSelected,
  onExportSelected,
  onDeleteSelected,
  isProcessing,
}) => {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input & Select All + Counter */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search voice clips by name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => onSelectAll(selectedCount !== totalItemsCount)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition text-xs font-medium cursor-pointer shrink-0"
          >
            {selectedCount === totalItemsCount && totalItemsCount > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <SquareIcon className="w-3.5 h-3.5 text-neutral-500" />
            )}
            <span>{selectedCount === totalItemsCount && totalItemsCount > 0 ? 'Deselect All' : 'Select All'}</span>
          </button>

          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold shrink-0">
              <span>{selectedCount}</span>
              <span className="hidden sm:inline">selected</span>
            </span>
          )}
        </div>

        {/* Pagination Controls & Counts */}
        <div className="flex items-center justify-between sm:justify-end gap-2 font-mono text-xs">
          <span className="text-neutral-400 text-[11px]">
            {filteredCount} total
          </span>

          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px] focus:outline-none"
          >
            <option value="12">12 / page</option>
            <option value="24">24 / page</option>
            <option value="48">48 / page</option>
            <option value="96">96 / page</option>
          </select>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-neutral-300 text-[11px] px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar - Shown when any items are selected */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-neutral-800/80 text-xs">
          <button
            onClick={onNormalizeSelected}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Level Selected</span>
          </button>

          <button
            onClick={onExportSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Selected</span>
          </button>

          <button
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 border border-rose-900/40 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}
    </div>
  );
};
