import React from 'react';
import { Clock, Sparkles, VolumeX, Timer, Layers } from 'lucide-react';
import { formatTimeCode } from '../../utils/audio';

interface SilenceMetricsCardsProps {
  totalDuration: number;
  speechDuration: number;
  silenceRemoved: number;
  savedPercent: number;
  totalInternalSaved: number;
  activeSegmentsCount: number;
  t: any;
}

export const SilenceMetricsCards: React.FC<SilenceMetricsCardsProps> = ({
  totalDuration,
  speechDuration,
  silenceRemoved,
  savedPercent,
  totalInternalSaved,
  activeSegmentsCount,
  t,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-3 border-t border-neutral-800/60">
      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
          <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="truncate">{t.totalDuration}</span>
        </div>
        <p className="font-mono text-sm sm:text-base font-bold text-neutral-200">
          {formatTimeCode(totalDuration)}
        </p>
      </div>

      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400/90 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{t.speechDuration}</span>
        </div>
        <p className="font-mono text-sm sm:text-base font-bold text-emerald-400">
          {formatTimeCode(speechDuration)}
        </p>
      </div>

      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 mb-1">
          <VolumeX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{t.silenceRemoved}</span>
        </div>
        <p className="font-mono text-sm sm:text-base font-bold text-amber-400">
          {formatTimeCode(silenceRemoved)}{' '}
          <span className="text-xs font-normal text-amber-500/80">(-{savedPercent}%)</span>
        </p>
      </div>

      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-sky-400/90 mb-1">
          <Timer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">{t.gapCapped || 'Gap Capped'}</span>
        </div>
        <p className="font-mono text-sm sm:text-base font-bold text-sky-400">
          {totalInternalSaved > 0 ? `-${formatTimeCode(totalInternalSaved)}` : '00:00.00'}
        </p>
      </div>

      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center gap-1.5 text-[11px] text-purple-400/90 mb-1">
          <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate">{t.segmentsCount}</span>
        </div>
        <p className="font-mono text-sm sm:text-base font-bold text-purple-400">
          {activeSegmentsCount} {t.clips}
        </p>
      </div>
    </div>
  );
};
