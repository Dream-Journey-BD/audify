import React, { useState, useEffect } from 'react';
import {
  X,
  FileArchive,
  Disc,
  Music,
  FileCheck,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { SplitPart, SplitterConfig } from '../../types/splitter';
import { formatTimeCode } from '../../utils/audio/context';

interface SplitterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SplitPart[];
  totalDuration: number;
  fileName: string;
  config: SplitterConfig;
  onChangeConfig: (newConfig: Partial<SplitterConfig>) => void;
  isExporting: boolean;
  exportProgress: { percent: number; text: string };
  onExportZip: (customPrefix?: string) => void;
  onCancelExport?: () => void;
}

export const SplitterExportModal: React.FC<SplitterExportModalProps> = ({
  isOpen,
  onClose,
  parts,
  totalDuration,
  fileName,
  config,
  onChangeConfig,
  isExporting,
  exportProgress,
  onExportZip,
  onCancelExport,
}) => {
  const [prefix, setPrefix] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!isExporting) {
      setIsCancelling(false);
    }
  }, [isExporting]);

  useEffect(() => {
    if (isOpen && fileName) {
      const clean = fileName.replace(/\.[^/.]+$/, '').trim();
      setPrefix(clean || 'split_audio');
    }
  }, [isOpen, fileName]);

  if (!isOpen) return null;

  // Calculate estimated file size
  const totalSeconds = parts.reduce((acc, p) => acc + (p.end - p.start), 0);
  const estMp3Mb = ((totalSeconds * (config.bitrate || 192) * 1000) / 8 / 1024 / 1024).toFixed(1);
  const estWavMb = ((totalSeconds * 44100 * 2 * 2) / 1024 / 1024).toFixed(1);

  const handleStartExport = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExporting || parts.length === 0) return;
    onExportZip(prefix.trim() || 'split_audio');
  };

  return (
    <div
      id="splitter-export-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileArchive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-100">
                {isExporting ? 'Exporting Split Clips' : 'Export Split Clips'}
              </h3>
              <p className="text-xs text-neutral-400">
                {isExporting
                  ? 'Processing and compressing files in background thread'
                  : `${parts.length} clips ready to package and download`}
              </p>
            </div>
          </div>
          {!isExporting && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body: Transitions to dedicated Progress View when isExporting */}
        {isExporting ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 flex-1 text-center">
            {/* Spinning Visual Badge */}
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
              </div>
              <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold tracking-wider uppercase font-mono shadow-md">
                {exportProgress.percent}%
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-base font-bold text-neutral-100">
                Encoding & Archiving Clips...
              </h4>
              <p className="text-xs text-neutral-400">
                Audio is being rendered locally with hardware acceleration. Please wait a moment.
              </p>
            </div>

            {/* Seeking / Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 truncate max-w-[70%] font-mono text-[11px]">
                  {exportProgress.text || 'Preparing audio clips...'}
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {exportProgress.percent}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/80 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(4, exportProgress.percent)}%` }}
                />
              </div>
            </div>

            {/* Cancel Button */}
            {onCancelExport && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelling(true);
                    onCancelExport();
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
          <form onSubmit={handleStartExport} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto pr-2 flex-1">
              {/* 1. Format Selection */}
              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-200">
                    Audio Format & Compression
                  </label>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    {config.format.toUpperCase()} (
                    {config.format === 'mp3' ? `~${estMp3Mb} MB` : `~${estWavMb} MB`})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* MP3 Option (Recommended) */}
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ format: 'mp3' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      config.format === 'mp3'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50'
                        : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-neutral-100">MP3 (.mp3)</span>
                        <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Compact, compressed (~1.4 MB/min)
                      </p>
                    </div>
                  </button>

                  {/* WAV Option */}
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ format: 'wav' })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      config.format === 'wav'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50'
                        : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                      <Disc className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-neutral-100">WAV (.wav)</span>
                        <span className="px-1.5 py-0.2 text-[9px] rounded bg-teal-500/20 text-teal-300 font-mono">
                          Lossless
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Uncompressed 16-bit PCM (~10.5 MB/min)
                      </p>
                    </div>
                  </button>
                </div>

                {/* Notice when WAV is selected regarding file size */}
                {config.format === 'wav' && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-amber-300 text-[11px]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      WAV files are uncompressed studio master audio and will be significantly larger (approx. {estWavMb} MB total). For smaller file size, select MP3.
                    </span>
                  </div>
                )}
              </div>

              {/* 2. MP3 Bitrate (If MP3 is selected) */}
              {config.format === 'mp3' && (
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-200">
                      MP3 Encoding Bitrate
                    </label>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {config.bitrate} kbps
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { rate: 128, label: 'Compact' },
                      { rate: 192, label: 'Standard' },
                      { rate: 256, label: 'High' },
                      { rate: 320, label: 'Studio' },
                    ].map(({ rate, label }) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() =>
                          onChangeConfig({ bitrate: rate as 128 | 192 | 256 | 320 })
                        }
                        className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          config.bitrate === rate
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold'
                            : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="text-xs font-mono">{rate}k</div>
                        <div className="text-[10px] text-neutral-400">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Base Prefix & Naming */}
              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                <label className="text-xs font-semibold text-neutral-200 block">
                  Export Filename Prefix
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. podcast_part"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[11px] text-neutral-400">
                  Files will be exported as: <span className="text-emerald-400 font-mono">{prefix || 'split_audio'}_part_1.{config.format}</span>, etc.
                </p>
              </div>

              {/* 4. Ready Clips Summary Badge */}
              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">
                      {parts.length} Split Clips
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Total Duration: {formatTimeCode(totalDuration)} • Approx. {config.format === 'mp3' ? estMp3Mb : estWavMb} MB
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                  {config.format.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3.5 sm:p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="confirm-splitter-export-btn"
                type="submit"
                disabled={parts.length === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <FileArchive className="w-4 h-4 fill-current" />
                <span>Export ZIP ({parts.length})</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
