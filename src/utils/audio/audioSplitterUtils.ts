import { SplitPart, SplitterConfig } from '../../types/splitter';
import { getAudioContext } from './context';
import { audioBufferToWavBlobAsync } from './wavEncoder';
import { audioBufferToMp3BlobAsync } from './mp3Encoder';
import { yieldToMain } from '../asyncScheduler';
import JSZip from 'jszip';

/**
 * Slice an AudioBuffer by precise start and end times in seconds
 */
export function sliceBuffer(
  source: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const sampleRate = source.sampleRate;
  const numChannels = source.numberOfChannels;
  const clampedStart = Math.max(0, Math.min(startTime, source.duration));
  const clampedEnd = Math.max(clampedStart, Math.min(endTime, source.duration));

  const startSample = Math.floor(clampedStart * sampleRate);
  const endSample = Math.floor(clampedEnd * sampleRate);
  const length = Math.max(1, endSample - startSample);

  const ctx = getAudioContext();
  const sliced = ctx.createBuffer(numChannels, length, sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const srcData = source.getChannelData(c);
    const destData = sliced.getChannelData(c);
    destData.set(srcData.subarray(startSample, startSample + length));
  }

  return sliced;
}

/**
 * Calculate split intervals based on mode and config
 */
export function calculateSplitParts(
  totalDuration: number,
  baseFileName: string,
  config: SplitterConfig,
  manualCutPoints: number[] = []
): { parts: SplitPart[]; error?: string } {
  if (totalDuration <= 0) {
    return { parts: [], error: 'Audio file duration is invalid or zero.' };
  }

  const cleanBase = baseFileName.replace(/\.[^/.]+$/, '').trim() || 'audio';
  const parts: SplitPart[] = [];

  if (config.mode === 'equal-parts') {
    const count = Math.max(2, Math.min(100, Math.floor(config.partsCount || 2)));
    // Validation: Check minimum part length (at least 0.2 seconds per part)
    const minPartDuration = 0.2;
    if (totalDuration < count * minPartDuration) {
      return {
        parts: [],
        error: `Audio duration (${totalDuration.toFixed(1)}s) is too short to split into ${count} parts. Each part would be less than ${minPartDuration}s.`,
      };
    }

    const partLen = totalDuration / count;
    for (let i = 0; i < count; i++) {
      const start = i * partLen;
      const end = i === count - 1 ? totalDuration : (i + 1) * partLen;
      const indexStr = String(i + 1).padStart(2, '0');
      parts.push({
        id: `part-${i + 1}-${Math.random().toString(36).substring(2, 7)}`,
        index: i + 1,
        start,
        end,
        duration: end - start,
        name: `${cleanBase}_part_${indexStr}`,
      });
    }
  } else if (config.mode === 'by-duration') {
    const durationStep = Math.max(1, config.partDurationSec || 60);
    if (durationStep >= totalDuration) {
      return {
        parts: [],
        error: `Split duration (${durationStep}s) must be shorter than total audio duration (${totalDuration.toFixed(1)}s).`,
      };
    }

    let currentStart = 0;
    let idx = 1;
    while (currentStart < totalDuration) {
      const currentEnd = Math.min(totalDuration, currentStart + durationStep);
      const indexStr = String(idx).padStart(2, '0');
      parts.push({
        id: `part-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        index: idx,
        start: currentStart,
        end: currentEnd,
        duration: currentEnd - currentStart,
        name: `${cleanBase}_part_${indexStr}`,
      });
      currentStart = currentEnd;
      idx++;
    }
  } else if (config.mode === 'manual-markers') {
    // Unique, sorted cut markers strictly between 0 and totalDuration
    const validCuts = Array.from(new Set(manualCutPoints))
      .filter((t) => t > 0.1 && t < totalDuration - 0.1)
      .sort((a, b) => a - b);

    if (validCuts.length === 0) {
      return {
        parts: [],
        error: 'Please add at least one split marker inside the waveform to divide the audio.',
      };
    }

    const boundaries = [0, ...validCuts, totalDuration];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      const indexStr = String(i + 1).padStart(2, '0');
      parts.push({
        id: `part-${i + 1}-${Math.random().toString(36).substring(2, 7)}`,
        index: i + 1,
        start,
        end,
        duration: end - start,
        name: `${cleanBase}_part_${indexStr}`,
      });
    }
  }

  return { parts };
}

/**
 * Render a single split part to Blob
 */
export async function renderSplitPartBlob(
  sourceBuffer: AudioBuffer,
  part: SplitPart,
  format: 'wav' | 'mp3',
  bitrate: 128 | 192 | 256 | 320 = 192,
  onProgress?: (percent: number) => void,
  shouldCancel?: () => boolean
): Promise<Blob> {
  const sliced = sliceBuffer(sourceBuffer, part.start, part.end);
  if (format === 'mp3') {
    return await audioBufferToMp3BlobAsync(sliced, bitrate, onProgress, shouldCancel);
  } else {
    return await audioBufferToWavBlobAsync(sliced, onProgress, shouldCancel);
  }
}

/**
 * Batch export all split parts to a ZIP file with progress
 */
export async function exportSplitPartsZip(
  sourceBuffer: AudioBuffer,
  parts: SplitPart[],
  format: 'wav' | 'mp3' = 'mp3',
  bitrate: 128 | 192 | 256 | 320 = 192,
  zipBaseName: string = 'split_audio',
  onProgress?: (percent: number, currentName: string) => void,
  shouldCancel?: () => boolean
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(zipBaseName) || zip;
  const total = parts.length;

  for (let i = 0; i < total; i++) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('Export canceled by user');
    }

    const part = parts[i];
    const fileName = `${part.name.trim() || `part_${i + 1}`}.${format}`;
    const basePct = Math.round((i / total) * 80);
    const itemRange = (1 / total) * 80;

    if (onProgress) {
      onProgress(basePct, `Rendering ${i + 1}/${total}: ${fileName}`);
    }

    const blob = await renderSplitPartBlob(
      sourceBuffer,
      part,
      format,
      bitrate,
      (subPct) => {
        if (onProgress) {
          const currentPct = Math.min(84, Math.round(basePct + (subPct / 100) * itemRange));
          onProgress(currentPct, `Encoding ${i + 1}/${total}: ${fileName} (${subPct}%)`);
        }
      },
      shouldCancel
    );

    folder.file(fileName, blob);
    await yieldToMain(true);
  }

  if (onProgress) {
    onProgress(85, 'Creating ZIP archive...');
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: format === 'mp3' ? 'STORE' : 'DEFLATE',
      compressionOptions: {
        level: 1,
      },
    },
    (metadata) => {
      if (onProgress) {
        const pct = 85 + Math.round(metadata.percent * 0.15);
        onProgress(Math.min(99, pct), 'Compressing ZIP archive...');
      }
    }
  );

  return zipBlob;
}
