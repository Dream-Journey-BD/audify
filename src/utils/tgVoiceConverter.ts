import JSZip from 'jszip';
import opus from '@audio/encode-opus';
import { getAudioContext } from './audio/context';
import { yieldToMain } from './asyncScheduler';
import { demuxMp4Audio, decodeViaMediaElement } from './mediaDemuxer';

/**
 * Changes only the file extension to '.ogg', preserving the exact original filename base.
 * e.g., "Voice Memo 01.m4a" -> "Voice Memo 01.ogg"
 * e.g., "podcast.interview.mp4" -> "podcast.interview.ogg"
 */
export function getOutputOggFilename(originalFilename: string): string {
  const clean = originalFilename.replace(/\.[^/.]+$/, '');
  return `${clean || 'voice_message'}.ogg`;
}

/**
 * Extracts a normalized array of waveform peak values (between 0.1 and 1.0)
 * matching Telegram's iconic voice message waveform bubble.
 */
export function extractWaveformPeaks(buffer: AudioBuffer, numBars = 48): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.floor(data.length / numBars);
  const rawPeaks: number[] = [];
  let maxPeak = 0.0001;

  for (let i = 0; i < numBars; i++) {
    const start = i * step;
    const end = Math.min(start + step, data.length);
    let sum = 0;
    let count = 0;

    for (let j = start; j < end; j += 4) {
      const val = Math.abs(data[j]);
      sum += val * val;
      count++;
    }

    const rms = Math.sqrt(count > 0 ? sum / count : 0);
    rawPeaks.push(rms);
    if (rms > maxPeak) {
      maxPeak = rms;
    }
  }

  // Normalize between 0.12 (min bar height) and 1.0 (max bar height)
  return rawPeaks.map((p) => {
    const normalized = p / maxPeak;
    return Math.max(0.12, Math.min(1.0, Math.pow(normalized, 0.75)));
  });
}

/**
 * Downmixes any stereo or multi-channel AudioBuffer into a pristine Mono (1 channel) AudioBuffer.
 * This removes channel spatialization and standardizes audio for voice notes.
 */
export function convertToMonoAudioBuffer(source: AudioBuffer): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = source.sampleRate;
  const numChannels = source.numberOfChannels;
  const length = source.length;

  const monoBuffer = ctx.createBuffer(1, length, sampleRate);
  const monoData = monoBuffer.getChannelData(0);

  if (numChannels === 1) {
    monoData.set(source.getChannelData(0));
  } else {
    // Average all channels to prevent clipping and preserve balance
    const channelPointers: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channelPointers.push(source.getChannelData(c));
    }

    const factor = 1 / numChannels;
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let c = 0; c < numChannels; c++) {
        sum += channelPointers[c][i];
      }
      monoData[i] = sum * factor;
    }
  }

  return monoBuffer;
}

/**
 * Decodes audio from any user media file (audio or video container).
 * Uses Web Audio decodeAudioData, ISO BMFF audio demuxing, and HTMLMediaElement fallback.
 */
