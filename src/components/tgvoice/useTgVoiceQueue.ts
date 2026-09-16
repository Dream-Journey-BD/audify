import { useState, useRef, useEffect, useCallback } from 'react';
import { TgVoiceItem } from '../../types';
import {
  decodeAnyMediaFile,
  convertToMonoAudioBuffer,
  extractWaveformPeaks,
  encodeAudioBufferToOggOpus,
  getOutputOggFilename,
} from '../../utils/tgVoiceConverter';
import { yieldToMain } from '../../utils/asyncScheduler';

const MAX_CONCURRENT = 1;
const MAX_IN_MEMORY_BUFFERS = 15;

export function useTgVoiceQueue() {
  const [items, setItems] = useState<TgVoiceItem[]>([]);
  const isCancelledRef = useRef<boolean>(false);
  const activeJobsRef = useRef<Set<string>>(new Set());

  // Track counts
  const totalCount = items.length;
  const readyCount = items.filter((i) => i.status === 'ready').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const isBatchActive = pendingCount > 0 || processingCount > 0;

  const batchPercent =
    totalCount > 0 ? Math.round(((readyCount + errorCount) / totalCount) * 100) : 0;

  // Process a single item
  const processItemJob = useCallback(async (itemToProcess: TgVoiceItem) => {
    if (activeJobsRef.current.has(itemToProcess.id)) return;
    activeJobsRef.current.add(itemToProcess.id);

    setItems((prev) =>
      prev.map((it) =>
        it.id === itemToProcess.id ? { ...it, status: 'processing', progress: 10 } : it
      )
    );

    try {
      await yieldToMain();
      const decodedBuffer = await decodeAnyMediaFile(itemToProcess.file);

      let origBitrate = 64;
      if (decodedBuffer.duration > 0 && itemToProcess.file.size > 0) {
        origBitrate = Math.max(
          16,
          Math.min(320, Math.round((itemToProcess.file.size * 8) / (decodedBuffer.duration * 1000)))
        );
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id === itemToProcess.id
            ? {
                ...it,
                progress: 35,
                duration: decodedBuffer.duration,
                originalChannels: decodedBuffer.numberOfChannels,
                originalSampleRate: decodedBuffer.sampleRate,
                originalBitrate: origBitrate,
                selectedBitrate: it.selectedBitrate ?? 'original',
              }
            : it
        )
      );

      await yieldToMain(true);
      const monoBuffer = convertToMonoAudioBuffer(decodedBuffer);
      const waveformPeaks = extractWaveformPeaks(monoBuffer, 48);

      let lastReportedPct = 0;
      const oggBlob = await encodeAudioBufferToOggOpus(
        monoBuffer,
        { bitrate: origBitrate },
        (pct) => {
          if (pct === 100 || pct - lastReportedPct >= 4) {
            lastReportedPct = pct;
            setItems((prev) =>
              prev.map((it) =>
                it.id === itemToProcess.id ? { ...it, progress: 35 + Math.round(pct * 0.6) } : it
              )
            );
          }
        }
      );

      await yieldToMain(true);

      setItems((prev) => {
        const keepRawBuffer = prev.length <= MAX_IN_MEMORY_BUFFERS;
        return prev.map((it) =>
          it.id === itemToProcess.id
            ? {
                ...it,
                status: 'ready',
                progress: 100,
                duration: monoBuffer.duration,
                audioBuffer: keepRawBuffer ? monoBuffer : undefined,
                oggBlob,
                waveformPeaks,
              }
            : it
        );
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemToProcess.id ? { ...it, status: 'error', error: errorMessage } : it
        )
      );
    } finally {
      activeJobsRef.current.delete(itemToProcess.id);
    }
  }, []);

  // Worker loop: schedule pending items up to concurrency limit
  useEffect(() => {
    if (isCancelledRef.current) return;
    const currentActive = activeJobsRef.current.size;
    const availableSlots = MAX_CONCURRENT - currentActive;
    if (availableSlots <= 0) return;

    const pendingItems = items.filter(
      (it) => it.status === 'pending' && !activeJobsRef.current.has(it.id)
    );

    for (let i = 0; i < Math.min(availableSlots, pendingItems.length); i++) {
      processItemJob(pendingItems[i]);
    }
  }, [items, processItemJob]);

  // Add files
  const addFiles = useCallback((files: File[]) => {
    isCancelledRef.current = false;
    const newItems: TgVoiceItem[] = files.map((file) => {
      const id = 'tg-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
      const outputName = getOutputOggFilename(file.name);
      return {
        id,
        file,
        originalName: file.name,
        outputName,
        size: file.size,
        duration: 0,
        originalChannels: 2,
        originalSampleRate: 44100,
        selectedBitrate: 'original',
        status: 'pending',
        progress: 0,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  // Remove single item
  const removeItem = useCallback((id: string) => {
    activeJobsRef.current.delete(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    isCancelledRef.current = true;
    activeJobsRef.current.clear();
    setItems([]);
  }, []);

  // Cancel remaining pending items
  const cancelPending = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status !== 'pending'));
  }, []);

  // Retry failed item
  const retryItem = useCallback((item: TgVoiceItem) => {
    activeJobsRef.current.delete(item.id);
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, status: 'pending', progress: 0, error: undefined } : it
      )
    );
  }, []);

  // Update bitrate
  const updateBitrate = useCallback((id: string, bitrate: number | 'original') => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selectedBitrate: bitrate } : it))
    );
  }, []);

  // Update individual echo level
  const updateEchoLevel = useCallback((id: string, echoLevel: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, echoLevel } : it))
    );
  }, []);

  // Set echo level across all items
  const setAllEchoLevel = useCallback((echoLevel: number) => {
    setItems((prev) =>
      prev.map((it) => ({ ...it, echoLevel }))
    );
  }, []);

  return {
    items,
    setItems,
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
  };
}
