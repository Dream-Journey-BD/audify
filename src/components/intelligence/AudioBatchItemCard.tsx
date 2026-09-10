import React, { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Sparkles,
  ArrowRight,
  FileAudio,
  Sliders,
} from 'lucide-react';
import { BatchAudioItem, NormalizationTarget } from '../../types';
import { audioBufferToWavBlob } from '../../utils/audioEngine';
import { AudioMetricsCard } from './AudioMetricsCard';

interface AudioBatchItemCardProps {
  item: BatchAudioItem;
  target: NormalizationTarget;
  isPlaying: boolean;
  activePlayingId: string | null;
  playbackSource: 'original' | 'normalized';
  onTogglePlay: (id: string, source: 'original' | 'normalized') => void;
  onNormalizeSingle: (id: string) => void;
  onUpdateTrim: (id: string, trimDb: number) => void;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export const AudioBatchItemCard: React.FC<AudioBatchItemCardProps> = ({
  item,
  target,
  isPlaying,
  activePlayingId,
  playbackSource,
  onTogglePlay,
  onNormalizeSingle,
  onUpdateTrim,
  onToggleSelect,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'original' | 'normalized'>(
    item.normalizedBuffer ? 'normalized' : 'original'
  );

  const isCurrentPlaying = isPlaying && activePlayingId === item.id;
  const hasNormalized = !!item.normalizedBuffer;
  const currentSource = isCurrentPlaying ? playbackSource : selectedSource;

  const handleDownloadWav = () => {
    const buf = item.normalizedBuffer || item.originalBuffer;
    const blob = audioBufferToWavBlob(buf);
    const clean = item.name.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clean}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id={`batch-card-${item.id}`}
      className={`rounded-2xl bg-neutral-900 border transition-all duration-200 overflow-hidden shadow-md flex flex-col justify-between ${
        item.isSelected ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-neutral-800'
      }`}
    >
      {/* Top Header: Line 1 (Checkbox + Title + Actions) & Line 2 (Play + Specs + Status) */}
      <div className="p-3 sm:p-3.5 border-b border-neutral-800/60 space-y-2.5">
        {/* Line 1: Checkbox, File Title & Action Buttons */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={!!item.isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
              title="Select file"
            />
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <FileAudio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <h3 className="font-semibold text-neutral-100 text-xs sm:text-sm truncate font-mono" title={item.name}>
                {item.name}
              </h3>
            </div>
          </div>

          {/* Actions aligned right */}
          <div className="flex items-center gap-1 shrink-0">
            {!hasNormalized && (
              <button
                onClick={() => onNormalizeSingle(item.id)}
                disabled={item.isProcessing}
                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1 shrink-0"
                title="Level Voice"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Level</span>
              </button>
            )}

            <button
              onClick={handleDownloadWav}
              className="p-1.5 sm:p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer shrink-0"
              title="Download WAV (Original Name)"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 sm:p-2 rounded-lg bg-neutral-800 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 border border-neutral-700 transition cursor-pointer shrink-0"
              title="Remove file"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 sm:p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition cursor-pointer shrink-0"
              title="Inspect Analytics & Fine-tune Trim"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          </div>
        </div>

        {/* Line 2: Play/Pause button + Specs badges (Time, Channels, kHz) + Gain/Pending Badge */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/40 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              id={`play-batch-item-${item.id}`}
              onClick={() => onTogglePlay(item.id, currentSource)}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition cursor-pointer shrink-0 shadow-md ${
                isCurrentPlaying
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-amber-500/30 ring-2 ring-amber-400/50'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
              }`}
              title={isCurrentPlaying ? 'Pause' : `Play (${currentSource})`}
            >
              {isCurrentPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono min-w-0 truncate overflow-hidden">
              <span className="shrink-0">{formatSec(item.originalBuffer.duration)}</span>
              <span>•</span>
              <span className="shrink-0">{item.originalBuffer.numberOfChannels === 1 ? 'Mono' : 'Stereo'}</span>
              <span>•</span>
              <span className="shrink-0">{Math.round(item.originalBuffer.sampleRate / 1000)}kHz</span>
            </div>
          </div>

          {/* Quick Gain or Status Badge */}
          {hasNormalized && item.normalizedAnalytics ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold shrink-0">
              Gain: {item.gainAppliedDb > 0 ? `+${item.gainAppliedDb}` : item.gainAppliedDb} dB
            </span>
          ) : (
            <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse" />
              <span>Pending</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle Body: Original vs Normalized Switch + Quick Loudness Comparison below */}
      <div className="p-3 sm:p-3.5 bg-neutral-950/40 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* A/B Switcher */}
          {hasNormalized ? (
            <div className="inline-flex rounded-lg bg-neutral-900 border border-neutral-800 p-0.5 text-xs font-mono">
              <button
                onClick={() => {
                  setSelectedSource('original');
                  if (isCurrentPlaying) onTogglePlay(item.id, 'original');
                }}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer text-[11px] ${
                  currentSource === 'original'
                    ? 'bg-neutral-800 text-amber-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => {
                  setSelectedSource('normalized');
                  if (isCurrentPlaying) onTogglePlay(item.id, 'normalized');
                }}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 text-[11px] ${
                  currentSource === 'normalized'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Normalized</span>
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500/60 animate-pulse" />
              Pending Normalization
            </span>
          )}

          {/* Difference / Gain Offset Badge */}
          {hasNormalized && item.normalizedAnalytics && (
            <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-semibold">
              Gain: {item.gainAppliedDb > 0 ? `+${item.gainAppliedDb}` : item.gainAppliedDb} dB
            </div>
          )}
        </div>

        {/* Quick Metrics Comparison Badge */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800/80 text-xs font-mono">
          <div>
            <span className="text-[10px] text-neutral-500 block uppercase">ORIGINAL</span>
            <span className="font-bold text-neutral-300 text-xs">{item.analytics.integratedLufs} LUFS</span>
          </div>

          {hasNormalized && item.normalizedAnalytics ? (
            <>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <div className="text-right">
                <span className="text-[10px] text-amber-500/80 block uppercase">NORMALIZED</span>
                <span className="font-bold text-amber-400 text-xs">{item.normalizedAnalytics.integratedLufs} LUFS</span>
              </div>
            </>
          ) : (
            <div className="text-right text-neutral-500 text-[11px]">
              Target: {target.targetLufs} LUFS
            </div>
          )}
        </div>
      </div>

      {/* Expandable Deep Analytics & Per-Item Customization View */}
      {isExpanded && (
        <div className="border-t border-neutral-800 p-4 bg-neutral-950/60 space-y-4">
          {/* Per-Item Fine-tune Gain Slider */}
          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-neutral-200">Individual Voice Trim Offset</span>
                <p className="text-[11px] text-neutral-400">
                  Fine-tune this specific speaker's volume offset without altering the global target
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-64">
              <input
                type="range"
                min="-6"
                max="6"
                step="0.5"
                value={item.customGainDb || 0}
                onChange={(e) => onUpdateTrim(item.id, parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-xs text-amber-400 font-bold w-14 text-right">
                {(item.customGainDb || 0) > 0 ? `+${item.customGainDb}` : item.customGainDb || 0} dB
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-neutral-300">
              Detailed Acoustic Profile: {currentSource.toUpperCase()} AUDIO
            </span>
            <span className="font-mono">
              Peak: {hasNormalized && currentSource === 'normalized' ? item.normalizedAnalytics?.truePeakDb : item.analytics.truePeakDb} dBFS
            </span>
          </div>

          <AudioMetricsCard
            analytics={
              hasNormalized && currentSource === 'normalized' && item.normalizedAnalytics
                ? item.normalizedAnalytics
                : item.analytics
            }
            targetLufs={target.mode === 'lufs' ? target.targetLufs : undefined}
          />
        </div>
      )}
    </div>
  );
};
