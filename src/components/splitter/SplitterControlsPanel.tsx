import React from 'react';
import { Split, Hash, Clock, Scissors, Settings2 } from 'lucide-react';
import { SplitMode, SplitterConfig } from '../../types/splitter';

interface SplitterControlsPanelProps {
  config: SplitterConfig;
  onChangeConfig: (newConfig: Partial<SplitterConfig>) => void;
  totalDuration: number;
  manualMarkersCount: number;
  validationError?: string;
}

export const SplitterControlsPanel: React.FC<SplitterControlsPanelProps> = ({
  config,
  onChangeConfig,
  totalDuration,
  manualMarkersCount,
  validationError,
}) => {
  // Compute max safe equal parts based on minimum 0.2s per part
  const maxEqualParts = Math.max(2, Math.min(100, Math.floor(totalDuration / 0.2)));

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-100">Split Method & Configuration</h3>
            <p className="text-[11px] text-neutral-400">Choose how the audio file will be divided</p>
          </div>
        </div>
      </div>

      {/* Mode Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onChangeConfig({ mode: 'equal-parts' })}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            config.mode === 'equal-parts'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
              : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Hash className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-neutral-200">Equal Parts</h4>
            <p className="text-[11px] text-neutral-400 truncate">Split into N equal slices</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeConfig({ mode: 'by-duration' })}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            config.mode === 'by-duration'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
              : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-neutral-200">Fixed Duration</h4>
            <p className="text-[11px] text-neutral-400 truncate">Every X seconds / minutes</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeConfig({ mode: 'manual-markers' })}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
            config.mode === 'manual-markers'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
              : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-neutral-200">Manual Cut Points</h4>
            <p className="text-[11px] text-neutral-400 truncate">
              {manualMarkersCount > 0 ? `${manualMarkersCount} markers set` : 'Click to cut'}
            </p>
          </div>
        </button>
      </div>

      {/* Mode-Specific Input Fields */}
      <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3">
        {config.mode === 'equal-parts' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-neutral-200">
                Number of Equal Parts: <span className="text-emerald-400">{config.partsCount}</span>
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                ~{(totalDuration / config.partsCount).toFixed(2)}s per part
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={Math.max(2, maxEqualParts)}
                value={config.partsCount}
                onChange={(e) => onChangeConfig({ partsCount: Number(e.target.value) })}
                className="flex-1 accent-emerald-500 cursor-pointer"
              />
              <input
                type="number"
                min={2}
                max={Math.max(2, maxEqualParts)}
                value={config.partsCount}
                onChange={(e) => {
                  const val = Math.max(2, Math.min(maxEqualParts, Number(e.target.value) || 2));
                  onChangeConfig({ partsCount: val });
                }}
                className="w-16 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs text-center focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-neutral-500">Quick presets:</span>
              {[2, 3, 4, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChangeConfig({ partsCount: n })}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    config.partsCount === n
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.mode === 'by-duration' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-neutral-200">
                Split Duration (Seconds):{' '}
                <span className="text-emerald-400">{config.partDurationSec}s</span>
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                Produces ~{Math.ceil(totalDuration / Math.max(1, config.partDurationSec))} parts
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={Math.max(1, Math.floor(totalDuration))}
                value={config.partDurationSec}
                onChange={(e) => onChangeConfig({ partDurationSec: Number(e.target.value) })}
                className="flex-1 accent-teal-500 cursor-pointer"
              />
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.floor(totalDuration))}
                value={config.partDurationSec}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  onChangeConfig({ partDurationSec: val });
                }}
                className="w-20 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs text-center focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Quick Duration Presets */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-neutral-500">Quick presets:</span>
              {[
                { label: '15s', val: 15 },
                { label: '30s', val: 30 },
                { label: '45s', val: 45 },
                { label: '60s (1m)', val: 60 },
                { label: '120s (2m)', val: 120 },
                { label: '300s (5m)', val: 300 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onChangeConfig({ partDurationSec: p.val })}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    config.partDurationSec === p.val
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.mode === 'manual-markers' && (
          <div className="text-xs text-neutral-300 space-y-1">
            <p className="font-semibold text-neutral-200">
              Manual Split Mode: Place split lines at exact moments.
            </p>
            <p className="text-[11px] text-neutral-400">
              Use the timeline scrubber above to listen and pause at any point, then click{' '}
              <strong className="text-emerald-400">Split at Playhead</strong>. Each marker will cut
              the audio file at that exact timestamp.
            </p>
          </div>
        )}
      </div>

      {/* Validation error display if user requested an impossible split count */}
      {validationError && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-300 flex items-center gap-2">
          <span>⚠️ {validationError}</span>
        </div>
      )}
    </div>
  );
};
