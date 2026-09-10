/**
 * Extracts downsampled peak and RMS data for high-performance waveform rendering
 */
export function extractWaveformPeaks(
  buffer: AudioBuffer,
  numBuckets: number = 2400
): { min: Float32Array; max: Float32Array; rms: Float32Array } {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const bucketSize = Math.max(1, Math.floor(length / numBuckets));
  const actualBuckets = Math.floor(length / bucketSize);

  const minPeaks = new Float32Array(actualBuckets);
  const maxPeaks = new Float32Array(actualBuckets);
  const rmsValues = new Float32Array(actualBuckets);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  for (let b = 0; b < actualBuckets; b++) {
    let min = 1.0;
    let max = -1.0;
    let sumSq = 0;
    const start = b * bucketSize;
    const end = Math.min(start + bucketSize, length);
    const count = end - start;

    for (let i = start; i < end; i++) {
      let mixed = 0;
      for (let c = 0; c < numChannels; c++) {
        mixed += channelData[c][i];
      }
      mixed /= numChannels;

      if (mixed < min) min = mixed;
      if (mixed > max) max = mixed;
      sumSq += mixed * mixed;
    }

    minPeaks[b] = min === 1.0 ? 0 : min;
    maxPeaks[b] = max === -1.0 ? 0 : max;
    rmsValues[b] = Math.sqrt(sumSq / (count || 1));
  }

  return { min: minPeaks, max: maxPeaks, rms: rmsValues };
}

/**
 * Normalizes an audio buffer in-place to 0.95 peak
 */
export function normalizeAudioBuffer(buffer: AudioBuffer): void {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }

  if (peak > 0.001 && peak < 0.99) {
    const multiplier = 0.95 / peak;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.max(-1, Math.min(1, data[i] * multiplier));
      }
    }
  }
}
