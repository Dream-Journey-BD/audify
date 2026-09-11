import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioSegment,
  SilenceDetectionSettings,
  GlobalEffects,
  ExportSettings,
  AppLanguage,
  AudioMetadata,
  AppActiveTab,
} from './types';
import {
  getAudioContext,
  decodeAudioFile,
  detectSilenceSegments,
  detectSilenceSegmentsAsync,
  cropAudioBuffer,
  exportSegmentsZip,
  exportSegmentSingle,
  exportJoinedAudioBlob,
  mergeTwoAudioSegments,
  mergeMultipleAudioSegments,
  detectAndCompressSegmentInternalGaps,
  renderSegmentToAudioBuffer,
} from './utils/audioEngine';
import { yieldToMain } from './utils/asyncScheduler';
import { translations } from './utils/translations';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { AudioUploader } from './components/AudioUploader';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { SilenceDetectionPanel } from './components/SilenceDetectionPanel';
import { SegmentList } from './components/SegmentList';
import { EffectsPanel } from './components/EffectsPanel';
import { ExportModal } from './components/ExportModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { InfoModal } from './components/InfoModal';
import { AudioMetadataModal } from './components/AudioMetadataModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { TaskProgressModal } from './components/TaskProgressModal';
import { LoudnessIntelligenceSuite } from './components/intelligence/LoudnessIntelligenceSuite';
import { TgVoiceSuite } from './components/tgvoice/TgVoiceSuite';

