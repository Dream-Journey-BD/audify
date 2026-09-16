import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppLanguage, BatchAudioItem, NormalizationTarget, IntelligenceExportConfig } from '../../types';
import { analyzeAudioBuffer } from '../../utils/audioAnalytics';
import {
  normalizeAudioBuffer,
  processBatchNormalization,
  exportNormalizedBatchZip,
  joinBatchAudioBuffers,
  joinBatchAudioBuffersAsync,
} from '../../utils/audioNormalizer';
import {
  audioBufferToWavBlob,
  audioBufferToMp3Blob,
  audioBufferToWavBlobAsync,
  audioBufferToMp3BlobAsync,
  mediaSessionManager,
} from '../../utils/audioEngine';
import { yieldToMain } from '../../utils/asyncScheduler';
import { decodeAudioFileWithProgress } from '../../utils/audio/context';
import { IntelligencePlayerBar } from './IntelligencePlayerBar';
import { NormalizationControlBar } from './NormalizationControlBar';
import { AudioBatchItemCard } from './AudioBatchItemCard';
import { BatchComparisonModal } from './BatchComparisonModal';
import { IntelligenceExportModal } from './IntelligenceExportModal';
import { ImportProgressModal } from './ImportProgressModal';
import { BatchNormalizeProgressModal } from './BatchNormalizeProgressModal';
import { VoiceLevelerUploader } from './VoiceLevelerUploader';
import { VoiceBatchToolbar } from './VoiceBatchToolbar';

interface LoudnessIntelligenceSuiteProps {
  currentStudioBuffer: AudioBuffer | null;
  currentStudioFileName?: string;
  lang?: AppLanguage;
  onImportToStudio?: (buffer: AudioBuffer, name: string) => void;
  onRegisterReset?: (resetFn: () => void) => void;
}

