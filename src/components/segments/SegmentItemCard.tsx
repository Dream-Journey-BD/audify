import React from 'react';
import { Play, Pause, Merge, Trash2, Download, Scissors } from 'lucide-react';
import { AudioSegment, AppLanguage, ExportSettings } from '../../types';
import {
  formatSegmentFileName,
  formatTimeCode,
  calculateSegmentEffectiveDuration,
  calculateSegmentSavedGap,
} from '../../utils/audio';
import { SegmentEffectsFlyout } from './SegmentEffectsFlyout';
import { SegmentMergedPartsDropdown } from './SegmentMergedPartsDropdown';
import { SegmentNudgeControls } from './SegmentNudgeControls';

interface SegmentItemCardProps {
  segment: AudioSegment;
  index: number;
  totalSegments: number;
  lang: AppLanguage;
  isSelected: boolean;
  isPlaying: boolean;
  playingSubPartKey?: string | null;
  totalDuration: number;
  exportSettings: ExportSettings;
  showEffects: boolean;
  showMergedDropdown: boolean;
  onSelect: (isCtrl: boolean, isShift: boolean) => void;
  onPlay: () => void;
  onStop: () => void;
  onUpdateSegment: (updated: AudioSegment) => void;
  onDelete: () => void;
  onDownloadSingle: () => void;
  onMergeWithNext?: () => void;
  onCompressPauses?: () => void;
  onToggleEffects: () => void;
  onCloseEffects: () => void;
  onEffectsMouseEnter: () => void;
  onEffectsMouseLeave: () => void;
  onToggleMergedDropdown: () => void;
  onCloseMergedDropdown: () => void;
  onMergedMouseEnter: () => void;
  onMergedMouseLeave: () => void;
  onPlaySubRange?: (segmentId: string, partIndex: number, start: number, end: number) => void;
  onRemovePartFromMerge?: (segmentId: string, partIndex: number) => void;
  onUnmergeSegment?: (id: string) => void;
  t: any;
}

