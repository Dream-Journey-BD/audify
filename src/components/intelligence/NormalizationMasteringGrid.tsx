import React from 'react';
import { Volume2, ShieldCheck } from 'lucide-react';
import { NormalizationTarget } from '../../types';

interface NormalizationMasteringGridProps {
  target: NormalizationTarget;
  onChangeTarget: (target: NormalizationTarget) => void;
}

export const NormalizationMasteringGrid: React.FC<NormalizationMasteringGridProps> = ({
  target,
  onChangeTarget,
}) => {
  return (
    <>
      {/* Granular Mastering Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2 border-t border-neutral-800/60">
        {/* Target LUFS Slider */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-neutral-300">Target Loudness</span>
            <span className="font-mono text-amber-400 font-bold">{target.targetLufs} LUFS</span>
          </div>
          <input
            type="range"
            min="-30"
            max="-8"
            step="0.5"
            value={target.targetLufs}
            onChange={(e) =>
              onChangeTarget({
                ...target,
                mode: 'lufs',
                preset: 'custom',
                targetLufs: parseFloat(e.target.value),
              })
            }
            className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
            <span>-30 (Soft)</span>
            <span>-16 (Podcast)</span>
            <span>-8 (Max)</span>
          </div>
        </div>

        {/* Peak Ceiling Slider */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-neutral-300">True Peak Ceiling</span>
            <span className="font-mono text-neutral-200 font-bold">{target.targetPeakDb} dBFS</span>
          </div>
          <input
            type="range"
            min="-3.0"
            max="-0.1"
            step="0.1"
            value={target.targetPeakDb}
            onChange={(e) =>
              onChangeTarget({
                ...target,
                preset: 'custom',
                targetPeakDb: parseFloat(e.target.value),
              })
            }
            className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
            <span>-3.0 dB</span>
            <span>-1.0 dB (Ceiling)</span>
            <span>-0.1 dB</span>
          </div>
        </div>

        {/* Master Fine-tune Trim */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-amber-400" />
              <span>Master Trim</span>
            </span>
            <span className="font-mono text-neutral-200 font-bold">
              {target.customGainOffsetDb > 0 ? `+${target.customGainOffsetDb}` : target.customGainOffsetDb} dB
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={target.customGainOffsetDb || 0}
            onChange={(e) =>
              onChangeTarget({
                ...target,
                customGainOffsetDb: parseFloat(e.target.value),
              })
            }
            className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
            <span>-12 dB</span>
            <span>0 dB (Neutral)</span>
            <span>+12 dB</span>
          </div>
        </div>

        {/* Dynamic Voice Leveler (Compressor) */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Voice Leveler</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Smooth whispers vs shouts
              </p>
            </div>
            <input
              type="checkbox"
              id="enable-voice-compressor"
              checked={target.enableCompressor}
              onChange={(e) =>
                onChangeTarget({
                  ...target,
                  enableCompressor: e.target.checked,
                })
              }
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer mt-0.5"
            />
          </div>

          {target.enableCompressor ? (
            <div className="mt-1.5 pt-1.5 border-t border-neutral-800/80">
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>Threshold:</span>
                <span className="font-mono text-amber-400">{target.compressorThresholdDb} dB</span>
              </div>
              <input
                type="range"
                min="-36"
                max="-12"
                step="1"
                value={target.compressorThresholdDb}
                onChange={(e) =>
                  onChangeTarget({
                    ...target,
                    compressorThresholdDb: parseInt(e.target.value),
                  })
                }
                className="w-full accent-amber-400 h-1 bg-neutral-800 rounded cursor-pointer"
              />
            </div>
          ) : (
            <div className="text-[10px] text-neutral-500 font-mono mt-2">
              Bypassed
            </div>
          )}
        </div>
      </div>

      {/* Voice Polish: 80Hz Rumble Filter & Vocal Warmth/Presence Switches */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-neutral-800/60 text-xs">
        <label className="flex items-center gap-2 cursor-pointer bg-neutral-950/50 hover:bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800/80 transition">
          <input
            type="checkbox"
            checked={target.enableHighPass}
            onChange={(e) => onChangeTarget({ ...target, enableHighPass: e.target.checked })}
            className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
          />
          <span className="text-neutral-300 font-medium">80Hz Rumble Cut</span>
          <span className="text-[10px] text-neutral-500 font-mono">(Cuts mic boominess & pop thumps)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer bg-neutral-950/50 hover:bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800/80 transition">
          <input
            type="checkbox"
            checked={target.enableWarmthEQ}
            onChange={(e) => onChangeTarget({ ...target, enableWarmthEQ: e.target.checked })}
            className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
          />
          <span className="text-neutral-300 font-medium">Vocal Presence Boost</span>
          <span className="text-[10px] text-neutral-500 font-mono">(+2.5 dB clarity around 3kHz)</span>
        </label>
      </div>
    </>
  );
};
