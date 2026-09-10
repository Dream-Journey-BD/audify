import { AudioSegment, SilenceDetectionSettings } from '../../types';
import { yieldToMain } from '../asyncScheduler';

interface RawRange {
  start: number;
  end: number;
}

/**
 * High-precision silence and voice gap detector (synchronous)
 */
export function detectSilenceSegments(
  buffer: AudioBuffer,
  settings: SilenceDetectionSettings
): AudioSegment[] {
  const { thresholdDb, minSilenceDuration, padding, minSpeechDuration } = settings;
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const totalDuration = buffer.duration;

  const frameDuration = 0.02;
  const frameSize = Math.max(64, Math.floor(sampleRate * frameDuration));
  const totalFrames = Math.floor(buffer.length / frameSize);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  const isSpeechFrame: boolean[] = new Array(totalFrames);
  const thresholdLinear = Math.pow(10, thresholdDb / 20);

  for (let f = 0; f < totalFrames; f++) {
    let sumSquares = 0;
    const startIdx = f * frameSize;
    const endIdx = Math.min(startIdx + frameSize, buffer.length);
    const count = endIdx - startIdx;

    for (let i = startIdx; i < endIdx; i++) {
      let mixedSample = 0;
      for (let c = 0; c < numChannels; c++) {
        mixedSample += channelData[c][i];
      }
      mixedSample /= numChannels;
      sumSquares += mixedSample * mixedSample;
    }

    const rms = Math.sqrt(sumSquares / (count || 1));
    isSpeechFrame[f] = rms >= thresholdLinear;
  }

  return groupFramesIntoSegments(
    isSpeechFrame,
    totalFrames,
    frameDuration,
    totalDuration,
    minSilenceDuration,
    minSpeechDuration,
    padding,
    settings.maxInternalGapMs || 300
  );
}

/**
 * Asynchronously detects silence and speech segments with non-blocking time-slices and progress updates
 */
export async function detectSilenceSegmentsAsync(
  buffer: AudioBuffer,
  settings: SilenceDetectionSettings,
  onProgress?: (percent: number) => void
): Promise<AudioSegment[]> {
  const { thresholdDb, minSilenceDuration, padding, minSpeechDuration } = settings;
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const totalDuration = buffer.duration;

  const frameDuration = 0.02;
  const frameSize = Math.max(64, Math.floor(sampleRate * frameDuration));
  const totalFrames = Math.floor(buffer.length / frameSize);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  const isSpeechFrame: boolean[] = new Array(totalFrames);
  const thresholdLinear = Math.pow(10, thresholdDb / 20);
  const CHUNK_FRAMES = 1200; // ~24 seconds of audio per frame chunk

  for (let f = 0; f < totalFrames; f++) {
    let sumSquares = 0;
    const startIdx = f * frameSize;
    const endIdx = Math.min(startIdx + frameSize, buffer.length);
    const count = endIdx - startIdx;

    for (let i = startIdx; i < endIdx; i++) {
      let mixedSample = 0;
      for (let c = 0; c < numChannels; c++) {
        mixedSample += channelData[c][i];
      }
      mixedSample /= numChannels;
      sumSquares += mixedSample * mixedSample;
    }

    const rms = Math.sqrt(sumSquares / (count || 1));
    isSpeechFrame[f] = rms >= thresholdLinear;

    if (f % CHUNK_FRAMES === 0 && totalFrames > 0) {
      if (onProgress) {
        onProgress(Math.min(95, Math.round((f / totalFrames) * 90)));
      }
      await yieldToMain();
    }
  }

  const segments = groupFramesIntoSegments(
    isSpeechFrame,
    totalFrames,
    frameDuration,
    totalDuration,
    minSilenceDuration,
    minSpeechDuration,
    padding,
    settings.maxInternalGapMs || 300
  );

  if (onProgress) onProgress(100);
  return segments;
}

/**
 * Shared helper to convert speech frame booleans into padded, merged AudioSegments
 */
function groupFramesIntoSegments(
  isSpeechFrame: boolean[],
  totalFrames: number,
  frameDuration: number,
  totalDuration: number,
  minSilenceDuration: number,
  minSpeechDuration: number,
  padding: number,
  maxInternalGapMs: number
): AudioSegment[] {
  const rawSpeechRanges: RawRange[] = [];
  let inSpeech = false;
  let speechStartFrame = 0;

  for (let f = 0; f < totalFrames; f++) {
    if (isSpeechFrame[f]) {
      if (!inSpeech) {
        inSpeech = true;
        speechStartFrame = f;
      }
    } else {
      if (inSpeech) {
        inSpeech = false;
        const startSec = speechStartFrame * frameDuration;
        const endSec = f * frameDuration;
        rawSpeechRanges.push({ start: startSec, end: endSec });
      }
    }
  }
  if (inSpeech) {
    rawSpeechRanges.push({
      start: speechStartFrame * frameDuration,
      end: totalFrames * frameDuration,
    });
  }

  if (rawSpeechRanges.length === 0) {
    return [
      {
        id: `seg-${Date.now()}-1`,
        index: 1,
        start: 0,
        end: totalDuration,
        subRanges: [{ start: 0, end: totalDuration }],
        speed: 1.0,
        pitch: 0,
        volume: 1.0,
        enabled: true,
        maxInternalGapMs,
      },
    ];
  }

  const mergedRanges: RawRange[] = [];
  let current = { ...rawSpeechRanges[0] };

  for (let i = 1; i < rawSpeechRanges.length; i++) {
    const next = rawSpeechRanges[i];
    const gap = next.start - current.end;

    if (gap < minSilenceDuration) {
      current.end = next.end;
    } else {
      mergedRanges.push(current);
      current = { ...next };
    }
  }
  mergedRanges.push(current);

  const finalSegments: AudioSegment[] = [];
  let segIndex = 1;

  for (let i = 0; i < mergedRanges.length; i++) {
    const range = mergedRanges[i];
    const rawDur = range.end - range.start;
    if (rawDur < minSpeechDuration) {
      continue;
    }

    let paddedStart = Math.max(0, range.start - padding);
    let paddedEnd = Math.min(totalDuration, range.end + padding);

    if (i > 0) {
      const prevEnd = mergedRanges[i - 1].end;
      const midpoint = (range.start + prevEnd) / 2;
      if (paddedStart < midpoint && range.start > prevEnd) {
        paddedStart = Math.max(prevEnd, paddedStart);
      }
    }

    finalSegments.push({
      id: `seg-${Date.now()}-${segIndex}`,
      index: segIndex,
      start: Number(paddedStart.toFixed(3)),
      end: Number(paddedEnd.toFixed(3)),
      subRanges: [
        {
          start: Number(paddedStart.toFixed(3)),
          end: Number(paddedEnd.toFixed(3)),
        },
      ],
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
      enabled: true,
      maxInternalGapMs,
    });
    segIndex++;
  }

  return finalSegments.length > 0
    ? finalSegments
    : [
        {
          id: `seg-${Date.now()}-1`,
          index: 1,
          start: 0,
          end: totalDuration,
          subRanges: [{ start: 0, end: totalDuration }],
          speed: 1.0,
          pitch: 0,
          volume: 1.0,
          enabled: true,
          maxInternalGapMs,
        },
      ];
}
