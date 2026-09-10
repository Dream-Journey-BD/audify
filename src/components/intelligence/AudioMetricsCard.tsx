import React from 'react';
import { Volume2, Mic, Music, Gauge, ShieldAlert, Sparkles, Waves } from 'lucide-react';
import { LoudnessAnalytics } from '../../types';

interface AudioMetricsCardProps {
  analytics: LoudnessAnalytics;
  targetLufs?: number;
  compact?: boolean;
}

export const AudioMetricsCard: React.FC<AudioMetricsCardProps> = ({
  analytics,
  targetLufs,
  compact = false,
}) => {
  const getAssessmentBadge = (assessment: LoudnessAnalytics['assessment']) => {
    switch (assessment) {
      case 'clipping':
        return { text: 'Clipping Risk', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: ShieldAlert };
      case 'loud':
        return { text: 'Very Loud', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Volume2 };
      case 'quiet':
        return { text: 'Quiet Voice', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Volume2 };
      case 'optimal':
      default:
        return { text: 'Balanced / Compliant', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: Sparkles };
    }
  };

  const badge = getAssessmentBadge(analytics.assessment);
  const BadgeIcon = badge.icon;

  const getCentroidLabel = (hz: number) => {
    if (hz < 1200) return 'Warm / Deep';
    if (hz > 2500) return 'Crisp / Bright';
    return 'Balanced';
  };

  return (
    <div className={`rounded-xl bg-neutral-900/90 border border-neutral-800/80 ${compact ? 'p-3' : 'p-4'} text-neutral-200`}>
      {/* Top Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Acoustic & Loudness Intelligence
          </span>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${badge.bg}`}>
          <BadgeIcon className="w-3 h-3" />
          <span>{badge.text}</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        {/* 1. Integrated Loudness (LUFS) */}
        <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] text-neutral-400 font-medium">Integrated Loudness</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
            {analytics.integratedLufs} <span className="text-xs font-normal text-neutral-400">LUFS</span>
          </div>
          {targetLufs !== undefined && (
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
              Diff: {Number((targetLufs - analytics.integratedLufs).toFixed(1))} LU
            </div>
          )}
        </div>

        {/* 2. Peak & True Peak */}
        <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] text-neutral-400 font-medium">True Peak / Peak</div>
          <div className="text-lg font-bold font-mono text-neutral-200 mt-0.5">
            {analytics.truePeakDb} <span className="text-xs font-normal text-neutral-400">dBFS</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            Sample Peak: {analytics.peakDb} dB
          </div>
        </div>

        {/* 3. RMS Average Power */}
        <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] text-neutral-400 font-medium">RMS Average Energy</div>
          <div className="text-lg font-bold font-mono text-neutral-200 mt-0.5">
            {analytics.rmsDb} <span className="text-xs font-normal text-neutral-400">dBFS</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            Crest Factor: {analytics.crestFactorDb} dB
          </div>
        </div>

        {/* 4. Pitch & Vocal Tone */}
        <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
          <div className="text-[11px] text-neutral-400 font-medium">Vocal Pitch (F0)</div>
          <div className="text-lg font-bold font-mono text-neutral-200 mt-0.5 flex items-baseline gap-1.5">
            <span>{analytics.pitchHz > 0 ? `${analytics.pitchHz} Hz` : 'N/A'}</span>
            {analytics.pitchNote !== 'N/A' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                {analytics.pitchNote}
              </span>
            )}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            Tone: {getCentroidLabel(analytics.spectralCentroidHz)}
          </div>
        </div>
      </div>

      {/* Speech vs Silence & Spectral Balance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Speech Activity Bar */}
        <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              Speech Activity Ratio
            </span>
            <span className="font-mono text-neutral-200">{analytics.speechRatio}% Active</span>
          </div>
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden flex">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${analytics.speechRatio}%` }}
              title={`Speech: ${analytics.speechDuration}s`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
            <span>Spoken: {analytics.speechDuration}s</span>
            <span>Pauses: {analytics.silenceDuration}s</span>
            <span>Floor: {analytics.estimatedNoiseFloorDb} dB</span>
          </div>
        </div>

        {/* Spectral Energy Balance */}
        <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Waves className="w-3.5 h-3.5 text-amber-400" />
              Frequency Energy Split
            </span>
            <span className="font-mono text-neutral-300">{analytics.spectralCentroidHz} Hz Brightness</span>
          </div>
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden flex gap-0.5">
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${analytics.spectralEnergy.low}%` }}
              title={`Bass (20-250Hz): ${analytics.spectralEnergy.low}%`}
            />
            <div
              className="bg-yellow-400 h-full"
              style={{ width: `${analytics.spectralEnergy.mid}%` }}
              title={`Vocal Mids (250Hz-4kHz): ${analytics.spectralEnergy.mid}%`}
            />
            <div
              className="bg-emerald-400 h-full"
              style={{ width: `${analytics.spectralEnergy.high}%` }}
              title={`Treble (4k-20kHz): ${analytics.spectralEnergy.high}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
            <span className="text-amber-400/90">Low {analytics.spectralEnergy.low}%</span>
            <span className="text-yellow-400/90">Mid {analytics.spectralEnergy.mid}%</span>
            <span className="text-emerald-400/90">High {analytics.spectralEnergy.high}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
