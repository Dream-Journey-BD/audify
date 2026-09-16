import React, { useRef, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, Scissors, Plus, Trash2 } from 'lucide-react';
import { formatTimeCode } from '../../utils/audio/context';
import { extractWaveformPeaks } from '../../utils/audio/waveformAnalysis';
import { SplitPart } from '../../types/splitter';

interface SplitterWaveformViewProps {
  audioBuffer: AudioBuffer;
  currentTime: number;
  isPlaying: boolean;
  parts: SplitPart[];
  manualCutPoints: number[];
  mode: 'equal-parts' | 'by-duration' | 'manual-markers';
  onSeek: (time: number) => void;
  onAddMarkerAtCurrentTime: () => void;
  onAddMarkerAtPosition: (time: number) => void;
  onRemoveMarker: (markerTime: number) => void;
  onClearManualMarkers: () => void;
}

export const SplitterWaveformView: React.FC<SplitterWaveformViewProps> = ({
  audioBuffer,
  currentTime,
  isPlaying,
  parts,
  manualCutPoints,
  mode,
  onSeek,
  onAddMarkerAtCurrentTime,
  onAddMarkerAtPosition,
  onRemoveMarker,
  onClearManualMarkers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const duration = audioBuffer.duration;

  // Pre-calculate downsampled peaks once per audioBuffer instead of iterating millions of samples on every frame
  const peaks = useMemo(() => {
    if (!audioBuffer) return null;
    return extractWaveformPeaks(audioBuffer, 1200);
  }, [audioBuffer]);

  // Render Waveform on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Subtle horizontal center line
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const amp = height / 2;
    const totalBuckets = peaks.max.length;
    const barWidth = Math.max(1, width / totalBuckets);

    // Draw pre-calculated waveform peaks smoothly
    for (let i = 0; i < totalBuckets; i++) {
      const x = (i / totalBuckets) * width;
      const minVal = peaks.min[i];
      const maxVal = peaks.max[i];

      const y1 = (1 + minVal) * amp;
      const y2 = Math.max(2, (maxVal - minVal) * amp);

      const timeAtCol = (i / totalBuckets) * duration;
      if (timeAtCol <= currentTime) {
        ctx.fillStyle = '#34d399'; // Emerald 400 (played)
      } else {
        ctx.fillStyle = '#065f46'; // Emerald 800 (unplayed)
      }

      ctx.fillRect(x, y1, barWidth, y2);
    }

    // Draw split boundaries (parts)
    if (parts.length > 1) {
      parts.forEach((part, idx) => {
        if (idx > 0) {
          const x = (part.start / duration) * width;
          ctx.strokeStyle = '#f59e0b'; // Amber 500 marker line
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Draw manual cut points if in manual mode
    if (mode === 'manual-markers') {
      manualCutPoints.forEach((cutTime) => {
        const x = (cutTime / duration) * width;
        ctx.strokeStyle = '#38bdf8'; // Sky blue cut marker
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      });
    }

    // Draw playhead cursor
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Small playhead triangle at the top
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();
  }, [peaks, currentTime, parts, manualCutPoints, mode, duration]);

  // Handle ResizeObserver to keep canvas high-resolution
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          canvas.width = Math.floor(width);
          canvas.height = 140;
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * duration;

    onSeek(targetTime);

    // If Alt or Shift is pressed in manual mode, add cut marker directly
    if (mode === 'manual-markers' && (e.shiftKey || e.altKey)) {
      onAddMarkerAtPosition(targetTime);
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-bold text-neutral-200">
            Interactive Timeline & Split Boundaries
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
            {parts.length} {parts.length === 1 ? 'part' : 'parts'}
          </span>
        </div>

        {/* Time display */}
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <span className="text-emerald-400 font-semibold">{formatTimeCode(currentTime)}</span>
          <span>/</span>
          <span>{formatTimeCode(duration)}</span>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[140px] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 cursor-pointer select-none"
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full block"
          title={
            mode === 'manual-markers'
              ? 'Click to move playhead, Shift+Click to add cut marker'
              : 'Click to seek audio'
          }
        />
      </div>

      {/* Waveform Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="text-[11px] text-neutral-400">
          {mode === 'manual-markers' ? (
            <span>
              💡 Click anywhere to seek, or use <strong className="text-emerald-400">Add Split Marker</strong> button at playhead position.
            </span>
          ) : (
            <span>
              💡 Split boundary lines (<span className="text-amber-400 font-bold">---</span>) show where audio will be sliced into separate files.
            </span>
          )}
        </div>

        {mode === 'manual-markers' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddMarkerAtCurrentTime}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium border border-emerald-500/40 transition-colors cursor-pointer text-xs"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split at {formatTimeCode(currentTime)}</span>
            </button>

            {manualCutPoints.length > 0 && (
              <button
                type="button"
                onClick={onClearManualMarkers}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/50 text-neutral-400 hover:text-red-400 border border-neutral-700 transition-colors cursor-pointer text-xs"
                title="Clear all manual cut markers"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Markers ({manualCutPoints.length})</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
