import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  FileArchive,
  Activity,
} from 'lucide-react';
import { AppLanguage } from '../../types';
import { translations } from '../../utils/translations';

interface IntelligencePlayerBarProps {
  isPlaying: boolean;
  isSequential: boolean;
  playbackSource?: 'original' | 'normalized';
  volume?: number;
  totalCount: number;
  selectedCount: number;
  activeItemName?: string;
  hasNormalizedItems?: boolean;
  analyserNode?: AnalyserNode | null;
  lang?: AppLanguage;
  onPlayPause: () => void;
  onStop: () => void;
  onToggleSequential: () => void;
  onToggleSource?: (src: 'original' | 'normalized') => void;
  onChangeVolume?: (vol: number) => void;
  onOpenExportModal: () => void;
}

export const IntelligencePlayerBar: React.FC<IntelligencePlayerBarProps> = ({
  isPlaying,
  isSequential,
  totalCount,
  analyserNode,
  lang,
  onPlayPause,
  onStop,
  onToggleSequential,
  onOpenExportModal,
}) => {
  const t = translations[lang || 'en'] || translations.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Jumping Waveform Spectrum Canvas (as seen in Screenshot 2)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const updateCanvasDimensions = () => {
      const parent = canvas.parentElement;
      const width = Math.floor(parent ? parent.clientWidth - 32 : 300);
      const height = 24;
      if (width > 20 && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    updateCanvasDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasDimensions();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const barWidth = 3;
    const barGap = 2;

    let dataArray: Uint8Array | null = null;
    if (analyserNode) {
      try {
        dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      } catch {
        dataArray = null;
      }
    }

    let currentHeights: number[] = [];

    const render = () => {
      const width = canvas.width || 300;
      const height = canvas.height || 24;
      ctx.clearRect(0, 0, width, height);

      const barCount = Math.max(16, Math.floor(width / (barWidth + barGap)));
      if (currentHeights.length !== barCount) {
        currentHeights = new Array(barCount).fill(2);
      }

      if (isPlaying && analyserNode && dataArray) {
        try {
          analyserNode.getByteFrequencyData(dataArray);
        } catch {
          // fallback
        }
      }

      const totalBarsWidth = barCount * (barWidth + barGap) - barGap;
      const startX = Math.max(0, (width - totalBarsWidth) / 2);

      for (let i = 0; i < barCount; i++) {
        let targetHeight = 2; // resting baseline dots (Screenshot 2)
        if (isPlaying) {
          if (dataArray && dataArray.length > 0) {
            const binIndex = Math.floor((i / barCount) * (dataArray.length * 0.7));
            const val = dataArray[binIndex] || 0;
            targetHeight = Math.max(2, (val / 255) * (height - 2));
          } else {
            // Smooth animated rhythm bounce if analyser is silent
            const time = Date.now() * 0.007;
            const wave = Math.sin(time + i * 0.35) * 0.5 + 0.5;
            targetHeight = Math.max(2, wave * (height - 3));
          }
        }

        currentHeights[i] = (currentHeights[i] || 2) + (targetHeight - (currentHeights[i] || 2)) * 0.3;
        const h = Math.max(2, currentHeights[i]);
        const x = startX + i * (barWidth + barGap);
        const y = height - h;

        if (isPlaying) {
          const grad = ctx.createLinearGradient(0, y, 0, height);
          grad.addColorStop(0, '#f59e0b'); // amber-500
          grad.addColorStop(1, '#b45309'); // amber-700
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.rect(x, y, barWidth, h);
          ctx.fill();
        } else {
          // Idle state from Screenshot 2: neat row of dots
          ctx.fillStyle = '#404040';
          ctx.beginPath();
          ctx.rect(x, height - 2.5, barWidth, 2.5);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isPlaying, analyserNode]);

  return (
    <div
      id="intelligence-bottom-player-bar"
      className="w-full bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md mt-6 sticky bottom-4 z-20 transition-all space-y-3"
    >
      {/* Row 1: Playback Controls (Play/Pause, Stop, Sequence) + Export Button on right */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Main Play/Pause */}
          <button
            id="intel-player-play-btn"
            type="button"
            onClick={onPlayPause}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
            title={isPlaying ? t.pause : t.play}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Stop Button */}
          <button
            id="intel-player-stop-btn"
            type="button"
            onClick={onStop}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-700 transition-colors cursor-pointer shrink-0"
            title={t.stop}
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          {/* Sequential Playback Toggle (Icon only) */}
          <button
            id="intel-player-sequential-btn"
            type="button"
            onClick={onToggleSequential}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isSequential
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Play all voice clips consecutively in sequence"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Export Workstation Button */}
        <button
          id="intel-open-export-modal-btn"
          type="button"
          onClick={onOpenExportModal}
          disabled={totalCount === 0}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <FileArchive className="w-4 h-4 fill-current shrink-0" />
          <span>Export</span>
        </button>
      </div>

      {/* Row 2: Bouncing Spectrum Canvas - Full Width */}
      <div
        id="intel-player-waveform-visualizer"
        className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-950/90 rounded-xl border border-neutral-800 shadow-inner overflow-hidden"
        title={isPlaying ? 'Real-time Audio Spectrum' : 'Idle Audio Spectrum'}
      >
        <Activity
          className={`w-4 h-4 shrink-0 transition-colors ${
            isPlaying ? 'text-amber-400 animate-pulse' : 'text-neutral-500'
          }`}
        />
        <canvas
          ref={canvasRef}
          className="w-full h-6 block rounded"
        />
      </div>
    </div>
  );
};
