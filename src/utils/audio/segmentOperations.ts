import { AudioSegment, TimeSubRange, SilenceDetectionSettings } from '../../types';

/**
 * Calculates the effective duration (in seconds) of an audio segment,
 * accounting for capped internal silence gaps when multiple sub-ranges exist.
 */
export function calculateSegmentEffectiveDuration(
  segment: AudioSegment,
  defaultMaxGapMs: number = 300
): number {
  const maxGapSec = (segment.maxInternalGapMs ?? defaultMaxGapMs) / 1000;
  if (!segment.subRanges || segment.subRanges.length <= 1) {
    return Math.max(0, segment.end - segment.start);
  }

  const sorted = [...segment.subRanges]
    .map((r) => ({
      start: Math.max(segment.start, Math.min(segment.end, r.start)),
      end: Math.max(segment.start, Math.min(segment.end, r.end)),
    }))
    .filter((r) => r.end - r.start > 0.005)
    .sort((a, b) => a.start - b.start);

  if (sorted.length <= 1) {
    return Math.max(0, segment.end - segment.start);
  }

  let totalDur = 0;
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const dur = Math.max(0, r.end - r.start);
    totalDur += dur;

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const rawGap = Math.max(0, next.start - r.end);
      const effectiveGap = Math.min(rawGap, maxGapSec);
      totalDur += effectiveGap;
    }
  }

  return Number(totalDur.toFixed(3));
}

/**
 * Calculates the time (in seconds) saved by capping internal silence gaps in a segment.
 */
export function calculateSegmentSavedGap(
  segment: AudioSegment,
  defaultMaxGapMs: number = 300
): number {
  if (!segment.subRanges || segment.subRanges.length <= 1) return 0;
  const rawSpan = Math.max(0, segment.end - segment.start);
  const effectiveDur = calculateSegmentEffectiveDuration(segment, defaultMaxGapMs);
  return Math.max(0, Number((rawSpan - effectiveDur).toFixed(3)));
}

/**
 * Merges two segments into a single segment with preserved sub-ranges
 * and auto-capped internal silence.
 */
export function mergeTwoAudioSegments(
  seg1: AudioSegment,
  seg2: AudioSegment,
  maxGapMs: number = 300
): AudioSegment {
  return mergeMultipleAudioSegments([seg1, seg2], maxGapMs);
}

/**
 * Merges multiple selected segments into a single segment with preserved sub-ranges
 * and auto-capped internal silence.
 */
export function mergeMultipleAudioSegments(
  segmentsToMerge: AudioSegment[],
  maxGapMs: number = 300
): AudioSegment {
  if (segmentsToMerge.length === 0) {
    throw new Error('Cannot merge empty segment array');
  }
  if (segmentsToMerge.length === 1) {
    return segmentsToMerge[0];
  }

  const sorted = [...segmentsToMerge].sort((a, b) => a.start - b.start);
  const allRanges: TimeSubRange[] = [];

  for (const seg of sorted) {
    if (seg.subRanges && seg.subRanges.length > 1) {
      for (const r of seg.subRanges) {
        const clampedStart = Math.max(seg.start, Math.min(seg.end, r.start));
        const clampedEnd = Math.max(clampedStart, Math.min(seg.end, r.end));
        if (clampedEnd - clampedStart > 0.005) {
          allRanges.push({
            start: Number(clampedStart.toFixed(3)),
            end: Number(clampedEnd.toFixed(3)),
          });
        }
      }
    } else {
      allRanges.push({
        start: Number(seg.start.toFixed(3)),
        end: Number(seg.end.toFixed(3)),
      });
    }
  }

  allRanges.sort((a, b) => a.start - b.start);

  const overallStart = allRanges.length > 0 ? allRanges[0].start : sorted[0].start;
  const overallEnd = allRanges.length > 0 ? allRanges[allRanges.length - 1].end : sorted[sorted.length - 1].end;
  const customName = sorted.find((s) => s.customName)?.customName;

  return {
    ...sorted[0],
    id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    start: Number(overallStart.toFixed(3)),
    end: Number(overallEnd.toFixed(3)),
    subRanges: allRanges,
    customName,
    maxInternalGapMs: sorted[0].maxInternalGapMs ?? maxGapMs,
  };
}

