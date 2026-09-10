import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

interface LiveSpectrumMeterProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

export const LiveSpectrumMeter: React.FC<LiveSpectrumMeterProps> = ({ analyserNode, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!analyserNode || !isPlaying) {
      // Draw idle static state
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#171717';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#404040';
      const bars = 36;
      const barW = canvas.width / bars - 2;
      for (let i = 0; i < bars; i++) {
        const h = 4;
        ctx.fillRect(i * (barW + 2) + 1, canvas.height - h - 2, barW, h);
      }
      return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bars = 36;
      const step = Math.floor(bufferLength / bars);
      const barW = Math.max(2, canvas.width / bars - 2);

      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j] || 0;
        }
        const val = sum / step;
        const barH = Math.max(3, (val / 255) * (canvas.height - 4));
        const x = i * (barW + 2) + 1;
        const y = canvas.height - barH - 2;

        // Gradient coloring: Amber to Yellow to Green
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.7, '#eab308');
        grad.addColorStop(1, '#22c55e');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [analyserNode, isPlaying]);

  return (
    <div className="flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 rounded-xl px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400">
        <Activity className={`w-3.5 h-3.5 ${isPlaying ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
        <span className="hidden sm:inline">LIVE SPECTRUM</span>
      </div>
      <canvas
        ref={canvasRef}
        width={180}
        height={28}
        className="rounded bg-neutral-950 border border-neutral-800/80 shrink-0"
      />
      <div className="text-[11px] font-mono text-neutral-400 hidden md:flex items-center gap-2">
        <span className="text-amber-500/80">LOW</span>
        <span className="text-yellow-500/80">MID</span>
        <span className="text-emerald-500/80">HIGH</span>
      </div>
    </div>
  );
};