export const LoudnessIntelligenceSuite: React.FC<LoudnessIntelligenceSuiteProps> = ({
  currentStudioBuffer,
  currentStudioFileName,
  lang,
  onRegisterReset,
}) => {
  const [items, setItems] = useState<BatchAudioItem[]>([]);
  const [target, setTarget] = useState<NormalizationTarget>({
    mode: 'lufs',
    preset: 'podcast',
    targetLufs: -16,
    targetPeakDb: -1.0,
    enableCompressor: false,
    compressorThresholdDb: -24,
    compressorRatio: 2.5,
    enableHighPass: false,
    enableWarmthEQ: false,
    preventClipping: true,
    customGainOffsetDb: 0,
  });

  const [exportConfig, setExportConfig] = useState<IntelligenceExportConfig>({
    format: 'wav',
    mp3Bitrate: 256,
    namingPattern: 'prefix_number',
    prefix: 'voice',
    separator: '_',
    digits: 2,
    startNumber: 1,
    exportMode: 'zip',
    joinedPauseDuration: 0.4,
    includeReport: true,
  });

  // Processing & Modals
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ percent: 0, currentFile: '' });
  const cancelExportRef = useRef(false);

  // Batch Normalization Progress Modal
  const [isNormalizeModalOpen, setIsNormalizeModalOpen] = useState(false);
  const [normalizeProgress, setNormalizeProgress] = useState({
    current: 0,
    total: 0,
    name: '',
    percent: 0,
  });
  const cancelNormalizeRef = useRef(false);

  // Import Progress
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, name: '' });
  const cancelImportRef = useRef(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Playback state & Live Audio Nodes
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackSource, setPlaybackSource] = useState<'original' | 'normalized'>('original');
  const [isSequentialPlaying, setIsSequentialPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);

  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const liveGainNodeRef = useRef<GainNode | null>(null);
  const liveCompressorRef = useRef<DynamicsCompressorNode | null>(null);
  const liveHighPassRef = useRef<BiquadFilterNode | null>(null);
  const liveWarmthRef = useRef<BiquadFilterNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  const isSequentialPlayingRef = useRef(false);
  const itemsRef = useRef<BatchAudioItem[]>(items);
  itemsRef.current = items;

  // Initialize Web Audio Context and Live Audition Node Graph
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(10, 0);

    const warmth = ctx.createBiquadFilter();
    warmth.type = 'peaking';
    warmth.frequency.setValueAtTime(3000, 0);
    warmth.Q.setValueAtTime(1.0, 0);
    warmth.gain.setValueAtTime(0, 0);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(0, 0);
    comp.ratio.setValueAtTime(1, 0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, 0);

    // Audio node chain: hp -> warmth -> comp -> gain -> analyser -> destination
    hp.connect(warmth);
    warmth.connect(comp);
    comp.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    liveHighPassRef.current = hp;
    liveWarmthRef.current = warmth;
    liveCompressorRef.current = comp;
    liveGainNodeRef.current = gain;
    analyserNodeRef.current = analyser;

    return () => {
      ctx.close();
    };
  }, []);

  // Update Live Audition Parameters in real time during playback
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (!ctx || !playingId) return;

    const currentItem = itemsRef.current.find((i) => i.id === playingId);
    if (!currentItem) return;

    const gainNode = liveGainNodeRef.current;
    const compNode = liveCompressorRef.current;
    const hpNode = liveHighPassRef.current;
    const warmthNode = liveWarmthRef.current;

    if (!gainNode || !compNode || !hpNode || !warmthNode) return;

    if (playbackSource === 'original') {
      // Bypass all processing for authentic original sound scaled by masterVolume
      gainNode.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.03);
      compNode.threshold.setTargetAtTime(0, ctx.currentTime, 0.03);
      compNode.ratio.setTargetAtTime(1, ctx.currentTime, 0.03);
      hpNode.frequency.setTargetAtTime(10, ctx.currentTime, 0.03);
      warmthNode.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    } else {
      // Calculate dynamic real-time target gain
      let desiredDb = 0;
      if (target.mode === 'lufs') {
        desiredDb = target.targetLufs - currentItem.analytics.integratedLufs;
      } else {
        desiredDb = target.targetPeakDb - currentItem.analytics.peakDb;
      }
      desiredDb += (target.customGainOffsetDb || 0) + (currentItem.customGainDb || 0);

      const maxPeak = target.preventClipping ? target.targetPeakDb : -0.1;
      if (currentItem.analytics.truePeakDb + desiredDb > maxPeak) {
        desiredDb = maxPeak - currentItem.analytics.truePeakDb;
      }

      const linearGain = Math.pow(10, desiredDb / 20) * masterVolume;
      gainNode.gain.setTargetAtTime(linearGain, ctx.currentTime, 0.03);

      if (target.enableCompressor) {
        compNode.threshold.setTargetAtTime(target.compressorThresholdDb, ctx.currentTime, 0.03);
        compNode.ratio.setTargetAtTime(target.compressorRatio, ctx.currentTime, 0.03);
      } else {
        compNode.threshold.setTargetAtTime(0, ctx.currentTime, 0.03);
        compNode.ratio.setTargetAtTime(1, ctx.currentTime, 0.03);
      }

      hpNode.frequency.setTargetAtTime(target.enableHighPass ? 80 : 10, ctx.currentTime, 0.03);
      warmthNode.gain.setTargetAtTime(target.enableWarmthEQ ? 2.5 : 0, ctx.currentTime, 0.03);
    }
  }, [target, playingId, playbackSource, masterVolume]);

  // Completely reliable Stop Playback
  const stopPlayback = useCallback(() => {
    isSequentialPlayingRef.current = false;
    setIsSequentialPlaying(false);

    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.onended = null;
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch {}
      activeSourceNodeRef.current = null;
    }
    setPlayingId(null);
    mediaSessionManager.update({
      title: 'Voice Leveler',
      artist: 'Audify Batch Normalizer',
      isPlaying: false,
    });
  }, []);

  // Reset all Voice Leveler state
  const handleResetAll = useCallback(() => {
    stopPlayback();
    setItems([]);
    setCurrentPage(1);
    setIsExportModalOpen(false);
    setIsComparisonOpen(false);
    setIsNormalizeModalOpen(false);
  }, [stopPlayback]);

  // Register reset function for top header shortcut
  useEffect(() => {
    if (onRegisterReset) {
      onRegisterReset(handleResetAll);
    }
  }, [onRegisterReset, handleResetAll]);

  // Play an item with live audition chain
  const playItemBuffer = useCallback(
    (id: string, source: 'original' | 'normalized', onEnded?: () => void) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item) return;

      const bufferToPlay =
        source === 'normalized' && item.normalizedBuffer
          ? item.normalizedBuffer
          : item.originalBuffer;

      const ctx = audioContextRef.current;
      const hp = liveHighPassRef.current;
      if (!ctx || !hp) return;

      // Stop any prior playback cleanly
      if (activeSourceNodeRef.current) {
        try {
          activeSourceNodeRef.current.onended = null;
          activeSourceNodeRef.current.stop();
          activeSourceNodeRef.current.disconnect();
        } catch {}
        activeSourceNodeRef.current = null;
      }

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = bufferToPlay;
      sourceNode.connect(hp);

      sourceNode.onended = () => {
        setPlayingId(null);
        if (isSequentialPlayingRef.current && onEnded) {
          onEnded();
        }
      };

      sourceNode.start(0);
      activeSourceNodeRef.current = sourceNode;
      setPlayingId(id);
      setPlaybackSource(source);

      // Register Chrome / OS media notification
      mediaSessionManager.update({
        title: `${item.name} (${source === 'normalized' ? 'Levelled' : 'Original'})`,
        artist: 'Voice Leveler Studio',
        album: 'Audify Batch Audio',
        duration: bufferToPlay.duration,
        currentTime: 0,
        isPlaying: true,
        onPlay: () => playItemBuffer(id, source),
        onPause: () => stopPlayback(),
        onStop: () => stopPlayback(),
      });
    },
    []
  );

  const handleTogglePlay = (id: string, source: 'original' | 'normalized') => {
    if (playingId === id && playbackSource === source) {
      stopPlayback();
    } else {
      playItemBuffer(id, source);
    }
  };

  // Play All Sequentially with guaranteed halt
  const handlePlaySequential = () => {
    if (isSequentialPlaying || playingId) {
      stopPlayback();
      return;
    }
    if (items.length === 0) return;

    isSequentialPlayingRef.current = true;
    setIsSequentialPlaying(true);
    let currentIdx = 0;

    const playNext = () => {
      if (!isSequentialPlayingRef.current) return;
      if (currentIdx >= itemsRef.current.length) {
        isSequentialPlayingRef.current = false;
        setIsSequentialPlaying(false);
        setPlayingId(null);
        return;
      }
      const curItem = itemsRef.current[currentIdx];
      const src = curItem.normalizedBuffer ? 'normalized' : 'original';
      playItemBuffer(curItem.id, src, () => {
        if (!isSequentialPlayingRef.current) return;
        currentIdx++;
        playNext();
      });
    };

    playNext();
  };

  // Asynchronous Non-blocking Multi-file Import with Progress Bar
  const handleFilesAdded = async (filesList: FileList | File[]) => {
    const filesArray = Array.from(filesList);
    if (filesArray.length === 0) return;

    setIsImporting(true);
    cancelImportRef.current = false;
    const total = filesArray.length;
    setImportProgress({ current: 0, total, name: filesArray[0].name });

    const ctx = audioContextRef.current || new AudioContext();
    const batchSize = 3;
    let accumulated: BatchAudioItem[] = [];

    for (let i = 0; i < total; i++) {
      if (cancelImportRef.current) break;

      const file = filesArray[i];
      setImportProgress({ current: i + 1, total, name: file.name });

      try {
        const decoded = await decodeAudioFileWithProgress(file);
        const analytics = await analyzeAudioBuffer(decoded);

        accumulated.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          originalBuffer: decoded,
          normalizedBuffer: null,
          analytics,
          normalizedAnalytics: null,
          gainAppliedDb: 0,
          customGainDb: 0,
          isSelected: false,
          isProcessing: false,
          status: 'analyzed',
        });
      } catch (err) {
        console.error('Failed to decode file:', file.name, err);
      }

      // Stream updates to UI every batchSize or at end to prevent freezing
      if (accumulated.length >= batchSize || i === total - 1) {
        const toAdd = [...accumulated];
        accumulated = [];
        setItems((prev) => [...prev, ...toAdd]);
      }

      // Yield event loop to allow UI frame render
      await new Promise((resolve) => setTimeout(resolve, 8));
    }

    setIsImporting(false);
  };

  // Import audio from studio Tab 1 if available
  const handleImportStudioAudio = async () => {
    if (!currentStudioBuffer) return;
    const analytics = await analyzeAudioBuffer(currentStudioBuffer);
    const newItem: BatchAudioItem = {
      id: `studio_${Date.now()}`,
      name: currentStudioFileName || 'Studio_Recording.wav',
      size: currentStudioBuffer.length * 4,
      originalBuffer: currentStudioBuffer,
      normalizedBuffer: null,
      analytics,
      normalizedAnalytics: null,
      gainAppliedDb: 0,
      customGainDb: 0,
      isSelected: false,
      isProcessing: false,
      status: 'analyzed',
    };
    setItems((prev) => [newItem, ...prev]);
  };

  // Normalize all loaded files with background time-slicing & cancel support
  const handleNormalizeAll = async () => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setIsNormalizeModalOpen(true);
    cancelNormalizeRef.current = false;
    setProgressPercent(0);
    setNormalizeProgress({ current: 0, total: items.length, name: items[0].name, percent: 0 });

    const updated = await processBatchNormalization(
      items,
      target,
      (done, total, currentName, percent) => {
        setProgressPercent(percent);
        setNormalizeProgress({ current: Math.min(done + 1, total), total, name: currentName, percent });
      },
      () => cancelNormalizeRef.current
    );

    setItems(updated);
    setIsProcessing(false);
    setIsNormalizeModalOpen(false);
  };

  // Normalize all files with a newly chosen target immediately
  const handleNormalizeAllWithTarget = async (newTarget: NormalizationTarget) => {
    if (itemsRef.current.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setIsNormalizeModalOpen(true);
    cancelNormalizeRef.current = false;
    setProgressPercent(0);
    setNormalizeProgress({ current: 0, total: itemsRef.current.length, name: itemsRef.current[0].name, percent: 0 });

    const updated = await processBatchNormalization(
      itemsRef.current,
      newTarget,
      (done, total, currentName, percent) => {
        setProgressPercent(percent);
        setNormalizeProgress({ current: Math.min(done + 1, total), total, name: currentName, percent });
      },
      () => cancelNormalizeRef.current
    );

    setItems(updated);
    setIsProcessing(false);
    setIsNormalizeModalOpen(false);
  };

  // Handle target change, optionally triggering immediate batch leveling
  const handleTargetChange = (newTarget: NormalizationTarget, autoApply?: boolean) => {
    setTarget(newTarget);
    if (autoApply && itemsRef.current.length > 0 && !isProcessing) {
      handleNormalizeAllWithTarget(newTarget);
    }
  };

  // Normalize selected files
  const handleNormalizeSelected = async () => {
    const selected = items.filter((i) => i.isSelected);
    if (selected.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setIsNormalizeModalOpen(true);
    cancelNormalizeRef.current = false;
    setProgressPercent(0);
    setNormalizeProgress({ current: 0, total: selected.length, name: selected[0].name, percent: 0 });

    for (let i = 0; i < selected.length; i++) {
      if (cancelNormalizeRef.current) break;
      const pct = Math.round((i / selected.length) * 100);
      setNormalizeProgress({ current: i + 1, total: selected.length, name: selected[i].name, percent: pct });
      await handleNormalizeSingle(selected[i].id);
      await yieldToMain();
    }

    setIsProcessing(false);
    setIsNormalizeModalOpen(false);
  };

  // Normalize a single voice
  const handleNormalizeSingle = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isProcessing: true, status: 'normalizing' } : i))
    );

    try {
      const res = await normalizeAudioBuffer(
        item.originalBuffer,
        target,
        item.analytics,
        item.customGainDb || 0
      );
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                normalizedBuffer: res.buffer,
                normalizedAnalytics: res.newAnalytics,
                gainAppliedDb: res.gainAppliedDb,
                status: 'normalized',
                isProcessing: false,
              }
            : i
        )
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'error',
                errorMessage: err instanceof Error ? err.message : 'Normalization failed',
                isProcessing: false,
              }
            : i
        )
      );
    }
  };

  // Update fine-tune trim for a single item
  const handleUpdateItemTrim = (id: string, trimDb: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, customGainDb: trimDb } : i))
    );
  };

  // Toggle selection for a single item
  const handleToggleSelectItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isSelected: !i.isSelected } : i))
    );
  };

  // Bulk selection actions
  const handleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, isSelected: select })));
  };

  const handleDeleteSelected = () => {
    const selectedIds = new Set(items.filter((i) => i.isSelected).map((i) => i.id));
    if (selectedIds.has(playingId || '')) stopPlayback();
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
  };

  // Export ZIP Archive with asynchronous worker-like yielding and cancel support
  const handleExportZip = async () => {
    const exportItems = items.filter((i) => i.isSelected).length > 0
      ? items.filter((i) => i.isSelected)
      : items;

    if (exportItems.length === 0) return;
    setIsExporting(true);
    cancelExportRef.current = false;
    setExportProgress({ percent: 0, currentFile: 'Starting background export...' });

    try {
      const blob = await exportNormalizedBatchZip(
        exportItems,
        target,
        exportConfig,
        (percent, currentFile) => {
          setExportProgress({ percent, currentFile });
        },
        () => cancelExportRef.current
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `normalized_voices_${exportConfig.format.toUpperCase()}_${target.targetLufs}LUFS.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('canceled')) {
        console.log('Export canceled by user');
      } else {
        console.error('Export failed:', err);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Export Joined Continuous Single Audio Track with async non-blocking execution
  const handleExportJoined = async () => {
    const exportItems = items.filter((i) => i.isSelected).length > 0
      ? items.filter((i) => i.isSelected)
      : items;

    if (exportItems.length === 0) return;
    setIsExporting(true);
    cancelExportRef.current = false;
    setExportProgress({ percent: 5, currentFile: 'Concatenating audio buffers...' });

    try {
      const joinedBuffer = await joinBatchAudioBuffersAsync(
        exportItems,
        exportConfig.joinedPauseDuration || 0.4,
        (pct, status) => {
          setExportProgress({ percent: Math.round(pct * 0.4), currentFile: status });
        }
      );

      if (cancelExportRef.current) throw new Error('Export canceled by user');

      setExportProgress({ percent: 45, currentFile: `Encoding to ${exportConfig.format.toUpperCase()}...` });

      const blob =
        exportConfig.format === 'mp3'
          ? await audioBufferToMp3BlobAsync(
              joinedBuffer,
              exportConfig.mp3Bitrate,
              (pct) => {
                setExportProgress({
                  percent: 45 + Math.round(pct * 0.5),
                  currentFile: `Encoding MP3 (${pct}%)...`,
                });
              },
              () => cancelExportRef.current
            )
          : await audioBufferToWavBlobAsync(
              joinedBuffer,
              (pct) => {
                setExportProgress({
                  percent: 45 + Math.round(pct * 0.5),
                  currentFile: `Encoding WAV (${pct}%)...`,
                });
              },
              () => cancelExportRef.current
            );

      setExportProgress({ percent: 100, currentFile: 'Preparing download...' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = exportConfig.format === 'mp3' ? 'mp3' : 'wav';
      a.download = `joined_master_track_${target.targetLufs}LUFS.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('canceled')) {
        console.log('Joined export canceled by user');
      } else {
        console.error('Joined export failed:', err);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Global Keyboard Shortcuts for Voice Leveler
  useEffect(() => {
    const handleVoiceKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
        return;
      }

      // Space: Play / Pause active or first item
      if (e.code === 'Space') {
        e.preventDefault();
        if (playingId) {
          stopPlayback();
        } else if (items.length > 0) {
          const firstSelected = items.find((i) => i.isSelected);
          const toPlay = firstSelected || items[0];
          handleTogglePlay(toPlay.id, toPlay.normalizedBuffer ? 'normalized' : 'original');
        }
        return;
      }

      // Escape: Stop playback
      if (e.key === 'Escape') {
        if (playingId) {
          e.preventDefault();
          stopPlayback();
        }
        return;
      }

      // Delete: Delete selected items (or active playing item)
      if (e.key === 'Delete') {
        const hasSelected = items.some((i) => i.isSelected);
        if (hasSelected) {
          e.preventDefault();
          handleDeleteSelected();
        } else if (playingId) {
          e.preventDefault();
          const curId = playingId;
          stopPlayback();
          setItems((prev) => prev.filter((i) => i.id !== curId));
        }
        return;
      }

      // Ctrl+A / Cmd+A: Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        if (items.length > 0) {
          e.preventDefault();
          const allSelected = items.every((i) => i.isSelected);
          handleSelectAll(!allSelected);
        }
        return;
      }

      // ArrowUp / ArrowDown: navigate playback
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (items.length > 0) {
          e.preventDefault();
          const curIdx = items.findIndex((i) => i.id === playingId);
          let nextIdx = 0;
          if (curIdx !== -1) {
            nextIdx =
              e.key === 'ArrowDown'
                ? (curIdx + 1) % items.length
                : (curIdx - 1 + items.length) % items.length;
          }
          const nextItem = items[nextIdx];
          handleTogglePlay(nextItem.id, nextItem.normalizedBuffer ? 'normalized' : 'original');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleVoiceKeyDown);
    return () => window.removeEventListener('keydown', handleVoiceKeyDown);
  }, [items, playingId, handleTogglePlay, stopPlayback, handleDeleteSelected, handleSelectAll]);

  // Filtered & Paginated items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const normalizedCount = items.filter((i) => !!i.normalizedBuffer).length;
  const selectedCount = items.filter((i) => !!i.isSelected).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden File Input for Header 'Add Files' Button */}
      <input
        ref={addFileInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFilesAdded(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Voice Leveler Dedicated Uploader - Shown ONLY when NO files are loaded */}
      {items.length === 0 && (
        <VoiceLevelerUploader
          lang={lang || 'en'}
          onFilesSelected={handleFilesAdded}
          isLoading={isImporting}
        />
      )}

      {/* Normalization Control Center */}
      {items.length > 0 && (
        <NormalizationControlBar
          target={target}
          onChangeTarget={handleTargetChange}
          onNormalizeAll={handleNormalizeAll}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenComparison={() => setIsComparisonOpen(true)}
          onAddFiles={() => addFileInputRef.current?.click()}
          onResetFiles={handleResetAll}
          lang={lang}
          isProcessing={isProcessing}
          totalCount={items.length}
          normalizedCount={normalizedCount}
          progressPercent={progressPercent}
          isPlaying={!!playingId}
        />
      )}

      {/* Toolbar: Search, Selection Bulk Actions & Pagination */}
      {items.length > 0 && (
        <VoiceBatchToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          totalItemsCount={items.length}
          filteredCount={filteredItems.length}
          selectedCount={selectedCount}
          onSelectAll={handleSelectAll}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onNormalizeSelected={handleNormalizeSelected}
          onExportSelected={() => setIsExportModalOpen(true)}
          onDeleteSelected={handleDeleteSelected}
          isProcessing={isProcessing}
        />
      )}

      {/* Voice Clips Cards Grid (matching Silent Slicer style) */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {paginatedItems.map((item) => (
            <AudioBatchItemCard
              key={item.id}
              item={item}
              target={target}
              isPlaying={playingId === item.id}
              activePlayingId={playingId}
              playbackSource={playbackSource}
              onTogglePlay={handleTogglePlay}
              onNormalizeSingle={handleNormalizeSingle}
              onUpdateTrim={handleUpdateItemTrim}
              onToggleSelect={handleToggleSelectItem}
              onRemove={(id) => {
                if (playingId === id) stopPlayback();
                setItems((prev) => prev.filter((i) => i.id !== id));
              }}
            />
          ))}
        </div>
      )}

      {/* Dedicated Bottom Player & Export Bar */}
      {items.length > 0 && (
        <IntelligencePlayerBar
          isPlaying={!!playingId}
          isSequential={isSequentialPlaying}
          playbackSource={playbackSource}
          volume={masterVolume}
          totalCount={items.length}
          selectedCount={selectedCount}
          activeItemName={playingId ? items.find((i) => i.id === playingId)?.name : items[0]?.name}
          hasNormalizedItems={normalizedCount > 0}
          analyserNode={analyserNodeRef.current}
          lang={lang}
          onPlayPause={() => {
            if (playingId) {
              stopPlayback();
            } else if (items.length > 0) {
              const first = items[0];
              const src = first.normalizedBuffer ? 'normalized' : 'original';
              playItemBuffer(first.id, src);
            }
          }}
          onStop={stopPlayback}
          onToggleSequential={handlePlaySequential}
          onToggleSource={(src) => setPlaybackSource(src)}
          onChangeVolume={setMasterVolume}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onResetFiles={handleResetAll}
        />
      )}

      {/* Import Progress Modal for Large Batches (100+ files) */}
      <ImportProgressModal
        isOpen={isImporting}
        current={importProgress.current}
        total={importProgress.total}
        currentFileName={importProgress.name}
        onCancel={() => {
          cancelImportRef.current = true;
          setIsImporting(false);
        }}
      />

      {/* Batch Normalization Progress Modal */}
      <BatchNormalizeProgressModal
        isOpen={isNormalizeModalOpen}
        current={normalizeProgress.current}
        total={normalizeProgress.total}
        currentFileName={normalizeProgress.name}
        progressPercent={normalizeProgress.percent}
        lang={lang}
        onCancel={() => {
          cancelNormalizeRef.current = true;
          setIsNormalizeModalOpen(false);
        }}
      />

      {/* Intelligence Export Modal */}
      <IntelligenceExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={selectedCount > 0 ? items.filter((i) => i.isSelected) : items}
        target={target}
        config={exportConfig}
        onUpdateConfig={setExportConfig}
        isExporting={isExporting}
        exportProgress={exportProgress}
        onExportZip={handleExportZip}
        onExportJoined={handleExportJoined}
        onCancel={() => {
          cancelExportRef.current = true;
          setIsExporting(false);
        }}
      />

      {/* Matrix Comparison Modal */}
      <BatchComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        items={items}
        target={target}
        onExportZip={() => setIsExportModalOpen(true)}
      />
    </div>
  );
};