/**
 * Scans a single segment for internal silence pauses and builds sub-ranges
 * so any pauses exceeding maxInternalGapMs can be capped safely without cutting words.
 */
export function detectAndCompressSegmentInternalGaps(
  sourceBuffer: AudioBuffer,
  segment: AudioSegment,
  settings: SilenceDetectionSettings
): AudioSegment {
  const { thresholdDb, minSilenceDuration, padding, minSpeechDuration, maxInternalGapMs } = settings;
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;

  const startSec = Math.max(0, Math.min(segment.start, sourceBuffer.duration));
  const endSec = Math.max(startSec + 0.05, Math.min(segment.end, sourceBuffer.duration));

  const frameDuration = 0.015; // 15ms resolution
  const frameSize = Math.max(64, Math.floor(sampleRate * frameDuration));
  const startFrame = Math.floor((startSec * sampleRate) / frameSize);
  const endFrame = Math.floor((endSec * sampleRate) / frameSize);
  const totalFrames = endFrame - startFrame;

  if (totalFrames <= 4) {
    return segment;
  }

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(sourceBuffer.getChannelData(c));
  }

  const thresholdLinear = Math.pow(10, thresholdDb / 20);
  const isSpeech: boolean[] = new Array(totalFrames);

  for (let f = 0; f < totalFrames; f++) {
    let sumSq = 0;
    const globalSampleStart = (startFrame + f) * frameSize;
    const count = Math.min(frameSize, sourceBuffer.length - globalSampleStart);
    if (count <= 0) break;

    for (let i = 0; i < count; i++) {
      let mixed = 0;
      for (let c = 0; c < numChannels; c++) {
        mixed += channelData[c][globalSampleStart + i];
      }
      mixed /= numChannels;
      sumSq += mixed * mixed;
    }
    const rms = Math.sqrt(sumSq / (count || 1));
    isSpeech[f] = rms >= thresholdLinear;
  }

  const subSpeech: Array<{ start: number; end: number }> = [];
  let inSpeech = false;
  let spStart = 0;

  for (let f = 0; f < totalFrames; f++) {
    if (isSpeech[f]) {
      if (!inSpeech) {
        inSpeech = true;
        spStart = f;
      }
    } else {
      if (inSpeech) {
        inSpeech = false;
        const sSec = startSec + spStart * frameDuration;
        const eSec = startSec + f * frameDuration;
        subSpeech.push({ start: sSec, end: eSec });
      }
    }
  }
  if (inSpeech) {
    subSpeech.push({ start: startSec + spStart * frameDuration, end: endSec });
  }

  if (subSpeech.length <= 1) {
    return {
      ...segment,
      subRanges: [{ start: segment.start, end: segment.end }],
      maxInternalGapMs,
    };
  }

  const gapThresholdSec = Math.max(minSilenceDuration, (maxInternalGapMs || 300) / 1000 + 0.05, 0.35);
  const mergedSub: Array<{ start: number; end: number }> = [];
  let curr = { ...subSpeech[0] };

  for (let i = 1; i < subSpeech.length; i++) {
    const next = subSpeech[i];
    const gap = next.start - curr.end;
    if (gap < gapThresholdSec) {
      curr.end = next.end;
    } else {
      mergedSub.push(curr);
      curr = { ...next };
    }
  }
  mergedSub.push(curr);

  const safePadding = Math.max(padding, 0.08);
  const finalSub: { start: number; end: number }[] = [];
  for (let i = 0; i < mergedSub.length; i++) {
    const item = mergedSub[i];
    if (item.end - item.start < minSpeechDuration) continue;
    const pStart = Math.max(startSec, item.start - safePadding);
    const pEnd = Math.min(endSec, item.end + safePadding);
    finalSub.push({
      start: Number(pStart.toFixed(3)),
      end: Number(pEnd.toFixed(3)),
    });
  }

  return {
    ...segment,
    subRanges: finalSub.length > 1 ? finalSub : [{ start: segment.start, end: segment.end }],
    maxInternalGapMs,
  };
}
