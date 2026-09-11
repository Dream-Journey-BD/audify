import React from 'react';
import { Loader2, XCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface TgVoiceBatchBannerProps {
  totalCount: number;
  readyCount: number;
  processingCount: number;
  pendingCount: number;
  errorCount: number;
  batchPercent: number;
  onCancelPending: () => void;
}

export const TgVoiceBatchBanner: React.FC<TgVoiceBatchBannerProps> = ({
  totalCount,
  readyCount,
  processingCount,
  pendingCount,
  errorCount,
  batchPercent,
  onCancelPending,
}) => {
  if (totalCount === 0 || (pendingCount === 0 && processingCount === 0)) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-neutral-900/95 border border-sky-500/30 shadow-lg shadow-sky-950/20 backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-100 flex items-center gap-2">
              <span>Converting to Telegram Voice (.ogg Opus)</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {batchPercent}%
              </span>
            </h4>
            <p className="text-[11px] text-neutral-400">
              Processing in background without blocking browser UI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
            {readyCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {readyCount} ready
              </span>
            )}
            {processingCount > 0 && (
              <span className="flex items-center gap-1 text-sky-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {processingCount} active
              </span>
            )}
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400/90">
                <Clock className="w-3 h-3" />
                {pendingCount} queued
              </span>
            )}
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {errorCount} failed
              </span>
            )}
          </div>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onCancelPending}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-red-400 text-xs font-medium transition-colors border border-neutral-700 cursor-pointer"
              title="Cancel remaining queued items"
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Cancel Queued</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-300 rounded-full"
          style={{ width: `${Math.max(3, batchPercent)}%` }}
        />
      </div>
    </div>
  );
};