export const SegmentItemCard: React.FC<SegmentItemCardProps> = ({
  segment,
  index,
  totalSegments,
  lang,
  isSelected,
  isPlaying,
  playingSubPartKey,
  totalDuration,
  exportSettings,
  showEffects,
  showMergedDropdown,
  onSelect,
  onPlay,
  onStop,
  onUpdateSegment,
  onDelete,
  onDownloadSingle,
  onMergeWithNext,
  onCompressPauses,
  onToggleEffects,
  onCloseEffects,
  onEffectsMouseEnter,
  onEffectsMouseLeave,
  onToggleMergedDropdown,
  onCloseMergedDropdown,
  onMergedMouseEnter,
  onMergedMouseLeave,
  onPlaySubRange,
  onRemovePartFromMerge,
  onUnmergeSegment,
  t,
}) => {
  const rawDuration = segment.end - segment.start;
  const effectiveDur = calculateSegmentEffectiveDuration(segment, segment.maxInternalGapMs || 300);
  const savedGap = calculateSegmentSavedGap(segment, segment.maxInternalGapMs || 300);
  const isCompound = segment.subRanges && segment.subRanges.length > 1;
  const fileName = formatSegmentFileName(segment, exportSettings);
  const hasCustomEffects =
    segment.speed !== 1.0 || segment.pitch !== 0 || (segment.volume !== undefined && segment.volume !== 1.0);
  const canMergeNext = index < totalSegments - 1;

  const handleNudgeStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(segment.start + delta, segment.end - 0.05));
    onUpdateSegment({ ...segment, start: Number(newStart.toFixed(3)) });
  };

  const handleNudgeEnd = (delta: number) => {
    const newEnd = Math.max(segment.start + 0.05, Math.min(segment.end + delta, totalDuration));
    onUpdateSegment({ ...segment, end: Number(newEnd.toFixed(3)) });
  };

  return (
    <div
      onClick={(e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        onSelect(isCtrl, isShift);
      }}
      className={`rounded-xl border transition-all p-3 cursor-pointer flex flex-col justify-between select-none relative ${
        isSelected
          ? 'bg-neutral-850 border-amber-500/80 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5'
          : 'bg-neutral-950/70 hover:bg-neutral-900 border-neutral-800'
      } ${!segment.enabled ? 'opacity-50 grayscale' : ''}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              id={`play-segment-${segment.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPlaying) {
                  onStop();
                } else {
                  onPlay();
                }
              }}
              className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold transition-transform active:scale-95 cursor-pointer shadow-md ${
                isPlaying
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200 border border-neutral-700'
              }`}
              title={isPlaying ? t.pause : t.play}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-amber-400 border border-neutral-700">
                  #{segment.index}
                </span>
                <span
                  className="font-mono text-xs font-semibold text-neutral-200 truncate max-w-[130px]"
                  title={fileName}
                >
                  {fileName}
                </span>

                {isCompound && (
                  <SegmentMergedPartsDropdown
                    segment={segment}
                    showMergedDropdown={showMergedDropdown}
                    playingSubPartKey={playingSubPartKey}
                    onToggleMergedDropdown={onToggleMergedDropdown}
                    onCloseMergedDropdown={onCloseMergedDropdown}
                    onMouseEnter={onMergedMouseEnter}
                    onMouseLeave={onMergedMouseLeave}
                    onPlaySubRange={onPlaySubRange}
                    onRemovePartFromMerge={onRemovePartFromMerge}
                    onUnmergeSegment={onUnmergeSegment}
                    t={t}
                  />
                )}

                {hasCustomEffects && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {t.effectsBadge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="text-neutral-400">Length:</span>
                  <span className="text-neutral-100 font-semibold">
                    {effectiveDur >= 60 ? formatTimeCode(effectiveDur) : `${effectiveDur.toFixed(2)}s`}
                  </span>
                </span>
                {savedGap > 0.01 && (
                  <span
                    id={`saved-gap-badge-${segment.id}`}
                    className="text-[10px] sm:text-[11px] text-sky-400 font-bold bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-600/50 inline-flex items-center shadow-sm"
                    title={`Saved ${savedGap.toFixed(2)}s with max pause cap`}
                  >
                    -{savedGap.toFixed(2)}s gap cap
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {onMergeWithNext && canMergeNext && (
              <button
                id={`merge-next-btn-${segment.id}`}
                type="button"
                onClick={onMergeWithNext}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 cursor-pointer transition-colors"
                title="Merge with next clip"
              >
                <Merge className="w-3 h-3 rotate-90" />
              </button>
            )}

            {onCompressPauses && !isCompound && rawDuration > 1.2 && (
              <button
                type="button"
                onClick={onCompressPauses}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-sky-950 text-neutral-400 hover:text-sky-300 border border-neutral-700 cursor-pointer"
                title={t.compressIntraPauses}
              >
                <Scissors className="w-3 h-3 text-sky-400" />
              </button>
            )}

            <SegmentEffectsFlyout
              segment={segment}
              showEffects={showEffects}
              hasCustomEffects={hasCustomEffects}
              onToggleEffects={onToggleEffects}
              onCloseEffects={onCloseEffects}
              onMouseEnter={onEffectsMouseEnter}
              onMouseLeave={onEffectsMouseLeave}
              onUpdateSegment={onUpdateSegment}
              t={t}
            />

            <button
              type="button"
              onClick={onDownloadSingle}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 cursor-pointer"
              title={t.downloadSingle}
            >
              <Download className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-700 cursor-pointer"
              title={t.deleteSeg}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="mb-2" onClick={(e) => e.stopPropagation()}>
          <input
            id={`clip-name-input-${index}`}
            type="text"
            placeholder={`${t.customNamePlaceholder} (↵ Enter)`}
            value={segment.customName || ''}
            onChange={(e) => onUpdateSegment({ ...segment, customName: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const nextInput = document.getElementById(`clip-name-input-${index + 1}`);
                if (nextInput) {
                  (nextInput as HTMLInputElement).focus();
                  (nextInput as HTMLInputElement).select();
                } else {
                  (e.target as HTMLInputElement).blur();
                }
              }
            }}
            className="w-full px-2.5 py-1 text-xs rounded bg-neutral-900 border border-neutral-700/80 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-sans"
            title={t.pressEnterForNext || 'Press Enter for next clip name'}
          />
        </div>
      </div>

      <SegmentNudgeControls
        start={segment.start}
        end={segment.end}
        onNudgeStart={handleNudgeStart}
        onNudgeEnd={handleNudgeEnd}
      />
    </div>
  );
};
