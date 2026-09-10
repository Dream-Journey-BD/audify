import { BatchAudioItem } from '../../types';
import { yieldToMain } from '../asyncScheduler';

/**
 * Concatenates all normalized audio buffers into one single joined AudioBuffer (synchronous)
 */
export function joinBatchAudioBuffers(
  items: BatchAudioItem[],
  pauseSec: number = 0.4
): AudioBuffer {
  if (items.length === 0) {
    const dummy = new AudioContext();
    return dummy.createBuffer(2, 44100, 44100);
  }

  const sampleRate = items[0].originalBuffer.sampleRate;
  const numChannels = Math.max(
    ...items.map((i) => (i.normalizedBuffer || i.originalBuffer).numberOfChannels)
  );
  const pauseSamples = Math.floor(pauseSec * sampleRate);

  let totalSamples = 0;
  for (let i = 0; i < items.length; i++) {
    const buf = items[i].normalizedBuffer || items[i].originalBuffer;
    totalSamples += buf.length;
    if (i < items.length - 1) {
      totalSamples += pauseSamples;
    }
  }

  const ctx = new AudioContext();
  const joinedBuffer = ctx.createBuffer(numChannels, totalSamples, sampleRate);

  let currentOffset = 0;
  for (let i = 0; i < items.length; i++) {
    const buf = items[i].normalizedBuffer || items[i].originalBuffer;
    for (let c = 0; c < numChannels; c++) {
      const srcChannel =
        c < buf.numberOfChannels ? buf.getChannelData(c) : buf.getChannelData(0);
      const destChannel = joinedBuffer.getChannelData(c);
      destChannel.set(srcChannel, currentOffset);
    }
    currentOffset += buf.length;
    if (i < items.length - 1) {
      currentOffset += pauseSamples;
    }
  }

  return joinedBuffer;
}

/**
 * Concatenates all normalized audio buffers asynchronously with progress and background yielding
 */
export async function joinBatchAudioBuffersAsync(
  items: BatchAudioItem[],
  pauseSec: number = 0.4,
  onProgress?: (percent: number, status: string) => void
): Promise<AudioBuffer> {
  if (items.length === 0) {
    const dummy = new AudioContext();
    return dummy.createBuffer(2, 44100, 44100);
  }

  const sampleRate = items[0].originalBuffer.sampleRate;
  const numChannels = Math.max(
    ...items.map((i) => (i.normalizedBuffer || i.originalBuffer).numberOfChannels)
  );
  const pauseSamples = Math.floor(pauseSec * sampleRate);

  let totalSamples = 0;
  for (let i = 0; i < items.length; i++) {
    const buf = items[i].normalizedBuffer || items[i].originalBuffer;
    totalSamples += buf.length;
    if (i < items.length - 1) {
      totalSamples += pauseSamples;
    }
  }

  const ctx = new AudioContext();
  const joinedBuffer = ctx.createBuffer(numChannels, totalSamples, sampleRate);

  let currentOffset = 0;
  for (let i = 0; i < items.length; i++) {
    const buf = items[i].normalizedBuffer || items[i].originalBuffer;
    for (let c = 0; c < numChannels; c++) {
      const srcChannel =
        c < buf.numberOfChannels ? buf.getChannelData(c) : buf.getChannelData(0);
      const destChannel = joinedBuffer.getChannelData(c);
      destChannel.set(srcChannel, currentOffset);
    }
    currentOffset += buf.length;
    if (i < items.length - 1) {
      currentOffset += pauseSamples;
    }

    if (i % 5 === 0) {
      if (onProgress) {
        onProgress(
          Math.round(((i + 1) / items.length) * 100),
          `Joining track ${i + 1}/${items.length}...`
        );
      }
      await yieldToMain();
    }
  }

  return joinedBuffer;
}
