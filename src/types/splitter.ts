export interface SplitPart {
  id: string;
  index: number;
  start: number; // in seconds
  end: number;   // in seconds
  name: string;
  blob?: Blob;
  duration: number;
}

export type SplitMode = 'equal-parts' | 'by-duration' | 'manual-markers';

export interface SplitterConfig {
  mode: SplitMode;
  partsCount: number;         // e.g. 2, 3, 4, 5, etc.
  partDurationSec: number;    // e.g. 60 sec (1 min)
  format: 'wav' | 'mp3';
  bitrate: 128 | 192 | 256 | 320;
}
