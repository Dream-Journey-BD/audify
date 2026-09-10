import { SpectralEnergyDistribution } from '../../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function frequencyToNote(freqHz: number): string {
  if (freqHz < 40 || freqHz > 2000) return 'N/A';
  const midi = Math.round(69 + 12 * Math.log2(freqHz / 440));
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

/**
 * Detects fundamental voice pitch (F0) using autocorrelation in 80Hz - 400Hz range
 */
export function detectPitchFromMono(
  mono: Float32Array,
  sampleRate: number
): { pitchHz: number; pitchNote: string } {
  let pitchHz = 0;
  const minPeriod = Math.floor(sampleRate / 400);
  const maxPeriod = Math.floor(sampleRate / 80);
  const length = mono.length;
  const windowSize = Math.min(2048, length);

  if (length >= windowSize) {
    const startIdx = Math.floor(length / 2) - Math.floor(windowSize / 2);
    let bestR = 0;
    let bestPeriod = 0;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let r = 0;
      for (let i = 0; i < windowSize - period; i++) {
        r += mono[startIdx + i] * mono[startIdx + i + period];
      }
      if (r > bestR) {
        bestR = r;
        bestPeriod = period;
      }
    }

    if (bestPeriod > 0) {
      pitchHz = Math.round(sampleRate / bestPeriod);
    }
  }

  return { pitchHz, pitchNote: frequencyToNote(pitchHz) };
}

/**
 * Calculates spectral centroid and 3-band energy distribution (low, mid, high)
 */
export function calculateSpectralDistribution(
  mono: Float32Array,
  sampleRate: number
): { spectralCentroidHz: number; spectralEnergy: SpectralEnergyDistribution } {
  const length = mono.length;
  const windowSizeFFT = 256;
  const fftCenter = Math.min(length - windowSizeFFT, Math.floor(length / 2));
  let sumMag = 0;
  let sumFreqMag = 0;
  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;

  const numBins = 32;
  for (let b = 1; b <= numBins; b++) {
    const k = Math.round((b / numBins) * (windowSizeFFT / 2));
    const freq = (k * sampleRate) / windowSizeFFT;
    let real = 0;
    let imag = 0;
    const step = (2 * Math.PI * k) / windowSizeFFT;
    for (let n = 0; n < windowSizeFFT; n++) {
      const angle = step * n;
      const xVal = mono[fftCenter + n];
      real += xVal * Math.cos(angle);
      imag -= xVal * Math.sin(angle);
    }
    const mag = Math.sqrt(real * real + imag * imag);
    sumMag += mag;
    sumFreqMag += freq * mag;

    if (freq < 250) lowEnergy += mag;
    else if (freq < 4000) midEnergy += mag;
    else highEnergy += mag;
  }

  const spectralCentroidHz = sumMag > 0 ? Math.round(sumFreqMag / sumMag) : 1500;
  const totalBand = Math.max(1, lowEnergy + midEnergy + highEnergy);
  const spectralEnergy: SpectralEnergyDistribution = {
    low: Math.round((lowEnergy / totalBand) * 100),
    mid: Math.round((midEnergy / totalBand) * 100),
    high: Math.round((highEnergy / totalBand) * 100),
  };

  return { spectralCentroidHz, spectralEnergy };
}
