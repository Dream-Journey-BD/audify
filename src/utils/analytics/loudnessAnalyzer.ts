import { LoudnessAnalytics } from '../../types';
import { yieldToMain } from '../asyncScheduler';
import { createHighShelfFilter, createHighPassFilter } from './kWeightingFilter';
import { detectPitchFromMono, calculateSpectralDistribution } from './spectralAndPitch';

/**
 * Comprehensive Audio Analytics Engine
 * Calculates LUFS (ITU-R BS.1770), True Peak, RMS, Voice Pitch, and Frequency Distribution
 */
export async function analyzeAudioBuffer(buffer: AudioBuffer): Promise<LoudnessAnalytics> {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const totalDuration = buffer.duration;

  // 1. Peak & Oversampled True Peak estimation
  let maxAbsSample = 0;
  let sumSquares = 0;

  // Downmix to mono for fast analysis if multi-channel
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const channelData = buffer.getChannelData(c);
    const weight = 1 / channels;
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] * weight;
    }
  }

  for (let i = 0; i < length; i++) {
    const s = Math.abs(mono[i]);
    if (s > maxAbsSample) maxAbsSample = s;
    sumSquares += s * s;
  }

  const peakDb = maxAbsSample > 0 ? 20 * Math.log10(maxAbsSample) : -100;
  const rms = Math.sqrt(sumSquares / Math.max(1, length));
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;

  // Inter-sample true peak estimate
  let truePeak = maxAbsSample;
  const peakCandidateThreshold = maxAbsSample * 0.8;
  if (peakCandidateThreshold > 0.001) {
    for (let i = 1; i < length - 2; i += 2) {
      if (Math.abs(mono[i]) > peakCandidateThreshold || Math.abs(mono[i + 1]) > peakCandidateThreshold) {
        const interpolated = Math.abs(
          -0.0625 * mono[i - 1] + 0.5625 * mono[i] + 0.5625 * mono[i + 1] - 0.0625 * mono[i + 2]
        );
        if (interpolated > truePeak) truePeak = interpolated;
      }
    }
  }
  const truePeakDb = truePeak > 0 ? 20 * Math.log10(truePeak) : -100;
  const crestFactorDb = Math.max(0, peakDb - rmsDb);

  await yieldToMain();

  // 2. ITU-R BS.1770 K-Weighted Integrated Loudness
  const stage1 = createHighShelfFilter(sampleRate);
  const stage2 = createHighPassFilter(sampleRate);
  const kWeighted = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    kWeighted[i] = stage2.process(stage1.process(mono[i]));
  }

  // 400ms blocks with 100ms hop (75% overlap)
  const blockSize = Math.max(1, Math.floor(0.4 * sampleRate));
  const hopSize = Math.max(1, Math.floor(0.1 * sampleRate));
  const blockPowers: number[] = [];
  const rawRmsBlocks: number[] = [];

  for (let offset = 0; offset + blockSize <= length; offset += hopSize) {
    let blockSum = 0;
    let rawSum = 0;
    for (let j = 0; j < blockSize; j++) {
      const val = kWeighted[offset + j];
      blockSum += val * val;
      const rawVal = mono[offset + j];
      rawSum += rawVal * rawVal;
    }
    const z = blockSum / blockSize;
    blockPowers.push(z);
    rawRmsBlocks.push(Math.sqrt(rawSum / blockSize));
  }

  // Absolute gating threshold: -70 LKFS
  const gammaA = Math.pow(10, -70 / 10);
  let ungatedSum = 0;
  let ungatedCount = 0;

  for (const z of blockPowers) {
    if (z > gammaA) {
      ungatedSum += z;
      ungatedCount++;
    }
  }

  let integratedLufs = -70;
  if (ungatedCount > 0) {
    const ungatedMean = ungatedSum / ungatedCount;
    const gammaR = Math.pow(10, (10 * Math.log10(ungatedMean) - 10) / 10);

    let gatedSum = 0;
    let gatedCount = 0;
    for (const z of blockPowers) {
      if (z > gammaA && z > gammaR) {
        gatedSum += z;
        gatedCount++;
      }
    }

    if (gatedCount > 0) {
      const gatedMean = gatedSum / gatedCount;
      integratedLufs = -0.691 + 10 * Math.log10(gatedMean);
    }
  }

  // 3. Loudness Range (LRA) approximation
  const validBlocks = blockPowers
    .filter((p) => p > gammaA)
    .map((p) => -0.691 + 10 * Math.log10(p))
    .sort((a, b) => a - b);

  let loudnessRangeLra = 0;
  if (validBlocks.length > 5) {
    const p10 = validBlocks[Math.floor(validBlocks.length * 0.1)];
    const p95 = validBlocks[Math.floor(validBlocks.length * 0.95)];
    loudnessRangeLra = Math.max(0, Number((p95 - p10).toFixed(1)));
  }

  // 4. Speech vs Silence Duration
  const sortedRms = [...rawRmsBlocks].sort((a, b) => a - b);
  const noiseFloorRms = sortedRms.length > 0 ? sortedRms[Math.floor(sortedRms.length * 0.15)] : 0.001;
  const estimatedNoiseFloorDb = noiseFloorRms > 0 ? Math.max(-90, 20 * Math.log10(noiseFloorRms)) : -90;

  const speechThreshold = Math.max(0.005, noiseFloorRms * 3.2);
  let activeSpeechBlocks = 0;
  for (const bRms of rawRmsBlocks) {
    if (bRms >= speechThreshold) activeSpeechBlocks++;
  }

  const speechRatio = rawRmsBlocks.length > 0 ? (activeSpeechBlocks / rawRmsBlocks.length) * 100 : 80;
  const speechDuration = Number(((totalDuration * speechRatio) / 100).toFixed(2));
  const silenceDuration = Number(Math.max(0, totalDuration - speechDuration).toFixed(2));

  // 5. Pitch & Spectral Distribution
  const { pitchHz, pitchNote } = detectPitchFromMono(mono, sampleRate);
  const { spectralCentroidHz, spectralEnergy } = calculateSpectralDistribution(mono, sampleRate);

  // 6. Assessment
  let assessment: LoudnessAnalytics['assessment'] = 'optimal';
  if (truePeakDb >= -0.3) assessment = 'clipping';
  else if (integratedLufs > -12) assessment = 'loud';
  else if (integratedLufs < -22) assessment = 'quiet';

  return {
    peakDb: Number(peakDb.toFixed(1)),
    truePeakDb: Number(truePeakDb.toFixed(1)),
    rmsDb: Number(rmsDb.toFixed(1)),
    integratedLufs: Number(integratedLufs.toFixed(1)),
    loudnessRangeLra,
    crestFactorDb: Number(crestFactorDb.toFixed(1)),
    totalDuration: Number(totalDuration.toFixed(2)),
    speechDuration,
    silenceDuration,
    speechRatio: Number(speechRatio.toFixed(1)),
    estimatedNoiseFloorDb: Number(estimatedNoiseFloorDb.toFixed(1)),
    pitchHz,
    pitchNote,
    spectralCentroidHz,
    spectralEnergy,
    assessment,
  };
}
