import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AudioSegment, AppLanguage, GlobalEffects, ExportSettings } from '../types';
import { translations } from '../utils/translations';
import { SegmentBatchActionBar } from './segments/SegmentBatchActionBar';
import { SegmentItemCard } from './segments/SegmentItemCard';

interface SegmentListProps {
  lang: AppLanguage;
  segments: AudioSegment[];
  activeSegmentId: string | null;
  selectedSegmentIds: string[];
  playingSegmentId: string | null;
  playingSubPartKey?: string | null;
  totalDuration: number;
  exportSettings: ExportSettings;
  globalEffects: GlobalEffects;
  onSelectSegment: (id: string) => void;
  onMultiSelectSegment: (id: string, isCtrl: boolean, isShift: boolean, index: number) => void;
  onSelectAllSegments: () => void;
  onClearSelection: () => void;
  onBatchDeleteSegments: (ids: string[]) => void;
  onMergeSelectedSegments?: (ids: string[]) => void;
  onMergeWithNext?: (id: string) => void;
  onPlaySegment: (segment: AudioSegment) => void;
  onPlaySubRange?: (segmentId: string, partIndex: number, start: number, end: number) => void;
  onStopPlayback: () => void;
  onUpdateSegment: (updated: AudioSegment) => void;
  onDeleteSegment: (id: string) => void;
  onUnmergeSegment?: (id: string) => void;
  onRemovePartFromMerge?: (segmentId: string, partIndex: number) => void;
  onDownloadSingle: (segment: AudioSegment) => void;
  onCompressSegmentPauses?: (segment: AudioSegment) => void;
  onBatchRenameSegments?: (startIndex: number, names: string[]) => void;
}

export const SegmentList: React.FC<SegmentListProps> = ({
  lang = 'en',
  segments,
  activeSegmentId,
  selectedSegmentIds,
  playingSegmentId,
  playingSubPartKey,
  totalDuration,
  exportSettings,
  onSelectSegment: _onSelectSegment,
  onMultiSelectSegment,
  onSelectAllSegments,
  onClearSelection,
  onBatchDeleteSegments,
  onMergeSelectedSegments,
  onMergeWithNext,
  onPlaySegment,
  onPlaySubRange,
  onStopPlayback,
  onUpdateSegment,
  onDeleteSegment,
  onUnmergeSegment,
  onRemovePartFromMerge,
  onDownloadSingle,
  onCompressSegmentPauses,
  onBatchRenameSegments,
}) => {
  const t = translations[lang || 'en'] || translations.en;
  const [openEffectsIds, setOpenEffectsIds] = useState<Record<string, boolean>>({});
  const [openMergedDropdownIds, setOpenMergedDropdownIds] = useState<Record<string, boolean>>({});
  const effectsHoverTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const mergedHoverTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selectedSet = useMemo(() => new Set(selectedSegmentIds), [selectedSegmentIds]);

  useEffect(() => {
    return () => {
      const effectsTimers = effectsHoverTimersRef.current;
      for (const id in effectsTimers) {
        if (effectsTimers[id]) clearTimeout(effectsTimers[id]);
      }
      const mergedTimers = mergedHoverTimersRef.current;
      for (const id in mergedTimers) {
        if (mergedTimers[id]) clearTimeout(mergedTimers[id]);
      }
    };
  }, []);

  const handleEffectsMouseEnter = (id: string) => {
    const existing = effectsHoverTimersRef.current[id];
    if (existing) {
      clearTimeout(existing);
      delete effectsHoverTimersRef.current[id];
    }
    setOpenEffectsIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleEffectsMouseLeave = (id: string) => {
    const existing = effectsHoverTimersRef.current[id];
    if (existing) clearTimeout(existing);
    effectsHoverTimersRef.current[id] = setTimeout(() => {
      setOpenEffectsIds((prev) => ({ ...prev, [id]: false }));
      delete effectsHoverTimersRef.current[id];
    }, 200);
  };

  const handleMergedMouseEnter = (id: string) => {
    const existing = mergedHoverTimersRef.current[id];
    if (existing) {
      clearTimeout(existing);
      delete mergedHoverTimersRef.current[id];
    }
    setOpenMergedDropdownIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleMergedMouseLeave = (id: string) => {
    const existing = mergedHoverTimersRef.current[id];
    if (existing) clearTimeout(existing);
    mergedHoverTimersRef.current[id] = setTimeout(() => {
      setOpenMergedDropdownIds((prev) => ({ ...prev, [id]: false }));
      delete mergedHoverTimersRef.current[id];
    }, 200);
  };

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 sm:p-5 shadow-xl">
      <SegmentBatchActionBar
        lang={lang}
        totalSegmentsCount={segments.length}
        selectedCount={selectedSegmentIds.length}
        selectedSegmentIds={selectedSegmentIds}
        onSelectAllSegments={onSelectAllSegments}
        onClearSelection={onClearSelection}
        onBatchDeleteSegments={onBatchDeleteSegments}
        onMergeSelectedSegments={onMergeSelectedSegments}
        t={t}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
        {segments.map((seg, idx) => (
          <SegmentItemCard
            key={seg.id}
            segment={seg}
            index={idx}
            totalSegments={segments.length}
            lang={lang}
            isSelected={selectedSet.has(seg.id) || activeSegmentId === seg.id}
            isPlaying={playingSegmentId === seg.id && !playingSubPartKey}
            playingSubPartKey={playingSubPartKey}
            totalDuration={totalDuration}
            exportSettings={exportSettings}
            showEffects={!!openEffectsIds[seg.id]}
            showMergedDropdown={!!openMergedDropdownIds[seg.id]}
            onSelect={(isCtrl, isShift) => onMultiSelectSegment(seg.id, isCtrl, isShift, idx)}
            onPlay={() => onPlaySegment(seg)}
            onStop={onStopPlayback}
            onUpdateSegment={onUpdateSegment}
            onDelete={() => onDeleteSegment(seg.id)}
            onDownloadSingle={() => onDownloadSingle(seg)}
            onMergeWithNext={onMergeWithNext ? () => onMergeWithNext(seg.id) : undefined}
            onCompressPauses={onCompressSegmentPauses ? () => onCompressSegmentPauses(seg) : undefined}
            onToggleEffects={() =>
              setOpenEffectsIds((prev) => ({ ...prev, [seg.id]: !prev[seg.id] }))
            }
            onCloseEffects={() => setOpenEffectsIds((prev) => ({ ...prev, [seg.id]: false }))}
            onEffectsMouseEnter={() => handleEffectsMouseEnter(seg.id)}
            onEffectsMouseLeave={() => handleEffectsMouseLeave(seg.id)}
            onToggleMergedDropdown={() =>
              setOpenMergedDropdownIds((prev) => ({ ...prev, [seg.id]: !prev[seg.id] }))
            }
            onCloseMergedDropdown={() =>
              setOpenMergedDropdownIds((prev) => ({ ...prev, [seg.id]: false }))
            }
            onMergedMouseEnter={() => handleMergedMouseEnter(seg.id)}
            onMergedMouseLeave={() => handleMergedMouseLeave(seg.id)}
            onPlaySubRange={onPlaySubRange}
            onRemovePartFromMerge={onRemovePartFromMerge}
            onUnmergeSegment={onUnmergeSegment}
            onBatchRenameSegments={onBatchRenameSegments}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};
