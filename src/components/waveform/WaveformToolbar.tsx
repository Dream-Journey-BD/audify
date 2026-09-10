import React from 'react';
import { Play, Pause, ZoomIn, ZoomOut, Maximize2, Crop, Plus } from 'lucide-react';
import { formatTimeCode } from '../../utils/audio';

interface WaveformToolbarProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  totalDuration: number;
  activeSegmentId: string | null;
  activeSegmentIndex?: number;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onResetZoom: () => void;
  showCropPanel: boolean;
  setShowCropPanel: React.Dispatch<React.SetStateAction<boolean>>;
  isCropped?: boolean;
  onCropAudio?: (start: number, end: number) => void;
  onAddSegmentAtPlayhead?: () => void;
  t: any;
}

export const WaveformToolbar: React.FC<WaveformToolbarProps> = ({
  isPlaying,
  onPlayPause,
  currentTime,
  totalDuration,
  activeSegmentId,
  activeSegmentIndex,
  zoom,
  setZoom,
  onResetZoom,
  showCropPanel,
  setShowCropPanel,
  isCropped,
  onCropAudio,
  onAddSegmentAtPlayhead,
  t,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-3">
        <button
          id="waveform-play-toggle"
          onClick={onPlayPause}
          className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <div className="font-mono text-xs sm:text-sm">
          <span className="text-amber-400 font-bold text-base">
            {formatTimeCode(currentTime)}
          </span>
          <span className="text-neutral-500 mx-1.5">/</span>
          <span className="text-neutral-400">{formatTimeCode(totalDuration)}</span>
        </div>

        {activeSegmentId && activeSegmentIndex !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
            <span>
              {t.selectedSeg}: #{activeSegmentIndex}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {onCropAudio && (
          <button
            id="crop-range-toggle-btn"
            onClick={() => setShowCropPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showCropPanel || isCropped
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            }`}
            title="Crop audio selection range"
          >
            <Crop className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.cropToolTitle.split(' ')[0]}</span>
          </button>
        )}

        {onAddSegmentAtPlayhead && (
          <button
            id="add-segment-btn"
            onClick={onAddSegmentAtPlayhead}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 cursor-pointer"
            title="Add a new segment around current playhead position"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{t.addSegment}</span>
          </button>
        )}

        <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 border border-neutral-700">
          <button
            onClick={() => setZoom((z) => Math.max(1, z > 4 ? z - 2 : z - 0.5))}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-700 cursor-pointer"
            title={t.zoomOut}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1.5 text-neutral-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(16, z >= 4 ? z + 2 : z + 0.5))}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-700 cursor-pointer"
            title={t.zoomIn}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-700 cursor-pointer border-l border-neutral-700 ml-0.5"
            title={t.zoomFit}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
