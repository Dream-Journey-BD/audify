import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AudioSegment, AppLanguage } from '../types';
import { extractWaveformPeaks } from '../utils/audio';
import { translations } from '../utils/translations';
import { WaveformToolbar } from './waveform/WaveformToolbar';
import { WaveformCropPanel } from './waveform/WaveformCropPanel';
import { drawMinimapCanvas, drawMainWaveformCanvas } from './waveform/waveformRenderer';
import { useWaveformInteractions } from './waveform/useWaveformInteractions';

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer;
  segments: AudioSegment[];
  activeSegmentId: string | null;
  currentTime: number;
  isPlaying: boolean;
  lang?: AppLanguage;
  onSelectSegment: (id: string) => void;
  onUpdateSegmentTimes: (id: string, start: number, end: number) => void;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  onAddSegmentAtPlayhead?: () => void;
  onCropAudio?: (startTime: number, endTime: number) => void;
  onResetCropAudio?: () => void;
  isCropped?: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioBuffer,
  segments,
  activeSegmentId,
  currentTime,
  isPlaying,
  lang = 'en',
  onSelectSegment,
  onUpdateSegmentTimes,
  onSeek,
  onPlayPause,
  onAddSegmentAtPlayhead,
  onCropAudio,
  onResetCropAudio,
  isCropped = false,
}) => {
  const t = translations[lang || 'en'] || translations.en;
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [peaks, setPeaks] = useState<{ min: Float32Array; max: Float32Array; rms: Float32Array } | null>(null);

  const [showCropPanel, setShowCropPanel] = useState<boolean>(false);
  const [cropStart, setCropStart] = useState<number>(0);
  const [cropEnd, setCropEnd] = useState<number>(audioBuffer.duration);

  useEffect(() => {
    setCropStart(0);
    setCropEnd(audioBuffer.duration);
  }, [audioBuffer]);

  const totalDuration = audioBuffer.duration;

  useEffect(() => {
    const computed = extractWaveformPeaks(audioBuffer, 1600);
    setPeaks(computed);
  }, [audioBuffer]);

  const {
    dragState,
    setDragState,
    hoverTime,
    setHoverTime,
    setHoverHandle,
    handleMouseDown,
    handleMouseMove,
    cursorStyle,
  } = useWaveformInteractions({
    segments,
    totalDuration,
    zoom,
    onSeek,
    onSelectSegment,
    onUpdateSegmentTimes,
    containerRef,
    mainCanvasRef,
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const drawMinimap = useCallback(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    drawMinimapCanvas({
      canvas,
      peaks,
      segments,
      activeSegmentId,
      totalDuration,
      zoom,
      scrollLeft,
      containerWidth: containerRef.current?.clientWidth || 800,
      currentTime,
      showCropPanel,
      cropStart,
      cropEnd,
    });
  }, [peaks, segments, activeSegmentId, totalDuration, zoom, scrollLeft, currentTime, showCropPanel, cropStart, cropEnd]);

  const drawMainWaveform = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    drawMainWaveformCanvas({
      canvas,
      peaks,
      segments,
      activeSegmentId,
      totalDuration,
      zoom,
      currentTime,
      hoverTime,
      showCropPanel,
      cropStart,
      cropEnd,
      baseWidth: containerRef.current?.clientWidth || 800,
    });
  }, [peaks, segments, activeSegmentId, totalDuration, zoom, currentTime, hoverTime, showCropPanel, cropStart, cropEnd]);

  useEffect(() => {
    let animId: number;
    const render = () => {
      drawMinimap();
      drawMainWaveform();
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [drawMinimap, drawMainWaveform]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const targetTime = (x / canvas.offsetWidth) * totalDuration;
    onSeek(targetTime);

    if (containerRef.current && zoom > 1) {
      const containerWidth = containerRef.current.clientWidth;
      const fullWidth = containerWidth * zoom;
      const targetPx = (targetTime / totalDuration) * fullWidth;
      containerRef.current.scrollLeft = Math.max(0, targetPx - containerWidth / 2);
    }
  };

  const handleApplyCrop = () => {
    if (onCropAudio && cropEnd > cropStart + 0.1) {
      onCropAudio(cropStart, cropEnd);
      setShowCropPanel(false);
    }
  };

  const activeSegmentIndex = segments.find((s) => s.id === activeSegmentId)?.index;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 sm:p-5 shadow-2xl">
      <WaveformToolbar
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentTime={currentTime}
        totalDuration={totalDuration}
        activeSegmentId={activeSegmentId}
        activeSegmentIndex={activeSegmentIndex}
        zoom={zoom}
        setZoom={setZoom}
        onResetZoom={() => {
          setZoom(1);
          if (containerRef.current) containerRef.current.scrollLeft = 0;
        }}
        showCropPanel={showCropPanel}
        setShowCropPanel={setShowCropPanel}
        isCropped={isCropped}
        onCropAudio={onCropAudio}
        onAddSegmentAtPlayhead={onAddSegmentAtPlayhead}
        t={t}
      />

      <WaveformCropPanel
        showCropPanel={showCropPanel}
        cropStart={cropStart}
        cropEnd={cropEnd}
        currentTime={currentTime}
        setCropStart={setCropStart}
        setCropEnd={setCropEnd}
        onApplyCrop={handleApplyCrop}
        isCropped={isCropped}
        onResetCropAudio={onResetCropAudio}
        t={t}
      />

      <div className="mb-2 rounded-lg border border-neutral-800/80 bg-neutral-950 overflow-hidden relative cursor-pointer">
        <canvas
          ref={minimapCanvasRef}
          onClick={handleMinimapClick}
          className="block w-full h-[32px]"
          title="Minimap track: click anywhere to navigate"
        />
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative overflow-x-auto overflow-y-hidden rounded-xl border border-neutral-800 bg-slate-950 select-none shadow-inner"
        style={{ minHeight: '140px' }}
      >
        <canvas
          ref={mainCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDragState(null)}
          onMouseLeave={() => {
            setHoverTime(null);
            setHoverHandle(null);
            if (dragState) setDragState(null);
          }}
          className={`block w-full h-[140px] ${cursorStyle}`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-xs text-neutral-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/90 inline-block" />
            <span>{t.legendVoice}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700 inline-block" />
            <span>{t.legendGap}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
            <span>{t.legendSelected}</span>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 italic">
          💡 {t.waveformTip}
        </p>
      </div>
    </div>
  );
};
