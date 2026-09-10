import { NormalizationTarget, LoudnessAnalytics } from '../../types';
import { analyzeAudioBuffer } from '../audioAnalytics';

/**
 * Normalizes an AudioBuffer to match target LUFS or Peak dBFS
 * with optional dynamic range smoothing, tone enhancement and anti-clipping true-peak ceiling.
 */
export async function normalizeAudioBuffer(
  buffer: AudioBuffer,
  target: NormalizationTarget,
  currentAnalytics?: LoudnessAnalytics,
  perItemTrimDb: number = 0
): Promise<{ buffer: AudioBuffer; gainAppliedDb: number; newAnalytics: LoudnessAnalytics }> {
  const analytics = currentAnalytics || (await analyzeAudioBuffer(buffer));
  const sampleRate = buffer.sampleRate;
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length;

  // 1. Calculate required gain in decibels
  let desiredGainDb = 0;
  if (target.mode === 'lufs') {
    desiredGainDb = target.targetLufs - analytics.integratedLufs;
  } else {
    desiredGainDb = target.targetPeakDb - analytics.peakDb;
  }

  // Add global master trim & per-item manual trim
  desiredGainDb += (target.customGainOffsetDb || 0) + perItemTrimDb;

  // Safety ceiling guard: prevent clipping over true peak ceiling
  const maxAllowedPeak = target.preventClipping ? target.targetPeakDb : -0.1;
  const projectedPeak = analytics.truePeakDb + desiredGainDb;
  if (projectedPeak > maxAllowedPeak) {
    desiredGainDb = Math.min(desiredGainDb, maxAllowedPeak - analytics.truePeakDb);
  }

  const linearGain = Math.pow(10, desiredGainDb / 20);

  // 2. Offline Audio Context Rendering with filters, compressor, and gain
  const offlineCtx = new OfflineAudioContext(numberOfChannels, length, sampleRate);
  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = buffer;

  let lastNode: AudioNode = sourceNode;

  // Optional 80Hz Low-cut Rumble filter
  if (target.enableHighPass) {
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(80, 0);
    hp.Q.setValueAtTime(0.707, 0);
    lastNode.connect(hp);
    lastNode = hp;
  }

  // Optional Vocal Presence EQ (+2.5 dB at 3kHz)
  if (target.enableWarmthEQ) {
    const eq = offlineCtx.createBiquadFilter();
    eq.type = 'peaking';
    eq.frequency.setValueAtTime(3000, 0);
    eq.Q.setValueAtTime(1.0, 0);
    eq.gain.setValueAtTime(2.5, 0);
    lastNode.connect(eq);
    lastNode = eq;
  }

  // Optional Voice Leveler (Speech Compression)
  if (target.enableCompressor) {
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(target.compressorThresholdDb, 0);
    compressor.knee.setValueAtTime(10, 0);
    compressor.ratio.setValueAtTime(target.compressorRatio, 0);
    compressor.attack.setValueAtTime(0.005, 0);
    compressor.release.setValueAtTime(0.12, 0);
    lastNode.connect(compressor);
    lastNode = compressor;
  }

  // Linear Gain Node
  const gainNode = offlineCtx.createGain();
  gainNode.gain.setValueAtTime(linearGain, 0);
  lastNode.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  sourceNode.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  // 3. Re-analyze normalized result for post-check
  const newAnalytics = await analyzeAudioBuffer(renderedBuffer);

  return {
    buffer: renderedBuffer,
    gainAppliedDb: Number(desiredGainDb.toFixed(2)),
    newAnalytics,
  };
}
