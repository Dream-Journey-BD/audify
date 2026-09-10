import React from 'react';
import { ListChecks, Layers, Trash2, CheckSquare, HelpCircle, FileAudio } from 'lucide-react';
import { AppLanguage } from '../../types';

interface SegmentBatchActionBarProps {
  lang: AppLanguage;
  totalSegmentsCount: number;
  selectedCount: number;
  selectedSegmentIds: string[];
  onSelectAllSegments: () => void;
  onClearSelection: () => void;
  onBatchDeleteSegments: (ids: string[]) => void;
  onMergeSelectedSegments?: (ids: string[]) => void;
  t: any;
}

export const SegmentBatchActionBar: React.FC<SegmentBatchActionBarProps> = ({
  lang,
  totalSegmentsCount,
  selectedCount,
  selectedSegmentIds,
  onSelectAllSegments,
  onClearSelection,
  onBatchDeleteSegments,
  onMergeSelectedSegments,
  t,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-amber-400" />
          <span>{t.segmentsList}</span>
          <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
            {totalSegmentsCount} {t.clipCount || t.clips}
          </span>
        </h3>
        <p className="text-xs text-neutral-400">{t.segmentsListSub}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {selectedCount > 1 ? (
          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 flex-wrap">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">{selectedCount}</span>
              <span className="text-neutral-400 text-xs">{t.selectedShort || 'Selected'}</span>
            </span>

            {onMergeSelectedSegments && selectedCount >= 2 && (
              <button
                id="merge-selected-segments-btn"
                type="button"
                onClick={() => onMergeSelectedSegments(selectedSegmentIds)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 hover:text-sky-100 text-xs font-medium border border-sky-700/60 cursor-pointer transition-colors"
                title={t.mergeSelected || 'Merge Selected'}
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.mergeSelected || 'Merge'}</span>
              </button>
            )}

            <button
              id="delete-selected-segments-btn"
              type="button"
              onClick={() => onBatchDeleteSegments(selectedSegmentIds)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-medium border border-red-800/60 cursor-pointer transition-colors"
              title={t.deleteSelected || 'Delete Selected'}
            >
              <Trash2 className="w-3 h-3" />
              <span>{t.deleteSelected || 'Delete'}</span>
            </button>

            <button
              id="clear-selected-segments-btn"
              type="button"
              onClick={onClearSelection}
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium cursor-pointer transition-colors"
              title={t.clearSelection || 'Clear Selection'}
            >
              {t.clearSelection || 'Clear'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAllSegments}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 cursor-pointer transition-colors"
              title={t.selectAll || 'Select All Segments'}
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.selectAll || 'Select All'}</span>
            </button>

            <div className="relative group">
              <div
                className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-amber-400 border border-neutral-700/80 cursor-help transition-colors flex items-center justify-center"
                title={t.multiSelectHint}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </div>

              <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-64 p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl shadow-2xl text-[11px] text-neutral-300 leading-relaxed pointer-events-none">
                <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  <span>Selection Guide</span>
                </div>
                <ul className="space-y-1 text-neutral-400 list-disc list-inside">
                  <li>
                    <span className="text-neutral-200">Ctrl / Cmd + Click:</span> Select multiple individual clips
                  </li>
                  <li>
                    <span className="text-neutral-200">Shift + Click:</span> Select a range of clips
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
