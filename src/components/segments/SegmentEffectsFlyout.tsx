import React from 'react';
import { Sliders, X, Gauge, Music2, Timer } from 'lucide-react';
import { AudioSegment } from '../../types';

interface SegmentEffectsFlyoutProps {
  segment: AudioSegment;
  showEffects: boolean;
  hasCustomEffects: boolean;
  onToggleEffects: () => void;
  onCloseEffects: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdateSegment: (updated: AudioSegment) => void;
  t: any;
}

export const SegmentEffectsFlyout: React.FC<SegmentEffectsFlyoutProps> = ({
  segment,
  showEffects,
  hasCustomEffects,
  onToggleEffects,
  onCloseEffects,
  onMouseEnter,
  onMouseLeave,
  onUpdateSegment,
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
        id={`clip-effects-toggle-${segment.id}`}
        type="button"
        onClick={onToggleEffects}
        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
          showEffects || hasCustomEffects
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
        }`}
        title={t.perSegmentEffects}
      >
        <Sliders className="w-3 h-3" />
      </button>

      {showEffects && (
        <div
          id={`clip-effects-popover-${segment.id}`}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="absolute right-0 top-full mt-1.5 z-50 w-72 sm:w-80 max-w-[min(320px,calc(100vw-3rem))] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-left space-y-3 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.perSegmentEffects}</span>
            </div>
            <button
              type="button"
              onClick={onCloseEffects}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-300 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-sky-400" />
                <span>{t.speedRate}</span>
              </span>
              <span className="font-mono text-sky-400 font-bold">
                {(segment.speed || 1.0).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={segment.speed || 1.0}
              onChange={(e) =>
                onUpdateSegment({ ...segment, speed: Number(e.target.value) })
              }
              className="w-full accent-sky-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-300 flex items-center gap-1">
                <Music2 className="w-3 h-3 text-purple-400" />
                <span>{t.pitchShift}</span>
              </span>
              <span className="font-mono text-purple-400 font-bold">
                {(segment.pitch || 0) > 0 ? `+${segment.pitch}` : segment.pitch} st
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={segment.pitch || 0}
              onChange={(e) =>
                onUpdateSegment({ ...segment, pitch: Number(e.target.value) })
              }
              className="w-full accent-purple-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-300 flex items-center gap-1">
                <Timer className="w-3 h-3 text-amber-400" />
                <span>{t.maxMergeGapLabel || 'Max Merge Gap'}</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {segment.maxInternalGapMs || 300} ms
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="25"
              value={segment.maxInternalGapMs || 300}
              onChange={(e) =>
                onUpdateSegment({ ...segment, maxInternalGapMs: Number(e.target.value) })
              }
              className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>
        </div>
      )}
    </div>
  );
};
