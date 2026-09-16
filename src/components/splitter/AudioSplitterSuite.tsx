import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Split,
  Download,
  FileArchive,
  RotateCcw,
  Plus,
  Play,
  Pause,
  Square,
  Sliders,
  CheckCircle2,
  FileAudio,
} from 'lucide-react';
import { AppLanguage } from '../../types';
import { SplitPart, SplitterConfig } from '../../types/splitter';
import {
  calculateSplitParts,
  renderSplitPartBlob,
  exportSplitPartsZip,
} from '../../utils/audio/audioSplitterUtils';
import { decodeAudioFileWithProgress, formatTimeCode, getAudioContext } from '../../utils/audio/context';
import { yieldToMain } from '../../utils/asyncScheduler';
import { mediaSessionManager } from '../../utils/audio/mediaSession';
import { AudioSplitterUploader } from './AudioSplitterUploader';
import { SplitterWaveformView } from './SplitterWaveformView';
import { SplitterControlsPanel } from './SplitterControlsPanel';
import { SplitPartCard } from './SplitPartCard';
import { SplitterExportModal } from './SplitterExportModal';
import { SplitterMiniWaveform } from './SplitterMiniWaveform';

interface AudioSplitterSuiteProps {
  lang?: AppLanguage;
  onRegisterReset?: (resetFn: () => void) => void;
}