export default function App() {
  // Application Language state (Default to 'en' as requested)
  const [lang, setLang] = useState<AppLanguage>('en');
  const [activeTab, setActiveTab] = useState<AppActiveTab>('slicer');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isCropped, setIsCropped] = useState<boolean>(false);
  const [isAudioMetadataModalOpen, setIsAudioMetadataModalOpen] = useState<boolean>(false);

  // Audio Metadata State
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata>({
    name: '',
    size: 0,
    duration: 0,
    sampleRate: 44100,
    numberOfChannels: 2,
    title: '',
    artist: '',
    album: '',
    genre: 'Speech',
    year: new Date().getFullYear().toString(),
    comment: '',
    bitrate: 320,
  });

  // Original uncropped audio buffer for reset capability
  const originalAudioBufferRef = useRef<AudioBuffer | null>(null);

  // Silence Detection Settings
  const [silenceSettings, setSilenceSettings] = useState<SilenceDetectionSettings>({
    thresholdDb: -38,
    minSilenceDuration: 0.25,
    padding: 0.06,
    minSpeechDuration: 0.12,
  });
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Segments State & Undo/Redo History Stack
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [history, setHistory] = useState<AudioSegment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const lastClickedIndexRef = useRef<number | null>(null);

  // Apply new segments state and record to undo history
  const applyNewSegments = useCallback(
    (newSegments: AudioSegment[], recordHistory = true) => {
      setSegments(newSegments);
      // Sync selected IDs to only valid segments
      const validIds = new Set(newSegments.map((s) => s.id));
      setSelectedSegmentIds((prev) => prev.filter((id) => validIds.has(id)));
      if (recordHistory) {
        setHistory((prev) => {
          const sliced = prev.slice(0, historyIndex + 1);
          return [...sliced, newSegments];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [historyIndex]
  );

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setSegments(history[prevIndex]);
    }
  }, [historyIndex, history]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setSegments(history[nextIndex]);
    }
  }, [historyIndex, history]);

  // Delete segment
  const handleDeleteSegment = useCallback((id: string) => {
    setSegments((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      const reindexed = filtered.map((s, i) => ({ ...s, index: i + 1 }));
      return reindexed;
    });
    setHistory((prev) => {
      const currentSegments = segmentsRef.current.filter((s) => s.id !== id);
      const reindexed = currentSegments.map((s, i) => ({ ...s, index: i + 1 }));
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, reindexed];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Delete multiple segments (from SegmentManagerModal & Shortcuts)
  const handleDeleteMultipleSegments = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setSegments((prev) => {
      const filtered = prev.filter((s) => !set.has(s.id));
      const reindexed = filtered.map((s, i) => ({ ...s, index: i + 1 }));
      return reindexed;
    });
    setHistory((prev) => {
      const currentSegments = segmentsRef.current.filter((s) => !set.has(s.id));
      const reindexed = currentSegments.map((s, i) => ({ ...s, index: i + 1 }));
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, reindexed];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleBatchDeleteSegments = useCallback((ids: string[]) => {
    handleDeleteMultipleSegments(ids);
    setSelectedSegmentIds([]);
  }, [handleDeleteMultipleSegments]);

  // References for keyboard shortcut handlers to always have fresh state without re-attaching listeners
  const segmentsRef = useRef<AudioSegment[]>(segments);
  segmentsRef.current = segments;
  const activeSegmentIdRef = useRef<string | null>(activeSegmentId);
  activeSegmentIdRef.current = activeSegmentId;
  const selectedSegmentIdsRef = useRef<string[]>(selectedSegmentIds);
  selectedSegmentIdsRef.current = selectedSegmentIds;
  const silenceSettingsRef = useRef<SilenceDetectionSettings>(silenceSettings);
  silenceSettingsRef.current = silenceSettings;

  // Merge multiple selected segments together (Supports toolbar & Ctrl+M)
  const handleMergeMultipleSegments = useCallback(
    (ids: string[]) => {
      if (ids.length < 2) return;
      const currentSegments = segmentsRef.current;
      const set = new Set(ids);
      const selected = currentSegments.filter((s) => set.has(s.id));
      if (selected.length < 2) return;

      const merged = mergeMultipleAudioSegments(
        selected,
        silenceSettingsRef.current.maxInternalGapMs || 300
      );

      const newSegs: AudioSegment[] = [];
      let mergedInserted = false;
      for (const seg of currentSegments) {
        if (set.has(seg.id)) {
          if (!mergedInserted) {
            newSegs.push(merged);
            mergedInserted = true;
          }
        } else {
          newSegs.push(seg);
        }
      }

      newSegs.sort((a, b) => a.start - b.start);
      const reindexed = newSegs.map((s, i) => ({ ...s, index: i + 1 }));
      applyNewSegments(reindexed, true);
      setActiveSegmentId(merged.id);
      setSelectedSegmentIds([merged.id]);
    },
    [applyNewSegments]
  );

  // Global keyboard shortcuts: Undo, Redo, Delete (Delete key only), Merge (Ctrl+M), Arrow key navigation
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      // Redo: Ctrl+Y / Cmd+Y / Ctrl+Shift+Z
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Merge selected segments: Ctrl+M / Cmd+M
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        const curSelected = selectedSegmentIdsRef.current;
        if (curSelected.length >= 2) {
          e.preventDefault();
          handleMergeMultipleSegments(curSelected);
        }
        return;
      }

      // Delete key: Delete active or selected segment(s) (Delete key ONLY, Backspace is excluded)
      if (e.key === 'Delete') {
        const curSelected = selectedSegmentIdsRef.current;
        const curActive = activeSegmentIdRef.current;
        const curSegments = segmentsRef.current;

        if (curSelected.length > 0) {
          e.preventDefault();
          handleBatchDeleteSegments(curSelected);
        } else if (curActive) {
          e.preventDefault();
          handleDeleteSegment(curActive);
          const remaining = curSegments.filter((s) => s.id !== curActive);
          if (remaining.length > 0) {
            const nextActive = remaining[0];
            setActiveSegmentId(nextActive.id);
            setSelectedSegmentIds([nextActive.id]);
          } else {
            setActiveSegmentId(null);
            setSelectedSegmentIds([]);
          }
        }
        return;
      }

      // Arrow Keys navigation: ArrowRight / ArrowDown for Next, ArrowLeft / ArrowUp for Previous
      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp'
      ) {
        const curSegments = segmentsRef.current;
        if (curSegments.length === 0) return;

        const curActive = activeSegmentIdRef.current;
        const currentIndex = curSegments.findIndex((s) => s.id === curActive);

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = currentIndex < curSegments.length - 1 ? currentIndex + 1 : 0;
          const nextSeg = curSegments[nextIndex];
          if (nextSeg) {
            setActiveSegmentId(nextSeg.id);
            setSelectedSegmentIds([nextSeg.id]);
            lastClickedIndexRef.current = nextIndex;
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : curSegments.length - 1;
          const prevSeg = curSegments[prevIndex];
          if (prevSeg) {
            setActiveSegmentId(prevSeg.id);
            setSelectedSegmentIds([prevSeg.id]);
            lastClickedIndexRef.current = prevIndex;
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleUndo, handleRedo, handleDeleteSegment, handleBatchDeleteSegments, handleMergeMultipleSegments]);

  // Multi-Select and Range-Select handler for Segment items
  const handleMultiSelectSegment = (id: string, isCtrl: boolean, isShift: boolean, index: number) => {
    setActiveSegmentId(id);

    if (isCtrl) {
      setSelectedSegmentIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((item) => item !== id);
        } else {
          return [...prev, id];
        }
      });
      lastClickedIndexRef.current = index;
    } else if (isShift && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const rangeIds = segments.slice(start, end + 1).map((s) => s.id);
      setSelectedSegmentIds(Array.from(new Set([...selectedSegmentIds, ...rangeIds])));
    } else {
      setSelectedSegmentIds([id]);
      lastClickedIndexRef.current = index;
    }
  };

  const handleSelectAllSegments = () => {
    setSelectedSegmentIds(segments.map((s) => s.id));
  };

  const handleClearSelection = () => {
    setSelectedSegmentIds(activeSegmentId ? [activeSegmentId] : []);
  };

  // Global Audio Effects
  const [globalEffects, setGlobalEffects] = useState<GlobalEffects>({
    speed: 1.0,
    pitch: 0,
    volume: 1.0,
    normalize: true,
  });

  // Export Settings
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    prefix: 'audio_clip',
    startNumber: 1,
    digits: 2,
    separator: '_',
    exportFormat: 'zip',
    exportAudioFormat: 'wav',
    mp3Bitrate: 320,
    description: '',
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; currentFile: string }>({
    percent: 0,
    currentFile: '',
  });
  const exportCancelRef = useRef(false);

  // Background Task Progress (Detection, Compression, etc.)
  const [taskProgress, setTaskProgress] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    percent: number;
    detail?: string;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    percent: 0,
  });
  const cancelTaskRef = useRef(false);

  // Setting Info Explanation Modal
  const [infoModalKey, setInfoModalKey] = useState<keyof typeof translations.bn.settingInfo | null>(
    null
  );

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [playingSubPartKey, setPlayingSubPartKey] = useState<string | null>(null);

  // Audio Node Refs
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const currentSpeedRef = useRef<number>(1.0);
  const lastRealTimeRef = useRef<number>(0);
  const currentBufferPosRef = useRef<number>(0);
  const playTargetEndRef = useRef<number | null>(null);
  const loopStartOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Stop active Web Audio playback
  const stopAudioNode = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Node was already stopped
      }
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setPlayingSegmentId(null);
    setPlayingSubPartKey(null);
    playTargetEndRef.current = null;
  }, []);

  // Real-time audio effects synchronization during live playback
  useEffect(() => {
    if (!isPlaying || !sourceNodeRef.current || !gainNodeRef.current) return;
    const ctx = getAudioContext();

    const seg = playingSegmentId ? segments.find((s) => s.id === playingSegmentId) : null;
    const effectiveSpeed = (seg?.speed || 1.0) * (globalEffects.speed || 1.0);
    const effectivePitch = (seg?.pitch || 0) + (globalEffects.pitch || 0);
    const effectiveVolume = masterVolume * (globalEffects.volume || 1.0) * (seg?.volume ?? 1.0);

    try {
      sourceNodeRef.current.playbackRate.setValueAtTime(
        Math.max(0.25, Math.min(effectiveSpeed, 4.0)),
        ctx.currentTime
      );
      sourceNodeRef.current.detune.setValueAtTime(effectivePitch * 100, ctx.currentTime);
      gainNodeRef.current.gain.setValueAtTime(Math.max(0, effectiveVolume), ctx.currentTime);
      currentSpeedRef.current = effectiveSpeed;
    } catch (err) {
      console.warn('Live audio param update warning:', err);
    }
  }, [globalEffects, masterVolume, isPlaying, playingSegmentId, segments]);

  // Play audio from specific offset
  const playAudioFrom = useCallback(
    (offsetSec: number, targetEndSec?: number, segmentId?: string, subPartKey?: string) => {
      if (!audioBuffer) return;

      stopAudioNode();
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const seg = segmentId ? segments.find((s) => s.id === segmentId) : null;
      const effectiveSpeed = (seg?.speed || 1.0) * (globalEffects.speed || 1.0);
      const effectivePitch = (seg?.pitch || 0) + (globalEffects.pitch || 0);
      const effectiveVolume = masterVolume * (globalEffects.volume || 1.0) * (seg?.volume ?? 1.0);

      source.playbackRate.value = effectiveSpeed;
      source.detune.value = effectivePitch * 100;

      const gain = ctx.createGain();
      gain.gain.value = effectiveVolume;

      source.connect(gain);
      gain.connect(ctx.destination);

      sourceNodeRef.current = source;
      gainNodeRef.current = gain;
      currentSpeedRef.current = effectiveSpeed;

      const validOffset = Math.max(0, Math.min(offsetSec, audioBuffer.duration));
      currentBufferPosRef.current = validOffset;
      loopStartOffsetRef.current = validOffset;
      lastRealTimeRef.current = ctx.currentTime;
      playTargetEndRef.current = targetEndSec ?? null;

      source.start(0, validOffset);
      setIsPlaying(true);
      if (subPartKey) {
        setPlayingSubPartKey(subPartKey);
        setPlayingSegmentId(null);
      } else if (segmentId) {
        setPlayingSegmentId(segmentId);
        setPlayingSubPartKey(null);
      } else {
        setPlayingSegmentId(null);
        setPlayingSubPartKey(null);
      }

      const updateLoop = () => {
        if (!sourceNodeRef.current) return;
        const now = ctx.currentTime;
        const realDelta = now - lastRealTimeRef.current;
        lastRealTimeRef.current = now;

        const bufferDelta = realDelta * currentSpeedRef.current;
        const newPos = currentBufferPosRef.current + bufferDelta;
        currentBufferPosRef.current = newPos;

        if (playTargetEndRef.current !== null && newPos >= playTargetEndRef.current) {
          if (isLooping) {
            playAudioFrom(loopStartOffsetRef.current, playTargetEndRef.current, segmentId, subPartKey);
          } else {
            setCurrentTime(playTargetEndRef.current);
            stopAudioNode();
          }
          return;
        }

        if (newPos >= audioBuffer.duration) {
          if (isLooping) {
            playAudioFrom(0);
          } else {
            setCurrentTime(audioBuffer.duration);
            stopAudioNode();
          }
          return;
        }

        setCurrentTime(newPos);
        animFrameRef.current = requestAnimationFrame(updateLoop);
      };

      animFrameRef.current = requestAnimationFrame(updateLoop);
    },
    [audioBuffer, segments, globalEffects, masterVolume, isLooping, stopAudioNode]
  );

  // Play / Pause toggle
  const handleTogglePlayPause = () => {
    if (isPlaying) {
      stopAudioNode();
    } else {
      if (currentTime >= (audioBuffer?.duration || 0)) {
        playAudioFrom(0);
      } else {
        playAudioFrom(currentTime);
      }
    }
  };

  // Play specific segment solo (renders compound segments identically to export for 100% preview fidelity)
  const handlePlaySegment = async (segment: AudioSegment) => {
    setActiveSegmentId(segment.id);
    setCurrentTime(segment.start);

    if (audioBuffer && segment.subRanges && segment.subRanges.length > 1) {
      try {
        stopAudioNode();
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const rendered = await renderSegmentToAudioBuffer(
          audioBuffer,
          segment,
          globalEffects,
          segment.maxInternalGapMs || silenceSettings.maxInternalGapMs || 300
        );

        const source = ctx.createBufferSource();
        source.buffer = rendered;

        const gain = ctx.createGain();
        gain.gain.value = masterVolume;
        source.connect(gain);
        gain.connect(ctx.destination);

        sourceNodeRef.current = source;
        gainNodeRef.current = gain;

        source.start(0);
        setIsPlaying(true);
        setPlayingSegmentId(segment.id);

        const startRealTime = ctx.currentTime;
        const dur = rendered.duration;

        const updateLoop = () => {
          if (!sourceNodeRef.current) return;
          const elapsed = ctx.currentTime - startRealTime;
          if (elapsed >= dur) {
            stopAudioNode();
            return;
          }
          animFrameRef.current = requestAnimationFrame(updateLoop);
        };
        animFrameRef.current = requestAnimationFrame(updateLoop);
        return;
      } catch (err) {
        console.warn('Fallback to standard playback for compound segment:', err);
      }
    }

    playAudioFrom(segment.start, segment.end, segment.id);
  };

  // Seek position
  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(newTime, audioBuffer?.duration || 0));
    setCurrentTime(clamped);
    if (isPlaying) {
      playAudioFrom(clamped);
    }
  };

  // Handle uploaded audio file
  const handleAudioSelected = async (file: File) => {
    try {
      setIsLoadingAudio(true);
      setAudioError(null);
      stopAudioNode();

      const decoded = await decodeAudioFile(file);
      originalAudioBufferRef.current = decoded;
      setAudioBuffer(decoded);
      setFileName(file.name);
      setCurrentTime(0);
      setIsCropped(false);

      // Auto detect silence segments on upload
      const initialSegs = detectSilenceSegments(decoded, silenceSettings);
      setSegments(initialSegs);
      setHistory([initialSegs]);
      setHistoryIndex(0);
      if (initialSegs.length > 0) {
        setActiveSegmentId(initialSegs[0].id);
      }

      // Set audio metadata from uploaded file
      const trackTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setAudioMetadata({
        name: file.name,
        size: file.size,
        duration: decoded.duration,
        sampleRate: decoded.sampleRate,
        numberOfChannels: decoded.numberOfChannels,
        title: trackTitle,
        artist: '',
        album: '',
        genre: 'Speech',
        year: new Date().getFullYear().toString(),
        comment: '',
        bitrate: 320,
      });

      // Automatically suggest base prefix from file name
      const cleanPrefix = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_\u0600-\u06FF\u0980-\u09FF]/g, '_')
        .toLowerCase();
      if (cleanPrefix) {
        setExportSettings((prev) => ({ ...prev, prefix: cleanPrefix }));
      }
    } catch (err) {
      console.error(err);
      setAudioError('Failed to load audio file. Please provide a valid MP3 or WAV file.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Handle Audio Crop
  const handleCropAudio = (startSec: number, endSec: number) => {
    if (!audioBuffer) return;
    try {
      stopAudioNode();
      const cropped = cropAudioBuffer(audioBuffer, startSec, endSec);
      setAudioBuffer(cropped);
      setIsCropped(true);
      setCurrentTime(0);

      // Re-run silence detection on cropped buffer
      const newSegs = detectSilenceSegments(cropped, silenceSettings);
      applyNewSegments(newSegs, true);
      if (newSegs.length > 0) {
        setActiveSegmentId(newSegs[0].id);
      }
    } catch (err) {
      console.error('Failed to crop audio:', err);
    }
  };

  // Handle Reset Crop
  const handleResetCropAudio = () => {
    if (!originalAudioBufferRef.current) return;
    stopAudioNode();
    const original = originalAudioBufferRef.current;
    setAudioBuffer(original);
    setIsCropped(false);
    setCurrentTime(0);

    const newSegs = detectSilenceSegments(original, silenceSettings);
    applyNewSegments(newSegs, true);
    if (newSegs.length > 0) {
      setActiveSegmentId(newSegs[0].id);
    }
  };

  // Re-run gap detection / Remove All Gaps in background thread with progress
  const handleRunDetection = async () => {
    if (!audioBuffer) return;
    setIsDetecting(true);
    stopAudioNode();
    cancelTaskRef.current = false;
    setTaskProgress({
      isOpen: true,
      title: 'Detecting Silence Gaps',
      subtitle: 'Analyzing audio signal in background thread...',
      percent: 0,
      onCancel: () => {
        cancelTaskRef.current = true;
        setTaskProgress((p) => ({ ...p, isOpen: false }));
        setIsDetecting(false);
      },
    });

    try {
      const segs = await detectSilenceSegmentsAsync(
        audioBuffer,
        silenceSettings,
        (percent) => {
          setTaskProgress((p) => ({
            ...p,
            percent,
            detail: `${percent}% analyzed`,
          }));
        }
      );

      if (!cancelTaskRef.current) {
        applyNewSegments(segs, true);
        if (segs.length > 0) {
          setActiveSegmentId(segs[0].id);
        }
      }
    } finally {
      setIsDetecting(false);
      setTaskProgress((p) => ({ ...p, isOpen: false }));
    }
  };

  // Helper to ensure subRanges always remain synchronized with segment start/end
  const syncSegmentBoundaries = (seg: AudioSegment, newStart?: number, newEnd?: number): AudioSegment => {
    const start = Number((newStart !== undefined ? newStart : seg.start).toFixed(3));
    const end = Number((newEnd !== undefined ? newEnd : seg.end).toFixed(3));

    let subRanges = seg.subRanges;
    if (subRanges && subRanges.length > 1) {
      const clamped = subRanges
        .map((r) => ({
          start: Number(Math.max(start, Math.min(end, r.start)).toFixed(3)),
          end: Number(Math.max(start, Math.min(end, r.end)).toFixed(3)),
        }))
        .filter((r) => r.end - r.start > 0.005);

      subRanges = clamped.length > 0 ? clamped : [{ start, end }];
    } else {
      subRanges = [{ start, end }];
    }

    return {
      ...seg,
      start,
      end,
      subRanges,
    };
  };

  // Update a single segment
  const handleUpdateSegment = (updated: AudioSegment) => {
    const synchronized = syncSegmentBoundaries(updated, updated.start, updated.end);
    const updatedSegs = segments.map((s) => (s.id === updated.id ? synchronized : s));
    applyNewSegments(updatedSegs, true);
  };

  // Update segment boundary times from waveform drag
  const handleUpdateSegmentTimes = (id: string, start: number, end: number) => {
    const updatedSegs = segments.map((s) => (s.id === id ? syncSegmentBoundaries(s, start, end) : s));
    applyNewSegments(updatedSegs, true);
  };

  // Unmerge multiple compound segments back into individual pieces
  const handleUnmergeMultipleSegments = (ids: string[]) => {
    const set = new Set(ids);
    const newSegs: AudioSegment[] = [];
    for (const seg of segments) {
      if (set.has(seg.id) && seg.subRanges && seg.subRanges.length > 1) {
        const parts: AudioSegment[] = seg.subRanges.map((sub, sIdx) => ({
          ...seg,
          id: `seg-${Date.now()}-${sIdx}-${Math.floor(Math.random() * 1000)}`,
          start: sub.start,
          end: sub.end,
          subRanges: undefined,
          customName: seg.customName ? `${seg.customName}_part${sIdx + 1}` : undefined,
        }));
        newSegs.push(...parts);
      } else {
        newSegs.push(seg);
      }
    }
    newSegs.sort((a, b) => a.start - b.start);
    const reindexed = newSegs.map((s, i) => ({ ...s, index: i + 1 }));
    applyNewSegments(reindexed, true);
  };

  // Remove a single sub-part from a merged segment and reintegrate it to the timeline
  const handleRemovePartFromMerge = (segmentId: string, partIndex: number) => {
    const segIndex = segments.findIndex((s) => s.id === segmentId);
    if (segIndex < 0) return;
    const seg = segments[segIndex];
    if (
      !seg.subRanges ||
      seg.subRanges.length <= 1 ||
      partIndex < 0 ||
      partIndex >= seg.subRanges.length
    )
      return;

    const removedSub = seg.subRanges[partIndex];
    const remainingSubs = seg.subRanges.filter((_, idx) => idx !== partIndex);

    const extractedPart: AudioSegment = {
      ...seg,
      id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      start: removedSub.start,
      end: removedSub.end,
      subRanges: undefined,
      customName: seg.customName ? `${seg.customName}_part${partIndex + 1}` : undefined,
    };

    let updatedCompound: AudioSegment;
    if (remainingSubs.length === 1) {
      updatedCompound = {
        ...seg,
        start: remainingSubs[0].start,
        end: remainingSubs[0].end,
        subRanges: undefined,
      };
    } else {
      updatedCompound = {
        ...seg,
        start: remainingSubs[0].start,
        end: remainingSubs[remainingSubs.length - 1].end,
        subRanges: remainingSubs,
      };
    }

    const copy = [...segments];
    copy.splice(segIndex, 1, updatedCompound, extractedPart);
    copy.sort((a, b) => a.start - b.start);
    const reindexed = copy.map((s, i) => ({ ...s, index: i + 1 }));
    applyNewSegments(reindexed, true);
  };

  // Play a sub-range solo for previewing in the dropdown
  const handlePlaySubRange = (segmentId: string, partIndex: number, start: number, end: number) => {
    const key = `${segmentId}-${partIndex}`;
    if (isPlaying && playingSubPartKey === key) {
      stopAudioNode();
    } else {
      stopAudioNode();
      setCurrentTime(start);
      playAudioFrom(start, end, segmentId, key);
    }
  };

  // Merge segment with next preserving sub-ranges and capping max internal gap
  const handleMergeWithNext = (id: string) => {
    const idx = segments.findIndex((s) => s.id === id);
    if (idx < 0 || idx >= segments.length - 1) return;

    const current = segments[idx];
    const next = segments[idx + 1];

    const merged = mergeTwoAudioSegments(current, next, silenceSettings.maxInternalGapMs || 300);

    const copy = [...segments];
    copy.splice(idx, 2, merged);
    const reindexed = copy.map((s, i) => ({ ...s, index: i + 1 }));
    applyNewSegments(reindexed, true);
  };

  // Unmerge compound segment back into constituent parts
  const handleUnmergeSegment = (id: string) => {
    const idx = segments.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const seg = segments[idx];
    if (!seg.subRanges || seg.subRanges.length <= 1) return;

    const splitPieces: AudioSegment[] = seg.subRanges.map((sub, sIdx) => ({
      ...seg,
      id: `seg-${Date.now()}-${sIdx}-${Math.floor(Math.random() * 1000)}`,
      start: sub.start,
      end: sub.end,
      subRanges: undefined,
      customName: seg.customName ? `${seg.customName}_part${sIdx + 1}` : undefined,
    }));

    const copy = [...segments];
    copy.splice(idx, 1, ...splitPieces);
    const reindexed = copy.map((s, i) => ({ ...s, index: i + 1 }));
    applyNewSegments(reindexed, true);
  };

  // Compress internal pauses for a single segment
  const handleCompressSegmentPauses = (seg: AudioSegment) => {
    if (!audioBuffer) return;
    const compressed = detectAndCompressSegmentInternalGaps(
      audioBuffer,
      seg,
      silenceSettings
    );
    handleUpdateSegment(compressed);
  };

  // Auto-compress internal pauses across all merged/long segments with time slicing & progress
  const handleCompressAllPauses = async () => {
    if (!audioBuffer || segments.length === 0) return;
    cancelTaskRef.current = false;
    setTaskProgress({
      isOpen: true,
      title: 'Compressing Internal Pauses',
      subtitle: 'Optimizing intra-speech pauses across all clips...',
      percent: 0,
      onCancel: () => {
        cancelTaskRef.current = true;
        setTaskProgress((p) => ({ ...p, isOpen: false }));
      },
    });

    const nextSegs: AudioSegment[] = [];
    for (let i = 0; i < segments.length; i++) {
      if (cancelTaskRef.current) break;
      const seg = segments[i];
      if (seg.subRanges && seg.subRanges.length > 1) {
        nextSegs.push({
          ...seg,
          maxInternalGapMs: silenceSettings.maxInternalGapMs || 300,
        });
      } else if (seg.end - seg.start > 1.2) {
        nextSegs.push(detectAndCompressSegmentInternalGaps(audioBuffer, seg, silenceSettings));
      } else {
        nextSegs.push(seg);
      }
      setTaskProgress((p) => ({
        ...p,
        percent: Math.round(((i + 1) / segments.length) * 100),
        detail: `${i + 1} / ${segments.length}`,
      }));
      await yieldToMain();
    }

    if (!cancelTaskRef.current) {
      applyNewSegments(nextSegs, true);
    }
    setTaskProgress((p) => ({ ...p, isOpen: false }));
  };

  // Add a manual segment around playhead
  const handleAddSegmentAtPlayhead = () => {
    if (!audioBuffer) return;
    const start = Math.max(0, currentTime - 0.3);
    const end = Math.min(audioBuffer.duration, currentTime + 0.3);

    const newSeg: AudioSegment = {
      id: `seg-${Date.now()}`,
      index: segments.length + 1,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
      enabled: true,
    };

    const updated = [...segments, newSeg].sort((a, b) => a.start - b.start);
    const reindexed = updated.map((s, i) => ({ ...s, index: i + 1 }));
    applyNewSegments(reindexed, true);
    setActiveSegmentId(newSeg.id);
  };

  // Export all as ZIP archive (WAV or MP3 format) with cancellation & background progress
  const handleExportZip = async () => {
    if (!audioBuffer || segments.length === 0) return;
    try {
      setIsExporting(true);
      exportCancelRef.current = false;
      const zipBlob = await exportSegmentsZip(
        audioBuffer,
        segments,
        exportSettings,
        globalEffects,
        (percent, currentFile) => setExportProgress({ percent, currentFile }),
        () => exportCancelRef.current
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportSettings.prefix || 'audio_segments'}_${exportSettings.exportAudioFormat}_clips.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('canceled')) {
        console.log('Export canceled by user');
      } else {
        console.error(err);
        alert('An error occurred during audio export.');
      }
    } finally {
      setIsExporting(false);
      setExportProgress({ percent: 0, currentFile: '' });
    }
  };

  // Export single joined audio file (all gaps removed!) with background progress & cancel
  const handleExportJoined = async () => {
    if (!audioBuffer || segments.length === 0) return;
    try {
      setIsExporting(true);
      exportCancelRef.current = false;
      const joinedBlob = await exportJoinedAudioBlob(
        audioBuffer,
        segments,
        exportSettings,
        globalEffects,
        (percent, currentFile) => setExportProgress({ percent, currentFile }),
        () => exportCancelRef.current
      );

      const ext = exportSettings.exportAudioFormat === 'mp3' ? 'mp3' : 'wav';
      const url = URL.createObjectURL(joinedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportSettings.prefix || 'audio'}_no_gaps_joined.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('canceled')) {
        console.log('Joined export canceled by user');
      } else {
        console.error(err);
        alert('Failed to export joined audio file.');
      }
    } finally {
      setIsExporting(false);
      setExportProgress({ percent: 0, currentFile: '' });
    }
  };

  // Export single segment (WAV or MP3 based on exportSettings)
  const handleDownloadSingleSegment = async (seg: AudioSegment) => {
    if (!audioBuffer) return;
    try {
      const { blob, fileName: singleFileName } = await exportSegmentSingle(
        audioBuffer,
        seg,
        exportSettings,
        globalEffects
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = singleFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download audio segment.');
    }
  };

  // Keyboard shortcut listener (Space = Play/Pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        handleTogglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, audioBuffer]);

  // Reset handlers for top shortcuts and bottom bars across all tools
  const voiceLevelerResetRef = useRef<(() => void) | null>(null);
  const tgVoiceResetRef = useRef<(() => void) | null>(null);

  const handleResetSlicer = useCallback(() => {
    stopAudioNode();
    setAudioBuffer(null);
    originalAudioBufferRef.current = null;
    setFileName('');
    setSegments([]);
    setHistory([]);
    setHistoryIndex(-1);
    setIsCropped(false);
  }, [stopAudioNode]);

  const handleGlobalReset = useCallback(() => {
    if (activeTab === 'slicer') {
      handleResetSlicer();
    } else if (activeTab === 'intelligence') {
      voiceLevelerResetRef.current?.();
    } else if (activeTab === 'tg-voice') {
      tgVoiceResetRef.current?.();
    }
  }, [activeTab, handleResetSlicer]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans pb-12">
      {/* Top Navigation & Brand */}
      <Header
        lang={lang}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onReset={handleGlobalReset}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        hasAudio={!!audioBuffer}
        fileName={fileName}
      />

      {/* Main App Tabs Navigation Layout Directly Below Header */}
      <NavigationTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        lang={lang}
      />

      {/* Main Studio View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Tab 3: TG Voice (Always mounted so uploaded files and processed items are preserved) */}
        <div className={activeTab === 'tg-voice' ? 'block' : 'hidden'}>
          <TgVoiceSuite onRegisterReset={(fn) => { tgVoiceResetRef.current = fn; }} />
        </div>

        {/* Tab 2: Voice Leveler (Always mounted so uploaded files and settings are never lost) */}
        <div className={activeTab === 'intelligence' ? 'block' : 'hidden'}>
          <LoudnessIntelligenceSuite
            currentStudioBuffer={audioBuffer}
            currentStudioFileName={fileName}
            lang={lang}
            onRegisterReset={(fn) => { voiceLevelerResetRef.current = fn; }}
            onImportToStudio={(buf, name) => {
              setAudioBuffer(buf);
              originalAudioBufferRef.current = buf;
              setFileName(name);
              setActiveTab('slicer');
            }}
          />
        </div>

        {/* Tab 1: Silence Slicer */}
        <div className={activeTab === 'slicer' ? 'block' : 'hidden'}>
          {!audioBuffer ? (
            <AudioUploader
              lang={lang}
              onFileSelected={handleAudioSelected}
              isLoading={isLoadingAudio}
              error={audioError}
            />
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. Waveform Canvas Studio */}
            <WaveformVisualizer
              lang={lang}
              audioBuffer={audioBuffer}
              segments={segments}
              activeSegmentId={activeSegmentId}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isCropped={isCropped}
              onSelectSegment={setActiveSegmentId}
              onUpdateSegmentTimes={handleUpdateSegmentTimes}
              onSeek={handleSeek}
              onPlayPause={handleTogglePlayPause}
              onAddSegmentAtPlayhead={handleAddSegmentAtPlayhead}
              onCropAudio={handleCropAudio}
              onResetCropAudio={handleResetCropAudio}
            />

            {/* 2. Silence Detection & One-Click Gap Removal */}
            <SilenceDetectionPanel
              lang={lang}
              settings={silenceSettings}
              onUpdateSettings={setSilenceSettings}
              onRunDetection={handleRunDetection}
              onCompressAllPauses={handleCompressAllPauses}
              totalDuration={audioBuffer.duration}
              segments={segments}
              isDetecting={isDetecting}
              onOpenInfo={(key) => setInfoModalKey(key)}
            />

            {/* 3. Audio Effects Panel with Live Real-time Modulation */}
            <EffectsPanel
              lang={lang}
              effects={globalEffects}
              onChangeEffects={setGlobalEffects}
              onOpenInfo={(key) => setInfoModalKey(key)}
              isPlaying={isPlaying}
            />

            {/* 4. Spoken Voice Segments List & Multi-Select Operations */}
            <SegmentList
              lang={lang}
              segments={segments}
              activeSegmentId={activeSegmentId}
              selectedSegmentIds={selectedSegmentIds}
              playingSegmentId={playingSegmentId}
              playingSubPartKey={playingSubPartKey}
              totalDuration={audioBuffer.duration}
              exportSettings={exportSettings}
              globalEffects={globalEffects}
              onSelectSegment={setActiveSegmentId}
              onMultiSelectSegment={handleMultiSelectSegment}
              onSelectAllSegments={handleSelectAllSegments}
              onClearSelection={handleClearSelection}
              onBatchDeleteSegments={handleBatchDeleteSegments}
              onMergeSelectedSegments={handleMergeMultipleSegments}
              onMergeWithNext={handleMergeWithNext}
              onPlaySegment={handlePlaySegment}
              onPlaySubRange={handlePlaySubRange}
              onStopPlayback={stopAudioNode}
              onUpdateSegment={handleUpdateSegment}
              onDeleteSegment={handleDeleteSegment}
              onUnmergeSegment={handleUnmergeSegment}
              onRemovePartFromMerge={handleRemovePartFromMerge}
              onDownloadSingle={handleDownloadSingleSegment}
              onCompressSegmentPauses={handleCompressSegmentPauses}
            />

            {/* 5. Bottom Audio Transport, Metadata & Quick Export Bar */}
            <AudioPlayerBar
              lang={lang}
              isPlaying={isPlaying}
              isLooping={isLooping}
              currentTime={currentTime}
              totalDuration={audioBuffer.duration}
              volume={masterVolume}
              segments={segments}
              onPlayPause={handleTogglePlayPause}
              onStop={stopAudioNode}
              onToggleLoop={() => setIsLooping(!isLooping)}
              onSeek={handleSeek}
              onChangeVolume={setMasterVolume}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenAudioMetadata={() => setIsAudioMetadataModalOpen(true)}
              onReset={handleResetSlicer}
            />
            </div>
          )}
        </div>
      </main>

      {/* Shortcuts Guide Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        lang={lang}
      />

      {/* Audio Properties & Metadata Modal */}
      <AudioMetadataModal
        isOpen={isAudioMetadataModalOpen}
        onClose={() => setIsAudioMetadataModalOpen(false)}
        lang={lang}
        metadata={audioMetadata}
      />

      {/* Save & Batch Export Modal with WAV/MP3 formats and Bitrate options */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        lang={lang}
        settings={exportSettings}
        onUpdateSettings={setExportSettings}
        segments={segments}
        isExporting={isExporting}
        exportProgress={exportProgress}
        onExportZip={handleExportZip}
        onExportJoined={handleExportJoined}
        onCancel={() => {
          exportCancelRef.current = true;
          setIsExporting(false);
        }}
        onOpenInfo={(key) => setInfoModalKey(key)}
      />

      {/* Background Task Progress Modal (Gap detection, pause compression, etc.) */}
      <TaskProgressModal
        isOpen={taskProgress.isOpen}
        title={taskProgress.title}
        subtitle={taskProgress.subtitle}
        percent={taskProgress.percent}
        currentDetail={taskProgress.detail}
        lang={lang}
        onCancel={taskProgress.onCancel}
      />

      {/* Setting Info Modal */}
      <InfoModal
        isOpen={!!infoModalKey}
        lang={lang}
        settingKey={infoModalKey}
        onClose={() => setInfoModalKey(null)}
      />
    </div>
  );
}
