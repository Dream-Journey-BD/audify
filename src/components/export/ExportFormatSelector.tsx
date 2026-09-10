import React from 'react';
import { Disc, Music } from 'lucide-react';
import { ExportSettings, Mp3Bitrate, AppLanguage } from '../../types';
import { InfoButton } from '../InfoModal';
import { translations } from '../../utils/translations';

interface ExportFormatSelectorProps {
  lang: AppLanguage;
  settings: ExportSettings;
  onUpdateSettings: (settings: ExportSettings) => void;
  onOpenInfo: (key: keyof typeof translations.en.settingInfo) => void;
  t: any;
}

export const ExportFormatSelector: React.FC<ExportFormatSelectorProps> = ({
  lang,
  settings,
  onUpdateSettings,
  onOpenInfo,
  t,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1">
          <span>{t.exportFormat}</span>
          <InfoButton settingKey="exportFormat" lang={lang} onOpenInfo={onOpenInfo} />
        </label>
        <span className="text-[11px] text-amber-400 font-mono">
          {settings.exportAudioFormat.toUpperCase()} (
          {settings.exportAudioFormat === 'mp3' ? `${settings.mp3Bitrate} kbps` : '16-bit PCM'})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* WAV Option */}
        <button
          type="button"
          onClick={() => onUpdateSettings({ ...settings, exportAudioFormat: 'wav' })}
          className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
            settings.exportAudioFormat === 'wav'
              ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
              : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Disc className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-neutral-100">WAV (.wav)</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Lossless
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Uncompressed 16-bit PCM studio master
            </p>
          </div>
        </button>

        {/* MP3 Option */}
        <button
          type="button"
          onClick={() => onUpdateSettings({ ...settings, exportAudioFormat: 'mp3' })}
          className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
            settings.exportAudioFormat === 'mp3'
              ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
              : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-neutral-100">MP3 (.mp3)</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-500/20 text-amber-300 font-mono">
                Compressed
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Universal lightweight compressed audio
            </p>
          </div>
        </button>
      </div>

      {/* MP3 Bitrate Options */}
      {settings.exportAudioFormat === 'mp3' && (
        <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-neutral-300 font-medium">
            <span>{t.mp3BitrateLabel}</span>
            <InfoButton settingKey="mp3Bitrate" lang={lang} onOpenInfo={onOpenInfo} />
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
            {([128, 192, 256, 320] as Mp3Bitrate[]).map((br) => (
              <button
                key={br}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, mp3Bitrate: br })}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  settings.mp3Bitrate === br
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {br}k
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
