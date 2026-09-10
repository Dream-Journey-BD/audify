import React from 'react';
import {
  X,
  FileArchive,
  FileAudio,
  Settings,
  FileCheck,
} from 'lucide-react';
import { ExportSettings, AudioSegment, AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { ExportFormatSelector } from './export/ExportFormatSelector';
import { ExportNamingSettings } from './export/ExportNamingSettings';

interface ExportModalProps {
  isOpen: boolean;
  lang: AppLanguage;
  settings: ExportSettings;
  segments: AudioSegment[];
  isExporting: boolean;
  exportProgress: { current: number; total: number; percent: number; currentFile?: string };
  onClose: () => void;
  onUpdateSettings: (settings: ExportSettings) => void;
  onExportZip: () => void;
  onExportJoined: () => void;
  onCancel?: () => void;
  onOpenInfo: (key: keyof typeof translations.en.settingInfo) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  lang,
  settings,
  segments,
  isExporting,
  exportProgress,
  onClose,
  onUpdateSettings,
  onExportZip,
  onExportJoined,
  onCancel,
  onOpenInfo,
}) => {
  if (!isOpen) return null;

  const t = translations[lang || 'en'] || translations.en;
  const activeSegments = segments.filter((s) => s.enabled);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-100">{t.exportModalTitle}</h3>
              <p className="text-xs text-neutral-400">{t.exportModalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto pr-2">
          <ExportFormatSelector
            lang={lang}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onOpenInfo={onOpenInfo}
            t={t}
          />

          <ExportNamingSettings
            lang={lang}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onOpenInfo={onOpenInfo}
            t={t}
          />

          {/* Ready Clips Summary Badge */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">
                  Clips Ready to Export
                </span>
                <p className="text-[11px] text-neutral-400">
                  {activeSegments.length} clips will be exported in {settings.exportAudioFormat.toUpperCase()} format
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold shrink-0 self-start sm:self-auto">
              {activeSegments.length} {t.clips}
            </span>
          </div>

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
                <span>{t.exporting}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{exportProgress.percent}%</span>
                  {onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="px-2 py-0.5 rounded text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-200"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
              {exportProgress.currentFile && (
                <p className="text-[11px] font-mono text-neutral-400 truncate">
                  {t.renderingFile}: {exportProgress.currentFile}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Download Actions */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onExportJoined}
            disabled={isExporting || activeSegments.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-semibold border border-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileAudio className="w-4 h-4 text-emerald-400" />
            <span>{t.downloadJoined}</span>
          </button>

          <button
            id="confirm-zip-download-btn"
            type="button"
            onClick={onExportZip}
            disabled={isExporting || activeSegments.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <FileArchive className="w-4 h-4 fill-current" />
            <span>{t.downloadZip}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
