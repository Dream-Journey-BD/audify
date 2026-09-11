import React from 'react';
import {
  X,
  Download,
  FileArchive,
  FileAudio,
  Sparkles,
  Disc,
  Music,
  FileCheck,
  Layers,
} from 'lucide-react';
import { BatchAudioItem, IntelligenceExportConfig, Mp3Bitrate, NormalizationTarget } from '../../types';

interface IntelligenceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchAudioItem[];
  target: NormalizationTarget;
  config: IntelligenceExportConfig;
  onUpdateConfig: (config: IntelligenceExportConfig) => void;
  isExporting: boolean;
  exportProgress: { percent: number; currentFile: string };
  onExportZip: () => void;
  onExportJoined: () => void;
  onCancel?: () => void;
}

export const IntelligenceExportModal: React.FC<IntelligenceExportModalProps> = ({
  isOpen,
  onClose,
  items,
  target,
  config,
  onUpdateConfig,
  isExporting,
  exportProgress,
  onExportZip,
  onExportJoined,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-100">
                Export Leveled Audio
              </h3>
              <p className="text-xs text-neutral-400">
                {items.length} voice clip{items.length === 1 ? '' : 's'} • Target: {target.targetLufs} LUFS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Audio Format Selection */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <span>Audio Format</span>
              </label>
              <span className="text-[11px] text-violet-400 font-mono font-bold">
                {config.format.toUpperCase()} (
                {config.format === 'mp3' ? `${config.mp3Bitrate} kbps` : '16-bit PCM Lossless'})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* WAV Option */}
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, format: 'wav' })}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  config.format === 'wav'
                    ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50'
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
                    Broadcast master standard
                  </p>
                </div>
              </button>

              {/* MP3 Option */}
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, format: 'mp3' })}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  config.format === 'mp3'
                    ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50'
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-neutral-100">MP3 (.mp3)</span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-violet-500/20 text-violet-300 font-mono">
                      LAME
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Compressed lightweight
                  </p>
                </div>
              </button>
            </div>

            {/* MP3 Bitrate Options */}
            {config.format === 'mp3' && (
              <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-neutral-300 font-medium">MP3 Bitrate:</span>
                <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  {([128, 192, 256, 320] as Mp3Bitrate[]).map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => onUpdateConfig({ ...config, mp3Bitrate: br })}
                      className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                        config.mp3Bitrate === br
                          ? 'bg-violet-600 text-white font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {br}k
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clean Ready Status Box with Original File Names Note */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
              <FileCheck className="w-4 h-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <span>Original File Names Preserved</span>
                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono text-[10px]">
                  {items.length} {items.length === 1 ? 'file' : 'files'}
                </span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-1">
                All voice clips will be exported with their original upload names in .{config.format} format, fully normalized to {target.targetLufs} LUFS.
              </p>
            </div>
          </div>

          {/* Joined Export Pause Settings (when joining) */}
          <div className="p-3.5 rounded-xl bg-neutral-950/40 border border-neutral-800/80 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span>Pause Between Joined Clips</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Silence gap when exporting as single joined track
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={config.joinedPauseDuration}
                onChange={(e) =>
                  onUpdateConfig({
                    ...config,
                    joinedPauseDuration: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-16 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs font-mono text-center focus:outline-none focus:border-violet-500"
              />
              <span className="text-xs text-neutral-400 font-mono">s</span>
            </div>
          </div>

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs text-violet-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting & Encoding Files...</span>
                </span>
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
                  className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-200"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
              {exportProgress.currentFile && (
                <p className="text-[11px] font-mono text-neutral-400 truncate">
                  Encoding: {exportProgress.currentFile}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Download Actions */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onExportJoined}
            disabled={isExporting || items.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-semibold border border-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Concatenates all leveled voice clips into a single continuous master track"
          >
            <FileAudio className="w-4 h-4 text-emerald-400" />
            <span>Export Joined</span>
          </button>

          <button
            type="button"
            onClick={onExportZip}
            disabled={isExporting || items.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-500/20 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Download all leveled voices packaged in a ZIP"
          >
            <FileArchive className="w-4 h-4 fill-current" />
            <span>Export ZIP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
