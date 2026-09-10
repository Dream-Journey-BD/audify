import React from 'react';
import { ExportSettings, AppLanguage } from '../../types';
import { InfoButton } from '../InfoModal';
import { translations } from '../../utils/translations';

interface ExportNamingSettingsProps {
  lang: AppLanguage;
  settings: ExportSettings;
  onUpdateSettings: (settings: ExportSettings) => void;
  onOpenInfo: (key: keyof typeof translations.en.settingInfo) => void;
  t: any;
}

export const ExportNamingSettings: React.FC<ExportNamingSettingsProps> = ({
  lang,
  settings,
  onUpdateSettings,
  onOpenInfo,
  t,
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-neutral-800">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1">
            <span>{t.filePattern}</span>
            <InfoButton settingKey="fileNamePattern" lang={lang} onOpenInfo={onOpenInfo} />
          </label>
        </div>

        <input
          type="text"
          value={settings.prefix}
          onChange={(e) => onUpdateSettings({ ...settings, prefix: e.target.value })}
          placeholder={t.namePrefixPlaceholder}
          className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500 font-mono text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
        <p className="text-[11px] text-neutral-400 mt-1 break-words">
          e.g., <span className="font-mono text-amber-400">clip</span> will generate{' '}
          <span className="font-mono text-neutral-300">
            clip_01.{settings.exportAudioFormat}
          </span>
          ,{' '}
          <span className="font-mono text-neutral-300">
            clip_02.{settings.exportAudioFormat}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Separator */}
        <div>
          <label className="block text-xs text-neutral-300 mb-1">{t.separator}</label>
          <select
            value={settings.separator}
            onChange={(e) => onUpdateSettings({ ...settings, separator: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs font-mono focus:outline-none focus:border-amber-500"
          >
            <option value="_">_ (Underscore)</option>
            <option value="-">- (Hyphen)</option>
            <option value=" ">  (Space)</option>
          </select>
        </div>

        {/* Number Format */}
        <div>
          <label className="block text-xs text-neutral-300 mb-1">{t.digitFormat}</label>
          <select
            value={settings.digits}
            onChange={(e) =>
              onUpdateSettings({ ...settings, digits: Number(e.target.value) })
            }
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs font-mono focus:outline-none focus:border-amber-500"
          >
            <option value="2">01, 02, 03 (2 Digits)</option>
            <option value="1">1, 2, 3 (1 Digit)</option>
            <option value="3">001, 002 (3 Digits)</option>
          </select>
        </div>

        {/* Starting Number */}
        <div>
          <label className="block text-xs text-neutral-300 mb-1">{t.startNumber}</label>
          <input
            type="number"
            min="1"
            value={settings.startNumber}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                startNumber: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs font-mono focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
    </div>
  );
};
