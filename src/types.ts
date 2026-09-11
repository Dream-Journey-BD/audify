export interface TimeSubRange {
  start: number; // in seconds on source audio
  end: number;   // in seconds on source audio
}

export interface AudioSegment {
  id: string;
  index: number;
  start: number; // in seconds
  end: number;   // in seconds
  subRanges?: TimeSubRange[]; // sub-components for merged or compound phrases
  label?: string;
  customName?: string;
  speed: number;  // 0.5 to 2.0 (default 1.0)
  pitch: number;  // -12 to +12 semitones (default 0)
  volume: number; // 0.0 to 2.0 (default 1.0)
  enabled: boolean;
  maxInternalGapMs?: number; // per-segment gap cap override in milliseconds
}

export interface SilenceDetectionSettings {
  thresholdDb: number;        // e.g. -38 dB (-60 to -10)
  minSilenceDuration: number; // e.g. 0.25 seconds (0.05 to 2.0)
  padding: number;            // e.g. 0.05 seconds (0 to 0.3)
  minSpeechDuration: number;  // e.g. 0.10 seconds (0.05 to 0.5)
  maxInternalGapMs: number;   // max allowed silence between merged words/parts in ms (e.g. 300 ms)
  autoCompressInternalGaps?: boolean;
}

export interface GlobalEffects {
  speed: number;   // 0.5 to 2.0
  pitch: number;   // -12 to +12 semitones
  volume: number;  // 0.0 to 2.0
  normalize: boolean;
}

export type ExportAudioFormat = 'wav' | 'mp3' | 'ogg' | 'webm';
export type Mp3Bitrate = 128 | 192 | 256 | 320;

export interface ExportSettings {
  prefix: string;
  startNumber: number;
  digits: number; // 1 -> '1', 2 -> '01', 3 -> '001'
  separator: string; // '_', '-', ' '
  exportAudioFormat: ExportAudioFormat; // 'wav' | 'mp3' | 'ogg' | 'webm'
  mp3Bitrate: Mp3Bitrate; // 128, 192, 256, 320 kbps
  description?: string;
  includeTimestampSuffix?: boolean;
}

export type AppLanguage = 'bn' | 'en';

export type AppActiveTab = 'slicer' | 'intelligence' | 'tg-voice';

export interface TgVoiceItem {
  id: string;
  file: File;
  originalName: string;
  outputName: string;
  size: number;
  duration: number;
  originalChannels: number;
  originalSampleRate: number;
  originalBitrate?: number;
  selectedBitrate?: number | 'original';
  status: 'pending' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
  audioBuffer?: AudioBuffer;
  oggBlob?: Blob;
  waveformPeaks?: number[];
}

export interface AudioMetadata {
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  comment?: string;
  bitrate?: Mp3Bitrate | number;
}

export interface SpectralEnergyDistribution {
  low: number;   // 20Hz - 250Hz percentage
  mid: number;   // 250Hz - 4kHz percentage
  high: number;  // 4kHz - 20kHz percentage
}

export interface LoudnessAnalytics {
  peakDb: number;            // Peak level in dBFS (e.g. -1.5 dBFS)
  truePeakDb: number;        // Oversampled true peak in dBFS
  rmsDb: number;             // Average RMS energy in dBFS (e.g. -19.2 dBFS)
  integratedLufs: number;    // ITU-R BS.1770 compliant Integrated Loudness (LUFS)
  loudnessRangeLra: number;  // Loudness Range (LRA in LU)
  crestFactorDb: number;     // Ratio of Peak to RMS (Dynamic punch)
  totalDuration: number;     // Total duration in seconds
  speechDuration: number;    // Spoken speech active time in seconds
  silenceDuration: number;   // Pauses and silent gap time in seconds
  speechRatio: number;       // Percentage of active speech (0 - 100%)
  estimatedNoiseFloorDb: number; // Estimated background noise floor in dBFS
  pitchHz: number;           // Dominant fundamental frequency F0 in Hz
  pitchNote: string;         // Note name (e.g., "A2", "C3", "G3")
  spectralCentroidHz: number;// Brightness centroid in Hz
  spectralEnergy: SpectralEnergyDistribution;
  assessment: 'quiet' | 'optimal' | 'loud' | 'clipping';
}

export type NormalizationPreset =
  | 'podcast'        // -16 LUFS, -1.0 dBFS True Peak
  | 'youtube'        // -14 LUFS, -1.0 dBFS True Peak
  | 'spotify'        // -14 LUFS, -1.0 dBFS True Peak
  | 'dialogue_clean' // -18 LUFS, -1.0 dBFS True Peak
  | 'broadcast_ebu'  // -23 LUFS, -1.0 dBFS True Peak (EBU R128)
  | 'peak_minus1'    // Peak Normalization to -1.0 dBFS
  | 'clear_speech'   // -15 LUFS, -1.0 dBFS True Peak, Leveler Comp ON, 80Hz Cut ON, Vocal Boost ON
  | 'custom';

export interface NormalizationTarget {
  mode: 'lufs' | 'peak';
  preset: NormalizationPreset;
  targetLufs: number;          // Default -14 or -16
  targetPeakDb: number;        // Default -1.0
  enableCompressor: boolean;   // Smooth out internal volume fluctuations
  compressorThresholdDb: number; // e.g. -24 dB
  compressorRatio: number;     // e.g. 2.5
  enableHighPass: boolean;     // 80 Hz rumble filter
  enableWarmthEQ: boolean;     // +2.5 dB vocal presence
  preventClipping: boolean;    // Ceiling guard
  customGainOffsetDb: number;  // Global master trim
}

export interface BatchAudioItem {
  id: string;
  name: string;
  size: number;
  originalBuffer: AudioBuffer;
  normalizedBuffer: AudioBuffer | null;
  analytics: LoudnessAnalytics;
  normalizedAnalytics: LoudnessAnalytics | null;
  gainAppliedDb: number;
  customGainDb: number;        // Per-item fine-tune trim
  isSelected: boolean;
  isProcessing: boolean;
  status: 'analyzed' | 'normalizing' | 'normalized' | 'error';
  errorMessage?: string;
}

export interface IntelligenceExportConfig {
  format: 'wav' | 'mp3';
  mp3Bitrate: Mp3Bitrate;
  namingPattern: 'prefix_number' | 'original_normalized' | 'prefix_original';
  prefix: string;
  separator: string;
  digits: number;
  startNumber: number;
  exportMode: 'zip' | 'joined';
  joinedPauseDuration: number; // seconds of pause between joined clips (default 0.4)
  includeReport: boolean;
}

