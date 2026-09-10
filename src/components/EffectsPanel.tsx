import React from 'react';
import { Sliders, Gauge, Music2, Volume2, Sparkles, RotateCcw, Activity } from 'lucide-react';
import { GlobalEffects, AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { InfoButton } from './InfoModal';

interface EffectsPanelProps {
  lang?: AppLanguage;
  effects: GlobalEffects;
  onChangeEffects: (updated: GlobalEffects) => void;
  onOpenInfo: (key: keyof typeof translations.en.settingInfo) => void;
  isPlaying?: boolean;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  lang = 'en',
  effects,
  onChangeEffects,
  onOpenInfo,
  isPlaying,
}) => {
  const t = translations[lang || 'en'] || translations.en;

  const handleReset = () => {
    onChangeEffects({
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
      normalize: true,
    });
  };

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-neutral-100">{t.effectsTitle}</h3>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono animate-pulse">
                  <Activity className="w-3 h-3" />
                  <span>Live Active</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">{t.globalEffects}</p>
          </div>
        </div>

        <button
          id="reset-effects-btn"
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.resetEffects}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Speed / Playback Rate */}
        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-neutral-300 font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.speedRate}</span>
              <InfoButton settingKey="speedRate" lang={lang} onOpenInfo={onOpenInfo} />
            </span>
            <span className="font-mono text-sky-400 font-bold">{effects.speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={effects.speed}
            onChange={(e) => onChangeEffects({ ...effects, speed: Number(e.target.value) })}
            className="w-full accent-sky-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
            <span>0.5x</span>
            <span>1.0x (Normal)</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Pitch Shift */}
        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-neutral-300 font-medium flex items-center gap-1">
              <Music2 className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.pitchShift}</span>
              <InfoButton settingKey="pitchShift" lang={lang} onOpenInfo={onOpenInfo} />
            </span>
            <span className="font-mono text-purple-400 font-bold">
              {effects.pitch > 0 ? `+${effects.pitch}` : effects.pitch} st
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            step="1"
            value={effects.pitch}
            onChange={(e) => onChangeEffects({ ...effects, pitch: Number(e.target.value) })}
            className="w-full accent-purple-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
            <span>-12 (Deep)</span>
            <span>0</span>
            <span>+12 (High)</span>
          </div>
        </div>

        {/* Volume Boost / Normalization */}
        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-neutral-300 font-medium flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.volume}</span>
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {Math.round(effects.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={effects.volume}
              onChange={(e) => onChangeEffects({ ...effects, volume: Number(e.target.value) })}
              className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>

          <label className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800 cursor-pointer">
            <span className="text-xs text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.normalize}</span>
              <InfoButton settingKey="normalize" lang={lang} onOpenInfo={onOpenInfo} />
            </span>
            <input
              type="checkbox"
              checked={effects.normalize}
              onChange={(e) => onChangeEffects({ ...effects, normalize: e.target.checked })}
              className="rounded accent-amber-500 cursor-pointer w-4 h-4"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