export const AudioSplitterSuite: React.FC<AudioSplitterSuiteProps> = ({
  lang,
  onRegisterReset,
}) => {
  // Audio state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [decodingProgress, setDecodingProgress] = useState<{ percent: number; stage: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playingPartId, setPlayingPartId] = useState<string | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playStartOffsetRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Configuration
  const [config, setConfig] = useState<SplitterConfig>({
    mode: 'equal-parts',
    partsCount: 2,
    partDurationSec: 30,
    format: 'mp3',
    bitrate: 192,
  });

  // Manual cut points (timestamps in seconds)
  const [manualCutPoints, setManualCutPoints] = useState<number[]>([]);

  // Split parts state
  const [parts, setParts] = useState<SplitPart[]>([]);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; text: string }>({
    percent: 0,
    text: '',
  });
  const cancelExportRef = useRef<boolean>(false);

  // Stop active playback
  const stopPlayback = useCallback(() => {
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore already stopped
      }
      activeSourceNodeRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
    setPlayingPartId(null);
    mediaSessionManager.update({
      title: fileName || 'Audify Splitter',
      artist: 'Audio Splitter',
      isPlaying: false,
    });
  }, [fileName]);

  // Full reset function
  const handleReset = useCallback(() => {
    stopPlayback();
    setAudioBuffer(null);
    setFileName('');
    setError(null);
    setParts([]);
    setManualCutPoints([]);
    setCurrentTime(0);
    setIsExporting(false);
    setDecodingProgress(null);
    mediaSessionManager.destroy();
  }, [stopPlayback]);

  // Register reset with parent App
  useEffect(() => {
    if (onRegisterReset) {
      onRegisterReset(handleReset);
    }
  }, [onRegisterReset, handleReset]);

  // Load single audio file with non-blocking async progress
  const handleFileSelected = async (file: File) => {
    stopPlayback();
    setIsLoading(true);
    setError(null);
    setDecodingProgress({ percent: 10, stage: 'Reading file...' });
    await yieldToMain();
    try {
      const buffer = await decodeAudioFileWithProgress(file, (p) => {
        setDecodingProgress(p);
      });
      setAudioBuffer(buffer);
      setFileName(file.name);
      setCurrentTime(0);
      setManualCutPoints([]);
    } catch (err: unknown) {
      console.error(err);
      setError('Could not decode audio file. Please ensure it is a valid MP3, WAV, M4A, or OGG.');
    } finally {
      setIsLoading(false);
      setDecodingProgress(null);
    }
  };

  // Re-calculate split parts whenever config, audioBuffer, or manualCutPoints change
  useEffect(() => {
    if (!audioBuffer) {
      setParts([]);
      setValidationError(undefined);
      return;
    }

    const res = calculateSplitParts(
      audioBuffer.duration,
      fileName || 'audio',
      config,
      manualCutPoints
    );

    if (res.error) {
      setValidationError(res.error);
    } else {
      setValidationError(undefined);
      setParts(res.parts);
    }
  }, [audioBuffer, fileName, config, manualCutPoints]);

  // Audio seeking
  const handleSeek = useCallback(
    (targetTime: number) => {
      const clamped = Math.max(0, Math.min(targetTime, audioBuffer?.duration || 0));
      setCurrentTime(clamped);
      if (isPlaying) {
        stopPlayback();
        // restart at new position
        handlePlayFrom(clamped);
      }
    },
    [audioBuffer, isPlaying, stopPlayback]
  );

  // Play audio from specific time
  const handlePlayFrom = useCallback(
    (startTime: number, stopAt?: number, partId?: string) => {
      if (!audioBuffer) return;
      stopPlayback();

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(ctx.destination);

      const offset = Math.max(0, Math.min(startTime, audioBuffer.duration));
      const durationToPlay = stopAt ? Math.max(0, stopAt - offset) : audioBuffer.duration - offset;

      source.start(0, offset, durationToPlay > 0 ? durationToPlay : undefined);
      activeSourceNodeRef.current = source;
      playStartTimeRef.current = ctx.currentTime;
      playStartOffsetRef.current = offset;
      setIsPlaying(true);
      if (partId) setPlayingPartId(partId);

      // Register Chrome / OS media playback notification
      mediaSessionManager.update({
        title: partId ? `Clip ${partId.slice(0, 8)} - ${fileName}` : (fileName || 'Audio Splitter'),
        artist: 'Audify Audio Splitter',
        album: 'Audify Studio',
        duration: audioBuffer.duration,
        currentTime: offset,
        isPlaying: true,
        onPlay: () => handlePlayFrom(currentTime),
        onPause: () => stopPlayback(),
        onStop: () => stopPlayback(),
        onSeek: (target) => handleSeek(target),
        onSeekBackward: (sec = 5) => handleSeek(Math.max(0, currentTime - sec)),
        onSeekForward: (sec = 5) => handleSeek(Math.min(audioBuffer.duration, currentTime + sec)),
      });

      const updateProgress = () => {
        const elapsed = ctx.currentTime - playStartTimeRef.current;
        const currentPos = playStartOffsetRef.current + elapsed;

        if (stopAt && currentPos >= stopAt) {
          stopPlayback();
          setCurrentTime(stopAt);
          return;
        }

        if (currentPos >= audioBuffer.duration) {
          stopPlayback();
          setCurrentTime(audioBuffer.duration);
          return;
        }

        setCurrentTime(currentPos);
        rafRef.current = requestAnimationFrame(updateProgress);
      };

      rafRef.current = requestAnimationFrame(updateProgress);

      source.onended = () => {
        setIsPlaying(false);
        setPlayingPartId(null);
      };
    },
    [audioBuffer, stopPlayback]
  );

  // Toggle Part Playback
  const handleTogglePartPlay = (part: SplitPart) => {
    if (isPlaying && playingPartId === part.id) {
      stopPlayback();
    } else {
      handlePlayFrom(part.start, part.end, part.id);
    }
  };

  // Master Play/Pause toggle
  const handleTogglePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      const targetTime = currentTime >= (audioBuffer?.duration || 0) ? 0 : currentTime;
      handlePlayFrom(targetTime);
    }
  };

  // Master Stop playback and reset playhead to beginning
  const handleFullStop = () => {
    stopPlayback();
    setCurrentTime(0);
  };

  // Add manual split marker at current playhead position
  const handleAddMarkerAtCurrentTime = () => {
    if (!audioBuffer) return;
    const t = Number(currentTime.toFixed(2));
    if (t <= 0.2 || t >= audioBuffer.duration - 0.2) return;
    if (!manualCutPoints.includes(t)) {
      const next = [...manualCutPoints, t].sort((a, b) => a - b);
      setManualCutPoints(next);
      if (config.mode !== 'manual-markers') {
        setConfig((prev) => ({ ...prev, mode: 'manual-markers' }));
      }
    }
  };

  // Add manual marker at clicked position
  const handleAddMarkerAtPosition = (time: number) => {
    if (!audioBuffer) return;
    const t = Number(time.toFixed(2));
    if (t <= 0.2 || t >= audioBuffer.duration - 0.2) return;
    if (!manualCutPoints.includes(t)) {
      const next = [...manualCutPoints, t].sort((a, b) => a - b);
      setManualCutPoints(next);
    }
  };

  // Remove manual marker
  const handleRemoveMarker = (markerTime: number) => {
    setManualCutPoints((prev) => prev.filter((pt) => Math.abs(pt - markerTime) > 0.05));
  };

  // Clear all manual cut markers
  const handleClearManualMarkers = () => {
    setManualCutPoints([]);
  };

  // Update split part name
  const handleUpdatePartName = (id: string, newName: string) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName.trim() } : p))
    );
  };

  // Download a single split part
  const handleDownloadSingle = async (part: SplitPart) => {
    if (!audioBuffer) return;
    try {
      const blob = await renderSplitPartBlob(
        audioBuffer,
        part,
        config.format,
        config.bitrate
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${part.name.trim() || `part_${part.index}`}.${config.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export part audio file.');
    }
  };

  // Export all split parts as a ZIP file
  const handleExportAllZip = async (customPrefix?: string) => {
    if (!audioBuffer || parts.length === 0) return;
    setIsExporting(true);
    cancelExportRef.current = false;
    setExportProgress({ percent: 0, text: 'Preparing split clips...' });

    try {
      const baseName = customPrefix?.trim() || fileName.replace(/\.[^/.]+$/, '').trim() || 'audio_split';
      const zipBlob = await exportSplitPartsZip(
        audioBuffer,
        parts,
        config.format,
        config.bitrate,
        `${baseName}_parts`,
        (percent, currentName) => {
          setExportProgress({ percent, text: currentName });
        },
        () => cancelExportRef.current
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_split_parts.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('canceled')) {
        console.log('Split export was canceled.');
      } else {
        console.error(err);
        alert('An error occurred while creating the ZIP file.');
      }
    } finally {
      setIsExporting(false);
      setExportProgress({ percent: 0, text: '' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {!audioBuffer ? (
        <AudioSplitterUploader
          lang={lang}
          onFileSelected={handleFileSelected}
          isLoading={isLoading}
          decodingProgress={decodingProgress}
          error={error}
        />
      ) : (
        <div className="space-y-6">
          {/* Top File Info Banner */}
          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-100 truncate">{fileName}</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Duration: {audioBuffer.duration.toFixed(2)}s • Sample Rate: {audioBuffer.sampleRate}Hz • Channels: {audioBuffer.numberOfChannels}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Waveform & Split Line Visualization */}
          <SplitterWaveformView
            audioBuffer={audioBuffer}
            currentTime={currentTime}
            isPlaying={isPlaying}
            parts={parts}
            manualCutPoints={manualCutPoints}
            mode={config.mode}
            onSeek={handleSeek}
            onAddMarkerAtCurrentTime={handleAddMarkerAtCurrentTime}
            onAddMarkerAtPosition={handleAddMarkerAtPosition}
            onRemoveMarker={handleRemoveMarker}
            onClearManualMarkers={handleClearManualMarkers}
          />

          {/* Configuration Controls (Equal Parts, Fixed Duration, Manual) */}
          <SplitterControlsPanel
            config={config}
            onChangeConfig={(newCfg) => setConfig((prev) => ({ ...prev, ...newCfg }))}
            totalDuration={audioBuffer.duration}
            manualMarkersCount={manualCutPoints.length}
            validationError={validationError}
          />

          {/* Split Parts Output Grid / List */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Split className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                  Generated Split Clips ({parts.length})
                </h3>
              </div>
            </div>

            {parts.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No split parts generated. Please check your settings above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {parts.map((part) => (
                  <SplitPartCard
                    key={part.id}
                    part={part}
                    totalDuration={audioBuffer.duration}
                    isPlaying={isPlaying && playingPartId === part.id}
                    onTogglePlay={handleTogglePartPlay}
                    onDownloadSingle={handleDownloadSingle}
                    onUpdateName={handleUpdatePartName}
                    isExporting={isExporting}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sticky Bottom Floating Player & Export Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 sm:p-4 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl backdrop-blur-md sticky bottom-4 z-20">
            {/* Playback Controls, Timecode & Mini Waveform Visualizer */}
            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto flex-1 min-w-0">
              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
                title={isPlaying ? 'Pause playback' : 'Play audio'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Stop Button */}
              <button
                type="button"
                onClick={handleFullStop}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-neutral-100 border border-neutral-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Stop playback"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>

              {/* Timecode */}
              <div className="h-10 sm:h-11 flex items-center font-mono text-xs shrink-0 px-2.5 sm:px-3 bg-neutral-950/70 rounded-xl border border-neutral-800">
                <span className="text-emerald-400 font-bold">{formatTimeCode(currentTime)}</span>
                <span className="text-neutral-500 mx-1">/</span>
                <span className="text-neutral-400">{formatTimeCode(audioBuffer.duration)}</span>
              </div>

              {/* Live Waveform Canvas Visualizer */}
              <div className="flex-1 min-w-[100px] sm:min-w-[140px]">
                <SplitterMiniWaveform
                  audioBuffer={audioBuffer}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onSeek={handleSeek}
                />
              </div>
            </div>

            {/* Right side: Status and Export Button */}
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-neutral-800/80 pt-2.5 md:pt-0">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready to export</span>
              </div>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                disabled={parts.length === 0}
                className={`inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                  parts.length === 0
                    ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 shadow-emerald-500/20 active:scale-98'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Export ({parts.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Splitter Export Modal */}
      {audioBuffer && (
        <SplitterExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          parts={parts}
          totalDuration={audioBuffer.duration}
          fileName={fileName}
          config={config}
          onChangeConfig={(newCfg) => setConfig((prev) => ({ ...prev, ...newCfg }))}
          isExporting={isExporting}
          exportProgress={exportProgress}
          onExportZip={(customPrefix) => handleExportAllZip(customPrefix)}
          onCancelExport={() => {
            cancelExportRef.current = true;
          }}
        />
      )}
    </div>
  );
};
