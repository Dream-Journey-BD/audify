import React, { useRef, useEffect, useMemo } from 'react';
import { extractWaveformPeaks } from '../../utils/audio/waveformAnalysis';

interface SplitterMiniWaveformProps {
  audioBuffer: AudioBuffer;
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
}

export const SplitterMiniWaveform: React.FC<SplitterMiniWaveformProps> = ({
  audioBuffer,
  currentTime,
  isPlaying,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const duration = audioBuffer.duration;

  // Compute downsampled waveform peaks (e.g. 120 buckets for the compact bar)
  const peaks = useMemo(() => {
    if (!audioBuffer) return null;
    return extractWaveformPeaks(audioBuffer, 160);
  }, [audioBuffer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const amp = height / 2;
    const totalBuckets = peaks.max.length;
    const barWidth = Math.max(1.5, width / totalBuckets - 1);
    const gap = 1;

    for (let i = 0; i < totalBuckets; i++) {
      const x = (i / totalBuckets) * width;
      const minVal = peaks.min[i];
      const maxVal = peaks.max[i];

      const barHeight = Math.max(3, (maxVal - minVal) * amp * 0.9);
      const y = (height - barHeight) / 2;

      const timeAtCol = (i / totalBuckets) * duration;
      if (timeAtCol <= currentTime) {
        ctx.fillStyle = '#10b981'; // Emerald 500
      } else {
        ctx.fillStyle = '#1e293b'; // Slate 800
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1.5);
      ctx.fill();
    }

    // Draw playhead position
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.fillStyle = '#34d399'; // Emerald 400
      ctx.fillRect(playheadX - 1, 0, 2, height);
    }
  }, [peaks, currentTime, isPlaying, duration]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = Math.floor(width);
          canvas.height = Math.floor(height);
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction * duration);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative w-full h-8 sm:h-9 bg-neutral-950/80 rounded-xl border border-neutral-800/80 overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-colors flex items-center px-1"
      title="Click to seek audio"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
