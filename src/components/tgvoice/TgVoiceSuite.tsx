import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, Plus, FileArchive, RotateCcw, Waves } from 'lucide-react';
import { TgVoiceItem } from '../../types';
import {
  decodeAnyMediaFile,
  convertToMonoAudioBuffer,
  encodeAudioBufferToOggOpus,
  exportMultipleOggZip,
  applySpeechCompression,
  applySpeechEffects,
} from '../../utils/tgVoiceConverter';
import { getAudioContext } from '../../utils/audio/context';
import { yieldToMain } from '../../utils/asyncScheduler';
import { mediaSessionManager } from '../../utils/audio/mediaSession';
import { TgVoiceUploader } from './TgVoiceUploader';
import { TgVoiceItemCard } from './TgVoiceItemCard';
import { TgVoiceExportModal } from './TgVoiceExportModal';
import { TgVoiceBatchBanner } from './TgVoiceBatchBanner';
import { TgVoiceToolbar } from './TgVoiceToolbar';
import { useTgVoiceQueue } from './useTgVoiceQueue';

interface TgVoiceSuiteProps {
  onRegisterReset?: (resetFn: () => void) => void;
}

export const TgVoiceSuite: React.FC<TgVoiceSuiteProps> = ({ onRegisterReset }) => {
  const {
    items,
    addFiles,
    removeItem,
    clearAll,
    retryItem,
    updateBitrate,
    updateEchoLevel,
    setAllEchoLevel,
    cancelPending,
    totalCount,
    readyCount,
    processingCount,
    pendingCount,
    errorCount,
    isBatchActive,
    batchPercent,
  } = useTgVoiceQueue();

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Global Echo state applied across files
  const [globalEchoLevel, setGlobalEchoLevel] = useState<number>(0);

  // Search, filter & pagination state for high scalability (100–300+ items)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const cancelExportRef = useRef<boolean>(false);

  const addFileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  // Web Audio Graph for real-time live echo audition during playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const feedbackGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);

  // Build audio routing graph for real-time live echo
  const initAudioGraph = useCallback(() => {
    if (sourceNodeRef.current || !audioElementRef.current) return;
    try {
      const ctx = getAudioContext();
      const audio = audioElementRef.current;
      audio.crossOrigin = 'anonymous';

      const source = ctx.createMediaElementSource(audio);

      const dryGain = ctx.createGain();
      dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

      const delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.setValueAtTime(0.20, ctx.currentTime);

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.setValueAtTime(0, ctx.currentTime);

      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(0, ctx.currentTime);

      // Dry path: source -> dryGain -> destination
      source.connect(dryGain);
      dryGain.connect(ctx.destination);

      // Wet delay path: source -> delayNode -> wetGain -> destination
      source.connect(delayNode);
      delayNode.connect(wetGain);
      wetGain.connect(ctx.destination);

      // Feedback loop: delayNode -> feedbackGain -> delayNode
      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);

      audioCtxRef.current = ctx;
      sourceNodeRef.current = source;
      dryGainRef.current = dryGain;
      delayNodeRef.current = delayNode;
      feedbackGainRef.current = feedbackGain;
      wetGainRef.current = wetGain;
    } catch (err) {
      console.warn('AudioContext media element graph init error:', err);
    }
  }, []);

  // Update echo parameter in real time while playing
  const applyLiveEcho = useCallback((echoLevel: number) => {
    if (!audioCtxRef.current || !wetGainRef.current) return;
    const ctx = audioCtxRef.current;
    const normalizedEcho = Math.min(1.0, Math.max(0, echoLevel));
    wetGainRef.current.gain.setTargetAtTime(
      Math.min(0.72, normalizedEcho * 0.72),
      ctx.currentTime,
      0.025
    );
    if (feedbackGainRef.current) {
      feedbackGainRef.current.gain.setTargetAtTime(
        Math.min(0.60, normalizedEcho * 0.58),
        ctx.currentTime,
        0.025
      );
    }
  }, []);

  // Update individual item echo and adjust playback immediately if active
  const handleItemEchoChange = useCallback(
    (id: string, newEcho: number) => {
      updateEchoLevel(id, newEcho);
      if (playingId === id) {
        applyLiveEcho(newEcho);
      }
    },
    [updateEchoLevel, playingId, applyLiveEcho]
  );

  // Update master/global echo across all items and adjust playback immediately
  const handleGlobalEchoChange = useCallback(
    (newEcho: number) => {
      setGlobalEchoLevel(newEcho);
      setAllEchoLevel(newEcho);
      if (playingId) {
        applyLiveEcho(newEcho);
      }
    },
    [setAllEchoLevel, playingId, applyLiveEcho]
  );

  // Initialize playback audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 1.0;
    audioElementRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setPlayingId(null);
      setCurrentTime(0);
    };
    const handlePause = () => {
      if (audio.currentTime >= audio.duration) setPlayingId(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, []);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) => it.originalName.toLowerCase().includes(q) || it.outputName.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Audio preview controls
  const handleTogglePlay = useCallback(
    (id: string) => {
      const audio = audioElementRef.current;
      if (!audio) return;

      if (playingId === id) {
        audio.pause();
        setPlayingId(null);
        mediaSessionManager.update({
          title: 'Telegram Voice Preview',
          artist: 'Audify TG Voice',
          isPlaying: false,
        });
        return;
      }

      const item = items.find((it) => it.id === id);
      if (!item || !item.oggBlob) return;

      initAudioGraph();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const itemEcho = item.echoLevel ?? globalEchoLevel ?? 0;
      applyLiveEcho(itemEcho);

      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }

      const url = URL.createObjectURL(item.oggBlob);
      currentObjectUrlRef.current = url;
      audio.src = url;
      audio.currentTime = 0;
      audio
        .play()
        .then(() => {
          setPlayingId(id);
          mediaSessionManager.update({
            title: item.outputName || 'Voice Note',
            artist: 'Audify TG Voice Studio',
            album: 'Telegram Opus 48kHz',
            duration: item.duration,
            currentTime: 0,
            isPlaying: true,
            onPlay: () => audio.play(),
            onPause: () => {
              audio.pause();
              setPlayingId(null);
            },
            onStop: () => {
              audio.pause();
              setPlayingId(null);
            },
          });
        })
        .catch((err) => console.error('Playback error:', err));
    },
    [playingId, items, initAudioGraph, applyLiveEcho, globalEchoLevel]
  );

  const handleSeek = useCallback(
    (id: string, time: number) => {
      if (playingId === id && audioElementRef.current) {
        audioElementRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
    [playingId]
  );

  const handleDownloadSingle = useCallback(async (item: TgVoiceItem) => {
    const itemEcho = item.echoLevel ?? 0;

    if (itemEcho <= 0 && item.oggBlob && (!item.selectedBitrate || item.selectedBitrate === 'original')) {
      const url = URL.createObjectURL(item.oggBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    try {
      let rawBuffer = item.audioBuffer;
      if (!rawBuffer) {
        const decoded = await decodeAnyMediaFile(item.file);
        rawBuffer = convertToMonoAudioBuffer(decoded);
      }

      const bufferToEncode =
        itemEcho > 0
          ? await applySpeechEffects(rawBuffer, { echoLevel: itemEcho })
          : rawBuffer;

      const targetBitrate =
        item.selectedBitrate && item.selectedBitrate !== 'original'
          ? item.selectedBitrate
          : item.originalBitrate || 64;

      const oggBlob = await encodeAudioBufferToOggOpus(bufferToEncode, {
        bitrate: targetBitrate,
      });

      const url = URL.createObjectURL(oggBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download single with echo error:', err);
      if (item.oggBlob) {
        const url = URL.createObjectURL(item.oggBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.outputName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      if (playingId === id) {
        audioElementRef.current?.pause();
        setPlayingId(null);
      }
      removeItem(id);
    },
    [playingId, removeItem]
  );

  const handleResetAll = useCallback(() => {
    audioElementRef.current?.pause();
    setPlayingId(null);
    clearAll();
  }, [clearAll]);

  useEffect(() => {
    if (onRegisterReset) {
      onRegisterReset(handleResetAll);
    }
  }, [onRegisterReset, handleResetAll]);

  // High-performance export with cancellation and memory optimization
  const handleConfirmExport = useCallback(
    async ({
      bitrate,
      compression,
      selectedIds,
    }: {
      bitrate: number | 'original';
      compression: boolean;
      selectedIds?: string[];
    }) => {
      const selectedSet = selectedIds ? new Set(selectedIds) : null;
      const targetItems = items.filter(
        (it) => it.status === 'ready' && (!selectedSet || selectedSet.has(it.id))
      );
      if (targetItems.length === 0) return;

      try {
        setIsExporting(true);
        cancelExportRef.current = false;
        setExportProgress(5);
        setExportStatusText('Preparing files for export...');

        const zipPayload: { outputName: string; oggBlob: Blob }[] = [];

        for (let i = 0; i < targetItems.length; i++) {
          if (cancelExportRef.current) {
            throw new Error('Export cancelled by user');
          }

          const it = targetItems[i];
          const itemEcho = it.echoLevel ?? 0;
          setExportStatusText(`Encoding ${i + 1}/${targetItems.length}: ${it.originalName}`);

          const canReuseExisting =
            !compression &&
            itemEcho <= 0 &&
            (bitrate === 'original' ||
              bitrate === it.selectedBitrate ||
              (it.selectedBitrate === 'original' && bitrate === it.originalBitrate)) &&
            it.oggBlob;

          if (canReuseExisting) {
            zipPayload.push({ outputName: it.outputName, oggBlob: it.oggBlob! });
          } else {
            let rawBuffer = it.audioBuffer;
            if (!rawBuffer) {
              const decoded = await decodeAnyMediaFile(it.file);
              rawBuffer = convertToMonoAudioBuffer(decoded);
            }

            const bufferToEncode =
              compression || itemEcho > 0
                ? await applySpeechEffects(rawBuffer, { compression, echoLevel: itemEcho })
                : rawBuffer;

            let targetBitrate = 64;
            if (bitrate !== 'original') {
              targetBitrate = bitrate;
            } else if (it.selectedBitrate && it.selectedBitrate !== 'original') {
              targetBitrate = it.selectedBitrate;
            } else {
              targetBitrate = it.originalBitrate || 64;
            }

            const oggBlob = await encodeAudioBufferToOggOpus(
              bufferToEncode,
              { bitrate: targetBitrate },
              (subPct) => {
                const basePct = 10 + Math.round((i / targetItems.length) * 50);
                const stepPct = Math.round((subPct / 100) * (50 / targetItems.length));
                setExportProgress(Math.min(60, basePct + stepPct));
                setExportStatusText(
                  `Encoding [${i + 1}/${targetItems.length}] ${it.outputName} (${subPct}%)`
                );
              }
            );

            zipPayload.push({ outputName: it.outputName, oggBlob });
          }

          await yieldToMain(true);
          setExportProgress(10 + Math.round(((i + 1) / targetItems.length) * 50));
        }

        if (targetItems.length === 1) {
          handleDownloadSingle({ ...targetItems[0], oggBlob: zipPayload[0].oggBlob });
        } else {
          setExportStatusText('Building fast ZIP package...');
          const zipBlob = await exportMultipleOggZip(
            zipPayload,
            (pct, msg) => {
              setExportProgress(60 + Math.round(pct * 0.4));
              setExportStatusText(msg);
            },
            () => cancelExportRef.current
          );

          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'tg_voice_messages.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        setIsExportModalOpen(false);
      } catch (err: unknown) {
        if (!(err instanceof Error && err.message.includes('cancelled'))) {
          console.error('Failed to export:', err);
        }
      } finally {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatusText('');
      }
    },
    [items, handleDownloadSingle]
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <input
        ref={addFileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus,.webm,.mp4,.mov,.mkv,.avi"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />

      {items.length === 0 ? (
        <TgVoiceUploader onFilesSelected={addFiles} />
      ) : (
        <div className="space-y-4">
          <TgVoiceBatchBanner
            totalCount={totalCount}
            readyCount={readyCount}
            processingCount={processingCount}
            pendingCount={pendingCount}
            errorCount={errorCount}
            batchPercent={batchPercent}
            onCancelPending={cancelPending}
          />

          <TgVoiceToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalCount={items.length}
            filteredCount={filteredItems.length}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />

          {/* Master Echo Level Control (Applies across all voice messages, auditions live in real-time) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-neutral-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Waves className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-100 text-xs sm:text-sm">
                    Master Echo Controller
                  </span>
                  <span className="text-[11px] font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    {Math.round(globalEchoLevel * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 truncate">
                  Auditions live during playback &bull; Applies to all voice messages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <span className="text-[11px] text-neutral-500 font-mono">0%</span>
                <input
                  id="global-echo-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={globalEchoLevel}
                  onChange={(e) => handleGlobalEchoChange(parseFloat(e.target.value))}
                  className="w-full sm:w-48 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  title="Adjust master echo for all files (0% to 100%)"
                />
                <span className="text-[11px] text-neutral-500 font-mono">100%</span>
              </div>

              {globalEchoLevel > 0 && (
                <button
                  type="button"
                  onClick={() => handleGlobalEchoChange(0)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 border border-neutral-700 shrink-0 font-mono"
                  title="Reset Master Echo to 0% (Dry audio) and unlock per-item controls"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {paginatedItems.map((item) => (
              <TgVoiceItemCard
                key={item.id}
                item={item}
                isPlaying={playingId === item.id}
                currentTime={playingId === item.id ? currentTime : 0}
                masterEchoLevel={globalEchoLevel}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onDownloadSingle={handleDownloadSingle}
                onRemove={handleRemove}
                onRetry={retryItem}
                onBitrateChange={updateBitrate}
                onEchoChange={handleItemEchoChange}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-xl backdrop-blur-md sticky bottom-4 z-20">
            <button
              id="tg-voice-add-files-btn"
              onClick={() => addFileInputRef.current?.click()}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs sm:text-sm font-semibold transition-colors border border-neutral-700 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Add Media</span>
            </button>

            <button
              id="tg-voice-reset-btn"
              type="button"
              onClick={handleResetAll}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-neutral-100 border border-neutral-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-sm"
              title="Reset TG Voice"
            >
              <RotateCcw className="w-4 h-4 text-sky-400" />
              <span>Reset TG Voice</span>
            </button>

            <button
              id="tg-voice-export-all-btn"
              onClick={() => setIsExportModalOpen(true)}
              disabled={readyCount === 0 || isExporting}
              className={`w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                readyCount === 0 || isExporting
                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20 active:scale-98'
              }`}
            >
              {readyCount === 1 ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export .ogg</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  <span>Export ZIP ({readyCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <TgVoiceExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirmExport={handleConfirmExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportStatusText={exportStatusText}
        onCancelExport={() => {
          cancelExportRef.current = true;
        }}
        items={items}
      />
    </div>
  );
};
