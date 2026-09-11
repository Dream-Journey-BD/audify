import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, Plus, FileArchive, RotateCcw } from 'lucide-react';
import { TgVoiceItem } from '../../types';
import {
  decodeAnyMediaFile,
  convertToMonoAudioBuffer,
  encodeAudioBufferToOggOpus,
  exportMultipleOggZip,
  applySpeechCompression,
} from '../../utils/tgVoiceConverter';
import { yieldToMain } from '../../utils/asyncScheduler';
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

  // Search, filter & pagination state for high scalability (100–300+ items)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'processing' | 'error'>('all');
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

  // Initialize playback audio element
  useEffect(() => {
    const audio = new Audio();
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

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          it.originalName.toLowerCase().includes(q) || it.outputName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

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
        return;
      }

      const item = items.find((it) => it.id === id);
      if (!item || !item.oggBlob) return;

      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }

      const url = URL.createObjectURL(item.oggBlob);
      currentObjectUrlRef.current = url;
      audio.src = url;
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setPlayingId(id))
        .catch((err) => console.error('Playback error:', err));
    },
    [playingId, items]
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

  const handleDownloadSingle = useCallback((item: TgVoiceItem) => {
    if (!item.oggBlob) return;
    const url = URL.createObjectURL(item.oggBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.outputName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          setExportStatusText(`Encoding ${i + 1}/${targetItems.length}: ${it.originalName}`);

          const canReuseExisting =
            !compression &&
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

            const bufferToEncode = compression
              ? await applySpeechCompression(rawBuffer)
              : rawBuffer;

            let targetBitrate = 64;
            if (bitrate !== 'original') {
              targetBitrate = bitrate;
            } else if (it.selectedBitrate && it.selectedBitrate !== 'original') {
              targetBitrate = it.selectedBitrate;
            } else {
              targetBitrate = it.originalBitrate || 64;
            }

            const oggBlob = await encodeAudioBufferToOggOpus(bufferToEncode, {
              bitrate: targetBitrate,
            });

            zipPayload.push({ outputName: it.outputName, oggBlob });
          }

          await yieldToMain();
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
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalCount={items.length}
            filteredCount={filteredItems.length}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {paginatedItems.map((item) => (
              <TgVoiceItemCard
                key={item.id}
                item={item}
                isPlaying={playingId === item.id}
                currentTime={playingId === item.id ? currentTime : 0}
                onTogglePlay={handleTogglePlay}
                onSeek={handleSeek}
                onDownloadSingle={handleDownloadSingle}
                onRemove={handleRemove}
                onRetry={retryItem}
                onBitrateChange={updateBitrate}
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
