import { AppLanguage } from '../../types';

let audioCtx: AudioContext | null = null;

/**
 * Returns the singleton AudioContext instance in running state
 */
export function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Formats time in seconds to mm:ss.ms or hh:mm:ss.ms when exceeding 60s
 * e.g., 5.4 -> "00:05.40"
 * e.g., 75.32 -> "01:15.32"
 * e.g., 3672.1 -> "01:01:12.10"
 */
export function formatTimeCode(totalSeconds: number, showMs: boolean = true): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 100);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const msStr = String(ms).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return showMs ? `${hh}:${mm}:${ss}.${msStr}` : `${hh}:${mm}:${ss}`;
  }

  return showMs ? `${mm}:${ss}.${msStr}` : `${mm}:${ss}`;
}

/**
 * Human-readable duration format (e.g. "1m 24.5s" or "4.32s")
 */
export function formatDurationFriendly(seconds: number, _lang?: AppLanguage): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remSec = (seconds % 60).toFixed(1);
  return `${minutes}m ${remSec}s`;
}

/**
 * Decodes any audio file (MP3, WAV, M4A, OGG, WebM, etc.) into an AudioBuffer
 */
export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

/**
 * Crops an AudioBuffer to a given start and end time range (in seconds)
 */
export function cropAudioBuffer(
  sourceBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;

  const validStart = Math.max(0, Math.min(startTime, sourceBuffer.duration));
  const validEnd = Math.max(validStart + 0.05, Math.min(endTime, sourceBuffer.duration));

  const startSample = Math.floor(validStart * sampleRate);
  const endSample = Math.floor(validEnd * sampleRate);
  const frameCount = Math.max(1, endSample - startSample);

  const croppedBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const destData = croppedBuffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      destData[i] = srcData[startSample + i] || 0;
    }
  }

  return croppedBuffer;
}
