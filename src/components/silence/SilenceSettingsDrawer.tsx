import React from 'react';
import { RotateCcw } from 'lucide-react';
import { SilenceDetectionSettings, AppLanguage } from '../../types';
import { InfoButton } from '../InfoModal';
import { translations } from '../../utils/translations';

interface SilenceSettingsDrawerProps {
  lang?: AppLanguage;
  settings: SilenceDetectionSettings;
  onUpdateSettings: (newSettings: SilenceDetectionSettings) => void;
  onOpenInfo: (key: keyof typeof translations.en.settingInfo) => void;
  t: any;
}

export const SilenceSettingsDrawer: React.FC<SilenceSettingsDrawerProps> = ({
  lang,
  settings,
  onUpdateSettings,
  onOpenInfo,
  t,
}) => {
  const handleResetDefaults = () => {
    onUpdateSettings({
      thresholdDb: -38,
      minSilenceDuration: 0.25,
      padding: 0.06,
      minSpeechDuration: 0.12,
      maxInternalGapMs: 300,
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-neutral-950/60 p-4 rounded-xl">
      <div>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-neutral-300 font-medium flex items-center gap-1">
            <span>{t.silenceThreshold}</span>
            <InfoButton settingKey="thresholdDb" lang={lang} onOpenInfo={onOpenInfo} />
          </span>
          <span className="font-mono text-amber-400 font-bold">{settings.thresholdDb} dB</span>
        </div>
        <input
          type="range"
          min="-60"
          max="-15"
          step="1"
          value={settings.thresholdDb}
          onChange={(e) =>
            onUpdateSettings({ ...settings, thresholdDb: Number(e.target.value) })
          }
          className="w-full accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
        />
        <p className="text-[10px] text-neutral-500 mt-1">
          Lower = more sensitive, Higher = aggressive
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-neutral-300 font-medium flex items-center gap-1">
            <span>{t.minSilence}</span>
            <InfoButton settingKey="minSilence" lang={lang} onOpenInfo={onOpenInfo} />
          </span>
          <span className="font-mono text-amber-400 font-bold">
            {Math.round(settings.minSilenceDuration * 1000)} ms
          </span>
        </div>
        <input
          type="range"
          min="0.05"
          max="1.5"
          step="0.05"
          value={settings.minSilenceDuration}
          onChange={(e) =>
            onUpdateSettings({
              ...settings,
              minSilenceDuration: Number(e.target.value),
            })
          }
          className="w-full accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
        />
        <p className="text-[10px] text-neutral-500 mt-1">
          Minimum quiet gap duration to split
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-neutral-300 font-medium flex items-center gap-1">
            <span>{t.maxMergeGapLabel || 'Max Merge Gap'}</span>
            <InfoButton settingKey="maxInternalGap" lang={lang} onOpenInfo={onOpenInfo} />
          </span>
          <span className="font-mono text-sky-400 font-bold">
            {settings.maxInternalGapMs || 300} ms
          </span>
        </div>
        <input
          id="max-merge-gap-slider"
          type="range"
          min="50"
          max="2000"
          step="25"
          value={settings.maxInternalGapMs || 300}
          onChange={(e) =>
            onUpdateSettings({
              ...settings,
              maxInternalGapMs: Number(e.target.value),
            })
          }
          className="w-full accent-sky-500 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
        />
        <p className="text-[10px] text-sky-400/80 mt-1">
          Caps silence gap between merged parts (50ms - 2000ms)
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-neutral-300 font-medium flex items-center gap-1">
            <span>{t.padding}</span>
            <InfoButton settingKey="padding" lang={lang} onOpenInfo={onOpenInfo} />
          </span>
          <span className="font-mono text-amber-400 font-bold">
            {Math.round(settings.padding * 1000)} ms
          </span>
        </div>
        <input
          type="range"
          min="0.0"
          max="0.25"
          step="0.01"
          value={settings.padding}
          onChange={(e) =>
            onUpdateSettings({ ...settings, padding: Number(e.target.value) })
          }
          className="w-full accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
        />
        <p className="text-[10px] text-neutral-500 mt-1">
          Extra margin buffer around speech
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-neutral-300 font-medium flex items-center gap-1">
            <span>{t.minSpeech}</span>
            <InfoButton settingKey="minSpeech" lang={lang} onOpenInfo={onOpenInfo} />
          </span>
          <span className="font-mono text-amber-400 font-bold">
            {Math.round(settings.minSpeechDuration * 1000)} ms
          </span>
        </div>
        <input
          type="range"
          min="0.05"
          max="0.5"
          step="0.02"
          value={settings.minSpeechDuration}
          onChange={(e) =>
            onUpdateSettings({
              ...settings,
              minSpeechDuration: Number(e.target.value),
            })
          }
          className="w-full accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer h-1.5"
        />
        <p className="text-[10px] text-neutral-500 mt-1">
          Filter short transients & mouth pops
        </p>
      </div>

      <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
        <button
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Defaults</span>
        </button>
      </div>
    </div>
  );
};
