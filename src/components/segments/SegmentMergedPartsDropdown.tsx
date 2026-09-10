import React from 'react';
import { Sparkles, ChevronUp, ChevronDown, X, Play, Pause, SplitSquareVertical } from 'lucide-react';
import { AudioSegment } from '../../types';
import { formatTimeCode } from '../../utils/audio';

interface SegmentMergedPartsDropdownProps {
  segment: AudioSegment;
  showMergedDropdown: boolean;
  playingSubPartKey?: string | null;
  onToggleMergedDropdown: () => void;
  onCloseMergedDropdown: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPlaySubRange?: (segmentId: string, partIndex: number, start: number, end: number) => void;
  onRemovePartFromMerge?: (segmentId: string, partIndex: number) => void;
  onUnmergeSegment?: (id: string) => void;
  t: any;
}

export const SegmentMergedPartsDropdown: React.FC<SegmentMergedPartsDropdownProps> = ({
  segment,
  showMergedDropdown,
  playingSubPartKey,
  onToggleMergedDropdown,
  onCloseMergedDropdown,
  onMouseEnter,
  onMouseLeave,
  onPlaySubRange,
  onRemovePartFromMerge,
  onUnmergeSegment,
  t,
}) => {
  return (
    <div
      className="relative inline-block"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        id={`merged-parts-dropdown-toggle-${segment.id}`}
        type="button"
        onClick={onToggleMergedDropdown}
        className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1.5 font-semibold transition-colors cursor-pointer border shadow-sm ${
          showMergedDropdown
            ? 'bg-sky-500 text-neutral-950 border-sky-400 font-bold'
            : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40'
        }`}
        title={`${segment.subRanges?.length} parts merged with max gap limit`}
      >
        <Sparkles className="w-3 h-3 text-sky-400" />
        <span>
          {segment.subRanges?.length} {t.mergedBadge}
        </span>
        {showMergedDropdown ? (
          <ChevronUp className="w-3 h-3 ml-0.5" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-0.5" />
        )}
      </button>

      {showMergedDropdown && (
        <div
          id={`merged-parts-dropdown-menu-${segment.id}`}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 max-w-[min(320px,calc(100vw-3rem))] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-left before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {t.mergedPartsList || 'Merged Parts'} ({segment.subRanges?.length})
              </span>
            </div>
            <button
              type="button"
              onClick={onCloseMergedDropdown}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {segment.subRanges?.map((sub, sIdx) => {
              const partDur = sub.end - sub.start;
              const isSubPartPlaying = playingSubPartKey === `${segment.id}-${sIdx}`;
              return (
                <div
                  key={sIdx}
                  id={`merged-subpart-item-${segment.id}-${sIdx}`}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-colors ${
                    isSubPartPlaying
                      ? 'bg-amber-950/40 border-amber-500/50'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {onPlaySubRange && (
                      <button
                        id={`play-subpart-btn-${segment.id}-${sIdx}`}
                        type="button"
                        onClick={() => onPlaySubRange(segment.id, sIdx, sub.start, sub.end)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-95 shadow-sm ${
                          isSubPartPlaying
                            ? 'bg-amber-500 text-neutral-950'
                            : 'bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-300'
                        }`}
                        title={isSubPartPlaying ? t.pause : t.previewPart || 'Preview this part'}
                      >
                        {isSubPartPlaying ? (
                          <Pause className="w-2.5 h-2.5 fill-current" />
                        ) : (
                          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                        )}
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-neutral-200 truncate">
                        {t.part || 'Part'} {sIdx + 1}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {formatTimeCode(sub.start)} - {formatTimeCode(sub.end)} ({partDur.toFixed(2)}s)
                      </div>
                    </div>
                  </div>

                  {onRemovePartFromMerge && (
                    <button
                      id={`remove-subpart-btn-${segment.id}-${sIdx}`}
                      type="button"
                      onClick={() => {
                        onRemovePartFromMerge(segment.id, sIdx);
                        if (segment.subRanges && segment.subRanges.length <= 2) {
                          onCloseMergedDropdown();
                        }
                      }}
                      className="px-2 py-1 rounded bg-sky-950/90 hover:bg-sky-900 text-sky-300 hover:text-sky-100 border border-sky-700/60 text-[10px] font-medium transition-colors cursor-pointer shrink-0"
                      title={
                        t.removePartFromMerge ||
                        'Remove from merge and restore as individual clip in sequence'
                      }
                    >
                      <span>{t.unmerge || 'Remove'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {onUnmergeSegment && (
            <div className="mt-2.5 pt-2 border-t border-neutral-800 space-y-1.5">
              <button
                id={`unmerge-all-parts-dropdown-btn-${segment.id}`}
                type="button"
                onClick={() => {
                  onUnmergeSegment(segment.id);
                  onCloseMergedDropdown();
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-700/60 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title={t.unmergeTip || 'Split this merged clip back into individual components'}
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span>{t.unmergeAllParts || 'Unmerge all'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
