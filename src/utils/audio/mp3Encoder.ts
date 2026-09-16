import { Mp3Encoder } from '@breezystack/lamejs';
import { Mp3Bitrate } from '../../types';
import { yieldToMain } from '../asyncScheduler';

/**
 * Converts Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767) for MP3 encoding
 */
function convertFloat32ToInt16(input: Float32Array): Int16Array {
  const len = input.length;
  const output = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = input[i];
    output[i] = s < -1 ? -32768 : s > 1 ? 32767 : s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0;
  }
  return output;
}

/**
 * Converts AudioBuffer to MP3 Blob using lamejs (synchronous)
 */
export function audioBufferToMp3Blob(buffer: AudioBuffer, bitrateKbps: Mp3Bitrate = 192): Blob {
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const sampleRate = buffer.sampleRate;
  const mp3Encoder = new Mp3Encoder(channels, sampleRate, bitrateKbps);
  const mp3Data: (Int8Array | Uint8Array | ArrayBuffer)[] = [];

  const leftChannel = convertFloat32ToInt16(buffer.getChannelData(0));
  const rightChannel =
    channels > 1 ? convertFloat32ToInt16(buffer.getChannelData(1)) : undefined;

  const sampleBlockSize = 1152;
  const length = leftChannel.length;

  for (let i = 0; i < length; i += sampleBlockSize) {
    const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array | Uint8Array;

    if (channels === 2 && rightChannel) {
      const rightChunk = rightChannel.subarray(i, i + sampleBlockSize);
      mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3Encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const endBuf = mp3Encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(endBuf);
  }

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
}

/**
 * Converts AudioBuffer to MP3 Blob asynchronously with background yielding and progress
 */
export async function audioBufferToMp3BlobAsync(
  buffer: AudioBuffer,
  bitrateKbps: Mp3Bitrate = 192,
  onProgress?: (percent: number) => void,
  shouldCancel?: () => boolean
): Promise<Blob> {
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const sampleRate = buffer.sampleRate;
  const mp3Encoder = new Mp3Encoder(channels, sampleRate, bitrateKbps);
  const mp3Data: (Int8Array | Uint8Array | ArrayBuffer)[] = [];

  const leftChannel = convertFloat32ToInt16(buffer.getChannelData(0));
  const rightChannel =
    channels > 1 ? convertFloat32ToInt16(buffer.getChannelData(1)) : undefined;

  const sampleBlockSize = 1152;
  const length = leftChannel.length;
  const totalBlocks = Math.ceil(length / sampleBlockSize);
  const CHUNK_BLOCKS = 20;

  let blockIndex = 0;
  for (let i = 0; i < length; i += sampleBlockSize) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('Encoding canceled');
    }
    const leftChunk = leftChannel.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array | Uint8Array;

    if (channels === 2 && rightChannel) {
      const rightChunk = rightChannel.subarray(i, i + sampleBlockSize);
      mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3Encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    blockIndex++;
    if (blockIndex % CHUNK_BLOCKS === 0) {
      if (onProgress) {
        onProgress(Math.min(99, Math.round((blockIndex / totalBlocks) * 100)));
      }
      await yieldToMain(true);
    }
  }

  const endBuf = mp3Encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(endBuf);
  }
  if (onProgress) {
    onProgress(100);
  }

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
}
