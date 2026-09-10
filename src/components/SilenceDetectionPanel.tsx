import React, { useState } from 'react';
import { Sliders, Sparkles, Wand2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { SilenceDetectionSettings, AppLanguage, AudioSegment } from '../types';
import { translations } from '../utils/translations';
import { calculateSegmentSavedGap, calculateSegmentEffectiveDuration } from '../utils/audio';
import { SilenceMetricsCards } from './silence/SilenceMetricsCards';
import { SilenceSettingsDrawer } from './silence/SilenceSettingsDrawer';

interface SilenceDetectionPanelProps {
  lang: AppLanguage;
  settings: SilenceDetectionSettings;
  onUpdateSettings: (newSettings: SilenceDetectionSettings) => void;
  onRunDetection: () => void;
  onCompressAllPauses?: () => void;
  totalDuration: number;
  segments: AudioSegment[];
  isDetecting: boolean;
  onOpenInfo: (key: keyof typeof translations.bn.settingInfo) => void;
}

export const SilenceDetectionPanel: React.FC<SilenceDetectionPanelProps> = ({
  lang,
  settings,
  onUpdateSettings,
  onRunDetection,
  onCompressAllPauses,
  totalDuration,
  segments,
  isDetecting,
  onOpenInfo,
}) => {
  const t = translations[lang];
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeSegments = segments.filter((s) => s.enabled);
  const speechDuration = activeSegments.reduce(
    (acc, s) => acc + calculateSegmentEffectiveDuration(s, settings.maxInternalGapMs || 300),
    0
  );
  const totalInternalSaved = activeSegments.reduce(
    (acc, s) => acc + calculateSegmentSavedGap(s, settings.maxInternalGapMs || 300),
    0
  );
  const silenceRemoved = Math.max(0, totalDuration - speechDuration);
  const savedPercent = totalDuration > 0 ? Math.round((silenceRemoved / totalDuration) * 100) : 0;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 sm:p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Wand2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
              {t.removeAllGaps}
            </h3>
            <p className="text-xs text-neutral-400 max-w-xl">
              Smart RMS analyzer scans the entire audio, removes silence gaps, and isolates distinct spoken clips
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onCompressAllPauses &&
            activeSegments.some(
              (s) => (s.subRanges && s.subRanges.length > 1) || s.end - s.start > 1.2
            ) && (
              <button
                id="compress-all-pauses-btn"
                type="button"
                onClick={onCompressAllPauses}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 text-xs sm:text-sm font-medium border border-sky-800/60 transition-colors cursor-pointer"
                title={t.compressAllPauses}
              >
                <Zap className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">{t.compressAllPauses}</span>
                <span className="sm:hidden">Auto-Cap</span>
              </button>
            )}

          <button
            id="advanced-settings-toggle"
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs sm:text-sm font-medium border border-neutral-700 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-neutral-400" />
            <span>{t.gapSettings}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            id="run-remove-gaps-btn"
            type="button"
            onClick={onRunDetection}
            disabled={isDetecting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isDetecting ? (
              <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 fill-current" />
            )}
            <span>{t.removeAllGaps}</span>
          </button>
        </div>
      </div>

      {showAdvanced && (
        <SilenceSettingsDrawer
          lang={lang}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onOpenInfo={onOpenInfo}
          t={t}
        />
      )}

      <SilenceMetricsCards
        totalDuration={totalDuration}
        speechDuration={speechDuration}
        silenceRemoved={silenceRemoved}
        savedPercent={savedPercent}
        totalInternalSaved={totalInternalSaved}
        activeSegmentsCount={activeSegments.length}
        t={t}
      />
    </div>
  );
};
