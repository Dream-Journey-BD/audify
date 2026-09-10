import React from 'react';
import {
  Sliders,
  Sparkles,
  Layers,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { AppLanguage, NormalizationPreset, NormalizationTarget } from '../../types';
import { translations } from '../../utils/translations';
import { NormalizationMasteringGrid } from './NormalizationMasteringGrid';

interface NormalizationControlBarProps {
  target: NormalizationTarget;
  onChangeTarget: (target: NormalizationTarget, autoApply?: boolean) => void;
  onNormalizeAll: () => void;
  onOpenExportModal: () => void;
  onOpenComparison: () => void;
  onAddFiles?: () => void;
  onResetFiles?: () => void;
  lang?: AppLanguage;
  isProcessing: boolean;
  totalCount: number;
  normalizedCount: number;
  progressPercent: number;
  isPlaying: boolean;
}

export const NormalizationControlBar: React.FC<NormalizationControlBarProps> = ({
  target,
  onChangeTarget,
  onNormalizeAll,
  onOpenExportModal,
  onOpenComparison,
  onAddFiles,
  onResetFiles,
  lang,
  isProcessing,
  totalCount,
  normalizedCount,
  progressPercent,
  isPlaying,
}) => {
  const t = translations[lang || 'en'] || translations.en;
  const handleSelectPreset = (preset: NormalizationPreset) => {
    let updatedTarget: NormalizationTarget = { ...target };
    switch (preset) {
      case 'clear_speech':
        updatedTarget = {
          ...target,
          mode: 'lufs',
          preset,
          targetLufs: -15,
          targetPeakDb: -1.0,
          enableCompressor: true,
          compressorThresholdDb: -24,
          compressorRatio: 2.5,
          enableHighPass: true,
          enableWarmthEQ: true,
          preventClipping: true,
          customGainOffsetDb: 0,
        };
        break;
      case 'youtube':
      case 'spotify':
        updatedTarget = {
          ...target,
          mode: 'lufs',
          preset,
          targetLufs: -14,
          targetPeakDb: -1.0,
        };
        break;
      case 'podcast':
        updatedTarget = {
          ...target,
          mode: 'lufs',
          preset,
          targetLufs: -16,
          targetPeakDb: -1.0,
        };
        break;
      case 'dialogue_clean':
        updatedTarget = {
          ...target,
          mode: 'lufs',
          preset,
          targetLufs: -18,
          targetPeakDb: -1.0,
        };
        break;
      case 'broadcast_ebu':
        updatedTarget = {
          ...target,
          mode: 'lufs',
          preset,
          targetLufs: -23,
          targetPeakDb: -1.0,
        };
        break;
      case 'peak_minus1':
        updatedTarget = {
          ...target,
          mode: 'peak',
          preset,
          targetPeakDb: -1.0,
        };
        break;
      case 'custom':
        updatedTarget = { ...target, preset: 'custom' };
        break;
    }
    onChangeTarget(updatedTarget, true);
  };

  const presets: { id: NormalizationPreset; label: string; desc: string }[] = [
    { id: 'podcast', label: 'Podcast (-16 LUFS)', desc: 'Standard vocal clarity' },
    { id: 'youtube', label: 'YouTube (-14 LUFS)', desc: 'Online video target' },
    { id: 'spotify', label: 'Spotify (-14 LUFS)', desc: 'Streaming audio standard' },
    { id: 'dialogue_clean', label: 'Voice Dialogue (-18 LUFS)', desc: 'Natural audiobook level' },
    { id: 'broadcast_ebu', label: 'EBU R128 (-23 LUFS)', desc: 'TV broadcast requirement' },
    { id: 'peak_minus1', label: 'Peak (-1.0 dBFS)', desc: 'Max peak ceiling' },
    { id: 'clear_speech', label: 'Clear Speech (-15 LUFS)', desc: 'High vocal presence, leveler comp & warmth boost' },
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-4">
      {/* Top Header & Batch Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400" />
              {t.tabIntelligence || 'Voice Leveler'}
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
              Match perceived loudness & true peak across all voice clips
            </p>
          </div>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center justify-start md:justify-end gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {totalCount > 1 && (
            <button
              id="view-comparison-btn"
              onClick={onOpenComparison}
              disabled={isProcessing}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] sm:text-xs font-semibold border border-neutral-700 transition cursor-pointer shadow-sm disabled:opacity-50"
              title="Compare all voices in a matrix table"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Compare</span>
            </button>
          )}

          {onAddFiles && (
            <button
              id="action-add-files-btn"
              type="button"
              onClick={onAddFiles}
              disabled={isProcessing}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] sm:text-xs font-bold border border-neutral-700 hover:border-neutral-600 transition shadow-sm cursor-pointer disabled:opacity-50"
              title="Add more voice tracks"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[2.5] shrink-0" />
              <span>{t.addFilesBtn || 'Add Files'}</span>
            </button>
          )}

          <button
            id="normalize-all-voices-btn"
            onClick={onNormalizeAll}
            disabled={isProcessing || totalCount === 0}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 text-[11px] sm:text-xs font-bold shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>
              {isProcessing
                ? `Leveling (${progressPercent}%)...`
                : (t.levelAllBtn || 'Level All')}
            </span>
          </button>

          {onResetFiles && (
            <button
              id="reset-voice-leveler-files-btn"
              type="button"
              onClick={onResetFiles}
              disabled={isProcessing}
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 text-neutral-400 text-xs font-medium border border-neutral-700/80 transition cursor-pointer disabled:opacity-40"
              title="Clear all voice tracks"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Target Presets Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
          <span>Target Preset</span>
          <span className="text-[10px] text-neutral-500 font-normal">
            (Auto-applies to all tracks)
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {presets.map((p) => {
            const isSelected = target.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                disabled={isProcessing}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md shadow-amber-500/10'
                    : 'bg-neutral-950/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                }`}
                title={p.desc}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <NormalizationMasteringGrid
        target={target}
        onChangeTarget={onChangeTarget}
      />
    </div>
  );
};
