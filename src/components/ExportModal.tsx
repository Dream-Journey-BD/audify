import React from 'react';
import {
  X,
  FileArchive,
  FileAudio,
  Settings,
  FileCheck,
  Loader2,
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
  const [isCancelling, setIsCancelling] = React.useState(false);

  React.useEffect(() => {
    if (!isExporting) {
      setIsCancelling(false);
    }
  }, [isExporting]);

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
        {isExporting ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 flex-1 text-center">
            {/* Spinning Visual Badge */}
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
              </div>
              <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold tracking-wider uppercase font-mono shadow-md">
                {exportProgress.percent}%
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-base font-bold text-neutral-100">
                {t.exporting || 'Exporting Audio Clips...'}
              </h4>
              <p className="text-xs text-neutral-400">
                Rendering and packaging clips with audio effects applied. Please do not close this window.
              </p>
            </div>

            {/* Seeking / Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 truncate max-w-[70%] font-mono text-[11px]">
                  {exportProgress.currentFile
                    ? `${t.renderingFile || 'Rendering'}: ${exportProgress.currentFile}`
                    : `${exportProgress.current} / ${exportProgress.total} clips`}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {exportProgress.percent}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/80 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(4, exportProgress.percent)}%` }}
                />
              </div>
            </div>

            {/* Cancel Button */}
            {onCancel && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelling(true);
                    onCancel();
                  }}
                  disabled={isCancelling}
                  className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-red-400 hover:text-red-300 text-xs font-semibold border border-red-500/30 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Cancel Export</span>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
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
            </div>

            {/* Modal Footer / Download Actions */}
            <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onExportJoined}
                disabled={activeSegments.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs sm:text-sm font-semibold border border-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileAudio className="w-4 h-4 text-emerald-400" />
                <span>{t.downloadJoined}</span>
              </button>

              <button
                id="confirm-zip-download-btn"
                type="button"
                onClick={onExportZip}
                disabled={activeSegments.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <FileArchive className="w-4 h-4 fill-current" />
                <span>{t.downloadZip}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
