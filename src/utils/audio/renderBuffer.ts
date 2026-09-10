import { AudioSegment, GlobalEffects } from '../../types';
import { getAudioContext } from './context';
import { normalizeAudioBuffer } from './waveformAnalysis';
import { yieldToMain } from '../asyncScheduler';

interface BufferSlice {
  startSample: number;
  sampleCount: number;
}

/**
 * Render a single segment to AudioBuffer with speed, pitch and volume effects,
 * respecting capped internal silence gaps when sub-ranges exist.
 */
export async function renderSegmentToAudioBuffer(
  sourceBuffer: AudioBuffer,
  segment: AudioSegment,
  globalEffects?: GlobalEffects,
  defaultMaxGapMs: number = 300
): Promise<AudioBuffer> {
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const maxGapSec = (segment.maxInternalGapMs ?? defaultMaxGapMs) / 1000;

  const slices: BufferSlice[] = [];

  if (segment.subRanges && segment.subRanges.length > 1) {
    const sorted = [...segment.subRanges]
      .map((r) => ({
        start: Math.max(segment.start, Math.min(segment.end, r.start)),
        end: Math.max(segment.start, Math.min(segment.end, r.end)),
      }))
      .filter((r) => r.end - r.start > 0.005)
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const rStart = Math.max(0, Math.min(r.start, sourceBuffer.duration));
      const rEnd = Math.max(rStart, Math.min(r.end, sourceBuffer.duration));
      const startSample = Math.floor(rStart * sampleRate);
      const count = Math.max(0, Math.floor(rEnd * sampleRate) - startSample);
      if (count > 0) {
        slices.push({ startSample, sampleCount: count });
      }

      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        const nextStart = Math.max(segment.start, Math.min(next.start, sourceBuffer.duration));
        const rawGapSec = Math.max(0, nextStart - rEnd);
        const effectiveGapSec = Math.min(rawGapSec, maxGapSec);
        if (effectiveGapSec > 0.002) {
          const gapStartSample = Math.floor(rEnd * sampleRate);
          const gapCount = Math.min(
            Math.floor(effectiveGapSec * sampleRate),
            Math.floor((sourceBuffer.duration - rEnd) * sampleRate)
          );
          if (gapCount > 0) {
            slices.push({ startSample: gapStartSample, sampleCount: gapCount });
          }
        }
      }
    }
  }

  if (slices.length === 0) {
    const startSec = Math.max(0, Math.min(segment.start, sourceBuffer.duration));
    const endSec = Math.max(startSec + 0.01, Math.min(segment.end, sourceBuffer.duration));
    const startSample = Math.floor(startSec * sampleRate);
    const count = Math.max(128, Math.floor(endSec * sampleRate) - startSample);
    slices.push({ startSample, sampleCount: count });
  }

  const totalRawSamples = slices.reduce((acc, sl) => acc + sl.sampleCount, 0);

  const stitchedBuffer = getAudioContext().createBuffer(
    numChannels,
    Math.max(128, totalRawSamples),
    sampleRate
  );

  for (let c = 0; c < numChannels; c++) {
    const srcData = sourceBuffer.getChannelData(c);
    const destData = stitchedBuffer.getChannelData(c);
    let offset = 0;

    for (const sl of slices) {
      for (let i = 0; i < sl.sampleCount; i++) {
        let val = srcData[sl.startSample + i] || 0;
        if (offset > 0 && i < Math.floor(sampleRate * 0.005)) {
          const factor = i / Math.floor(sampleRate * 0.005);
          val *= factor;
        }
        const remaining = sl.sampleCount - 1 - i;
        if (offset + sl.sampleCount < totalRawSamples && remaining < Math.floor(sampleRate * 0.005)) {
          const factor = remaining / Math.floor(sampleRate * 0.005);
          val *= factor;
        }
        destData[offset + i] = val;
      }
      offset += sl.sampleCount;
    }
  }

  const effectiveSpeed = (segment.speed || 1.0) * (globalEffects?.speed || 1.0);
  const effectivePitch = (segment.pitch || 0) + (globalEffects?.pitch || 0);
  const effectiveVolume = (segment.volume ?? 1.0) * (globalEffects?.volume ?? 1.0);

  const renderedDuration = stitchedBuffer.duration / effectiveSpeed;
  const renderedSamples = Math.max(128, Math.ceil(renderedDuration * sampleRate));

  const offlineCtx = new OfflineAudioContext(numChannels, renderedSamples, sampleRate);

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = stitchedBuffer;
  sourceNode.playbackRate.value = effectiveSpeed;
  sourceNode.detune.value = effectivePitch * 100;

  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = effectiveVolume;

  sourceNode.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  sourceNode.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  if (globalEffects?.normalize) {
    normalizeAudioBuffer(renderedBuffer);
  }

  return renderedBuffer;
}

/**
 * Joins all enabled segments together (no gaps between clips!) with seamless crossfades and non-blocking progress
 */
export async function renderJoinedAudioBuffer(
  sourceBuffer: AudioBuffer,
  segments: AudioSegment[],
  globalEffects?: GlobalEffects,
  defaultMaxGapMs: number = 300,
  onProgress?: (percent: number, status: string) => void
): Promise<AudioBuffer> {
  const activeSegments = segments.filter((s) => s.enabled);
  if (activeSegments.length === 0) {
    throw new Error('No active segments selected to join.');
  }

  const renderedBuffers: AudioBuffer[] = [];
  let totalRenderedSamples = 0;
  const total = activeSegments.length;

  for (let i = 0; i < total; i++) {
    const seg = activeSegments[i];
    if (onProgress) {
      onProgress(Math.round((i / total) * 50), `Rendering clip ${i + 1}/${total}...`);
    }
    const buf = await renderSegmentToAudioBuffer(sourceBuffer, seg, globalEffects, defaultMaxGapMs);
    renderedBuffers.push(buf);
    totalRenderedSamples += buf.length;
    await yieldToMain();
  }

  if (onProgress) {
    onProgress(55, 'Stitching continuous audio stream...');
  }

  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;

  const joinedBuffer = getAudioContext().createBuffer(
    numChannels,
    Math.max(128, totalRenderedSamples),
    sampleRate
  );

  for (let c = 0; c < numChannels; c++) {
    const targetData = joinedBuffer.getChannelData(c);
    let offset = 0;

    for (let b = 0; b < renderedBuffers.length; b++) {
      const buf = renderedBuffers[b];
      const srcData = buf.getChannelData(c);
      targetData.set(srcData, offset);
      offset += buf.length;
      if (b % 15 === 0) {
        await yieldToMain();
      }
    }
  }

  if (onProgress) {
    onProgress(65, 'Audio stream stitched successfully');
  }

  return joinedBuffer;
}
