import React, { useRef } from 'react';
import {
  Play,
  Pause,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  FileAudio,
  FileVideo,
  Waves,
} from 'lucide-react';
import { TgVoiceItem } from '../../types';
import { formatTimeCode } from '../../utils/audio/context';

interface TgVoiceItemCardProps {
  item: TgVoiceItem;
  isPlaying: boolean;
  currentTime: number;
  masterEchoLevel?: number;
  onTogglePlay: (id: string) => void;
  onSeek: (id: string, time: number) => void;
  onDownloadSingle: (item: TgVoiceItem) => void;
  onRemove: (id: string) => void;
  onRetry: (item: TgVoiceItem) => void;
  onBitrateChange?: (id: string, bitrate: number | 'original') => void;
  onEchoChange?: (id: string, echoLevel: number) => void;
}

export const TgVoiceItemCard: React.FC<TgVoiceItemCardProps> = ({
  item,
  isPlaying,
  currentTime,
  masterEchoLevel = 0,
  onTogglePlay,
  onSeek,
  onDownloadSingle,
  onRemove,
  onRetry,
  onBitrateChange,
  onEchoChange,
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const isVideo =
    item.file.type.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(item.originalName);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (item.status !== 'ready' || !waveformRef.current || !item.duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTarget = fraction * item.duration;
    onSeek(item.id, seekTarget);
  };

  const progressFraction =
    isPlaying && item.duration > 0 ? Math.min(1, currentTime / item.duration) : 0;

  return (
    <div
      id={`tg-voice-card-${item.id}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-md flex flex-col justify-between ${
        item.status === 'ready'
          ? isPlaying
            ? 'bg-neutral-900 border-sky-500/60 ring-1 ring-sky-500/30'
            : 'bg-neutral-900/90 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          : item.status === 'error'
          ? 'bg-neutral-900 border-rose-800/60'
          : 'bg-neutral-900/80 border-neutral-800'
      }`}
    >
      {/* Top Header: Filename & Action Buttons */}
      <div className="p-3.5 sm:p-4 border-b border-neutral-800/60">
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* File Name & Icon */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isVideo
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
              }`}
            >
              {isVideo ? <FileVideo className="w-4 h-4" /> : <FileAudio className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="font-semibold text-neutral-100 text-xs sm:text-sm truncate font-mono"
                title={item.originalName}
              >
                {item.originalName}
              </h3>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-mono truncate">
                <span className="text-sky-400 font-medium">Output: {item.outputName}</span>
                <span>•</span>
                <span>{formatFileSize(item.size)}</span>
                {item.duration > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatTimeCode(item.duration, false)}</span>
                  </>
                )}
              </p>

              {/* Compact Bitrate Spinner for this media item */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[11px] text-neutral-400 font-medium">Bitrate:</span>
                <select
                  id={`bitrate-spinner-${item.id}`}
                  value={item.selectedBitrate ?? 'original'}
                  onChange={(e) =>
                    onBitrateChange?.(
                      item.id,
                      e.target.value === 'original' ? 'original' : Number(e.target.value)
                    )
                  }
                  className="bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-[11px] rounded-lg px-2 py-0.5 border border-neutral-700 focus:outline-none focus:border-sky-500 cursor-pointer font-mono"
                  title="Select bitrate for this file"
                >
                  <option value="original">
                    Original ({item.originalBitrate ? `${item.originalBitrate}k` : 'Auto'})
                  </option>
                  <option value={16}>16 kbps</option>
                  <option value={24}>24 kbps</option>
                  <option value={32}>32 kbps</option>
                  <option value={48}>48 kbps</option>
                  <option value={64}>64 kbps (Standard)</option>
                  <option value={96}>96 kbps</option>
                  <option value={128}>128 kbps</option>
                  <option value={160}>160 kbps</option>
                  <option value={192}>192 kbps</option>
                  <option value={256}>256 kbps</option>
                  <option value={320}>320 kbps</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Action Icons: Download Single & Delete */}
          <div className="flex items-center gap-1.5 shrink-0">
            {item.status === 'ready' && (
              <button
                id={`download-btn-${item.id}`}
                onClick={() => onDownloadSingle(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-xs font-semibold transition-colors border border-sky-500/30 cursor-pointer shadow-sm"
                title={`Download ${item.outputName}`}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <button
              id={`remove-btn-${item.id}`}
              onClick={() => onRemove(item.id)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Body: Processing, Error, or Telegram Voice Player */}
      <div className="p-3.5 sm:p-4 bg-neutral-950/40">
        {item.status === 'processing' && (
          <div className="space-y-2.5 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-sky-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </span>
              <span className="font-mono text-neutral-400">{item.progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-200 rounded-full"
                style={{ width: `${Math.max(5, item.progress)}%` }}
              />
            </div>
          </div>
        )}

        {item.status === 'error' && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="truncate">{item.error || 'Failed to process file.'}</span>
            </div>
            <button
              onClick={() => onRetry(item)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-rose-200 cursor-pointer shrink-0 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {item.status === 'ready' && (
          <>
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Round Telegram Voice Play/Pause Button */}
              <button
                id={`play-btn-${item.id}`}
                onClick={() => onTogglePlay(item.id)}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/25 transition-transform active:scale-95 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play preview'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-neutral-950" />
                ) : (
                  <Play className="w-5 h-5 fill-neutral-950 ml-0.5" />
                )}
              </button>

              {/* Telegram-style Scrubbable Waveform Bars */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div
                  ref={waveformRef}
                  onClick={handleWaveformClick}
                  className="h-9 flex items-center justify-between gap-[2px] sm:gap-1 px-1 py-1 rounded-lg hover:bg-neutral-800/40 cursor-pointer transition-colors select-none"
                  title="Click to seek"
                >
                  {(item.waveformPeaks && item.waveformPeaks.length > 0
                    ? item.waveformPeaks
                    : Array.from({ length: 48 }, () => 0.4)
                  ).map((peak, idx, arr) => {
                    const barFraction = idx / arr.length;
                    const isPast = barFraction <= progressFraction;

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex items-center justify-center h-full"
                      >
                        <div
                          className={`w-full max-w-[4px] rounded-full transition-colors duration-100 ${
                            isPast
                              ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.4)]'
                              : 'bg-neutral-700 hover:bg-neutral-600'
                          }`}
                          style={{ height: `${Math.round(peak * 100)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Time Codes: Elapsed & Total */}
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-1">
                  <span className={isPlaying ? 'text-sky-400 font-semibold' : ''}>
                    {isPlaying ? formatTimeCode(currentTime, false) : '00:00'}
                  </span>
                  <span>{formatTimeCode(item.duration, false)}</span>
                </div>
              </div>
            </div>

            {/* Individual Item Echo Controller with Real-Time Audition */}
            <div className="mt-3 pt-2.5 border-t border-neutral-800/70 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Waves className={`w-3.5 h-3.5 shrink-0 ${masterEchoLevel > 0 ? 'text-sky-400/70' : 'text-sky-400'}`} />
                <span className="text-[11px] font-medium text-neutral-300 shrink-0">Echo:</span>
                <input
                  id={`echo-slider-${item.id}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterEchoLevel > 0 ? masterEchoLevel : (item.echoLevel ?? 0)}
                  disabled={masterEchoLevel > 0}
                  onChange={(e) => onEchoChange?.(item.id, parseFloat(e.target.value))}
                  className={`w-full max-w-[130px] sm:max-w-[170px] h-1.5 rounded-lg appearance-none accent-sky-400 ${
                    masterEchoLevel > 0
                      ? 'bg-neutral-800 opacity-60 cursor-not-allowed'
                      : 'bg-neutral-800 cursor-pointer'
                  }`}
                  title={
                    masterEchoLevel > 0
                      ? `Master Echo is active (${Math.round(masterEchoLevel * 100)}%). Adjust via Master Echo Controller above.`
                      : `Adjust Echo for ${item.originalName}: ${Math.round((item.echoLevel ?? 0) * 100)}% (live real-time preview during playback)`
                  }
                />
                <span className="text-[11px] font-mono text-sky-400 font-semibold w-8 shrink-0">
                  {Math.round((masterEchoLevel > 0 ? masterEchoLevel : (item.echoLevel ?? 0)) * 100)}%
                </span>
              </div>

              {masterEchoLevel > 0 ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-semibold">
                    Master Active
                  </span>
                </div>
              ) : (item.echoLevel ?? 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => onEchoChange?.(item.id, 0)}
                  className="text-[10px] text-neutral-400 hover:text-neutral-200 px-2 py-0.5 rounded bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/60 transition-colors cursor-pointer shrink-0 font-mono"
                  title="Reset to 0% (Dry audio)"
                >
                  Reset
                </button>
              ) : (
                <span className="text-[10px] text-neutral-500 font-mono shrink-0 px-1">
                  Dry
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
