import React from 'react';
import { Crop, Flag, RotateCcw } from 'lucide-react';
import { formatTimeCode } from '../../utils/audio';

interface WaveformCropPanelProps {
  showCropPanel: boolean;
  cropStart: number;
  cropEnd: number;
  currentTime: number;
  setCropStart: (time: number) => void;
  setCropEnd: (time: number) => void;
  onApplyCrop: () => void;
  isCropped?: boolean;
  onResetCropAudio?: () => void;
  t: any;
}

export const WaveformCropPanel: React.FC<WaveformCropPanelProps> = ({
  showCropPanel,
  cropStart,
  cropEnd,
  currentTime,
  setCropStart,
  setCropEnd,
  onApplyCrop,
  isCropped,
  onResetCropAudio,
  t,
}) => {
  if (!showCropPanel) return null;

  return (
    <div className="mb-3 p-3 rounded-xl bg-blue-950/30 border border-blue-900/60 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-blue-200">
        <Crop className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-semibold">{t.cropToolTitle}:</span>
        <span className="text-neutral-400 hidden sm:inline">{t.cropToolDesc}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-700">
          <span className="text-neutral-400 text-[11px]">{t.cropInPoint}:</span>
          <span className="font-mono text-blue-300 font-semibold">
            {formatTimeCode(cropStart)}
          </span>
          <button
            type="button"
            onClick={() => setCropStart(currentTime)}
            className="p-1 text-neutral-400 hover:text-blue-300 rounded hover:bg-neutral-800"
            title={t.setInFromPlayhead}
          >
            <Flag className="w-3 h-3 text-blue-400" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded border border-neutral-700">
          <span className="text-neutral-400 text-[11px]">{t.cropOutPoint}:</span>
          <span className="font-mono text-blue-300 font-semibold">
            {formatTimeCode(cropEnd)}
          </span>
          <button
            type="button"
            onClick={() => setCropEnd(currentTime)}
            className="p-1 text-neutral-400 hover:text-blue-300 rounded hover:bg-neutral-800"
            title={t.setOutFromPlayhead}
          >
            <Flag className="w-3 h-3 text-blue-400" />
          </button>
        </div>

        <button
          type="button"
          onClick={onApplyCrop}
          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer shadow-sm"
        >
          {t.cropApplyBtn}
        </button>

        {isCropped && onResetCropAudio && (
          <button
            type="button"
            onClick={onResetCropAudio}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t.cropResetBtn}</span>
          </button>
        )}
      </div>
    </div>
  );
};