export async function decodeAnyMediaFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();

  // 1. First, try standard decodeAudioData (works for MP3, WAV, FLAC, OGG, M4A, AAC, etc.)
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return decoded;
  } catch (audioErr) {
    // 2. If it is an MP4/MOV container with video tracks, demux the audio track by masking video tracks as 'free'
    try {
      const mp4Result = demuxMp4Audio(arrayBuffer);
      if (mp4Result.isMp4) {
        if (!mp4Result.hasAudio) {
          throw new Error(
            `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
          );
        }
        if (mp4Result.buffer) {
          const decoded = await ctx.decodeAudioData(mp4Result.buffer.slice(0));
          return decoded;
        }
      }
    } catch (mp4Err: unknown) {
      if (
        mp4Err instanceof Error &&
        mp4Err.message.includes('Please ensure it contains a supported audio track')
      ) {
        throw mp4Err;
      }
    }

    // 3. Fallback for other video containers (WebM, MKV, etc.) via HTMLMediaElement pipeline
    return decodeViaMediaElement(file);
  }
}

/**
 * Resamples an AudioBuffer to a target sample rate using OfflineAudioContext.
 */
export async function resampleAudioBuffer(
  source: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
  if (source.sampleRate === targetSampleRate) return source;
  const numChannels = source.numberOfChannels;
  const length = Math.ceil(source.duration * targetSampleRate);
  const offlineCtx = new OfflineAudioContext(numChannels, length, targetSampleRate);
  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = source;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Applies voice/speech dynamic range compression to smooth peaks and balance volume.
 */
export async function applySpeechCompression(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
  return applySpeechEffects(audioBuffer, { compression: true, echoLevel: 0 });
}

/**
 * Applies optional speech compression and natural echo effects to an AudioBuffer.
 * Echo level is 0.0 to 1.0 (default 0).
 */
export async function applySpeechEffects(
  audioBuffer: AudioBuffer,
  options: { compression?: boolean; echoLevel?: number }
): Promise<AudioBuffer> {
  const { compression = false, echoLevel = 0 } = options;

  if (!compression && (!echoLevel || echoLevel <= 0)) {
    return audioBuffer;
  }

  const extraTailSeconds = echoLevel > 0 ? 0.8 : 0;
  const targetLength = Math.ceil((audioBuffer.duration + extraTailSeconds) * audioBuffer.sampleRate);

  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    targetLength,
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  let endNode: AudioNode;

  if (compression) {
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, 0);
    compressor.knee.setValueAtTime(10, 0);
    compressor.ratio.setValueAtTime(3.0, 0);
    compressor.attack.setValueAtTime(0.005, 0);
    compressor.release.setValueAtTime(0.08, 0);
    compressor.connect(offlineCtx.destination);
    endNode = compressor;
  } else {
    endNode = offlineCtx.destination;
  }

  const dryGain = offlineCtx.createGain();
  dryGain.gain.setValueAtTime(1.0, 0);
  source.connect(dryGain);
  dryGain.connect(endNode);

  if (echoLevel > 0) {
    const normalizedEcho = Math.min(1.0, Math.max(0, echoLevel));
    const delay = offlineCtx.createDelay(1.0);
    delay.delayTime.setValueAtTime(0.22, 0);

    const feedback = offlineCtx.createGain();
    feedback.gain.setValueAtTime(Math.min(0.60, normalizedEcho * 0.58), 0);

    const wetGain = offlineCtx.createGain();
    wetGain.gain.setValueAtTime(Math.min(0.72, normalizedEcho * 0.72), 0);

    source.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(endNode);
  }

  source.start(0);
  return await offlineCtx.startRendering();
}

export interface TgVoiceEncodeOptions {
  bitrate?: number; // kbps, e.g. 32, 64, 96, 128
  sampleRate?: number; // Hz, e.g. 48000, 44100, 24000, 16000
}

/**
 * Encodes a mono AudioBuffer to Ogg Opus format per RFC 7845.
 * libopus WASM profile: 48kHz (or target), mono, 64kbps (or target) VoIP application.
 * All existing metadata, album artwork, and tags are completely absent in the output.
 */
export async function encodeAudioBufferToOggOpus(
  monoBuffer: AudioBuffer,
  optionsOrProgress?: TgVoiceEncodeOptions | ((percent: number) => void),
  onProgressCallback?: (percent: number) => void
): Promise<Blob> {
  let options: TgVoiceEncodeOptions = {};
  let onProgress: ((percent: number) => void) | undefined = onProgressCallback;

  if (typeof optionsOrProgress === 'function') {
    onProgress = optionsOrProgress;
  } else if (optionsOrProgress) {
    options = optionsOrProgress;
  }

  const targetSampleRate = options.sampleRate || 48000;
  const bufferToEncode =
    monoBuffer.sampleRate !== targetSampleRate
      ? await resampleAudioBuffer(monoBuffer, targetSampleRate)
      : monoBuffer;

  const pcm = bufferToEncode.getChannelData(0);
  const sampleRate = bufferToEncode.sampleRate;
  const totalSamples = pcm.length;
  const bitrate = options.bitrate || 64;

  // Initialize libopus WASM stream encoder
  const encoder = await opus({
    sampleRate,
    channels: 1,
    bitrate, // Telegram VoIP sweet spot default: 64 kbps
    application: 'voip', // VoIP/speech profile
    complexity: 10,
    // meta is omitted -> OpusTags will contain ZERO user comments / artwork / title / artist!
  });

  const chunks: Uint8Array[] = [];
  // Process 0.4 seconds (19,200 samples at 48kHz) per chunk for continuous fluid UI progress
  const chunkSize = Math.max(9600, Math.floor(sampleRate * 0.4));
  let offset = 0;

  while (offset < totalSamples) {
    const end = Math.min(offset + chunkSize, totalSamples);
    const slice = pcm.subarray(offset, end);
    const chunkBytes = encoder.encode([slice]);

    if (chunkBytes && chunkBytes.length > 0) {
      chunks.push(chunkBytes);
    }

    offset = end;
    if (onProgress) {
      const pct = Math.min(95, Math.round((offset / totalSamples) * 90));
      onProgress(pct);
    }

    // Yield with guaranteed render interval to prevent phone UI stutter
    await yieldToMain(true);
  }

  // Flush remaining Opus pages + End of Stream (EOS)
  const tailBytes = encoder.flush();
  if (tailBytes && tailBytes.length > 0) {
    chunks.push(tailBytes);
  }

  encoder.free();

  if (onProgress) {
    onProgress(100);
  }

  // Combine into single Uint8Array for final Blob
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of chunks) {
    combined.set(c, pos);
    pos += c.length;
  }

  return new Blob([combined], { type: 'audio/ogg; codecs=opus' });
}

/**
 * Packages multiple .ogg files into a ZIP archive, keeping the exact same filename structure.
 * Uses STORE compression for instantaneous archiving since Opus audio is already entropy-compressed.
 */
export async function exportMultipleOggZip(
  items: { outputName: string; oggBlob: Blob }[],
  onProgress?: (percent: number, currentName: string) => void,
  shouldCancel?: () => boolean
): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < items.length; i++) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('Export canceled by user');
    }
    const item = items[i];
    zip.file(item.outputName, item.oggBlob);
    if (onProgress) {
      const pct = Math.round(((i + 1) / items.length) * 50);
      onProgress(pct, item.outputName);
    }
    await yieldToMain(true);
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'STORE',
    },
    (metadata) => {
      if (onProgress) {
        onProgress(50 + Math.round(metadata.percent * 0.5), 'Packaging ZIP archive...');
      }
    }
  );

  return zipBlob;
}
