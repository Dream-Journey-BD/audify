import React from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  FileArchive,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { AppLanguage, AudioSegment } from '../types';
import { translations } from '../utils/translations';
import { formatTimeCode } from '../utils/audioEngine';

interface AudioPlayerBarProps {
  lang: AppLanguage;
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  totalDuration: number;
  volume?: number;
  segments: AudioSegment[];
  onPlayPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onSeek?: (time: number) => void;
  onChangeVolume?: (vol: number) => void;
  onOpenExportModal: () => void;
  onOpenAudioMetadata?: () => void;
  onReset?: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  lang,
  isPlaying,
  isLooping,
  currentTime,
  totalDuration,
  segments,
  onPlayPause,
  onStop,
  onToggleLoop,
  onOpenExportModal,
  onOpenAudioMetadata,
  onReset,
}) => {
  const t = translations[lang] || translations.en;
  const activeCount = segments.filter((s) => s.enabled).length;

  return (
    <div
      id="bottom-audio-control-panel"
      className="w-full bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md mt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls: Play, Stop, Repeat, Timecode */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Main Play/Pause */}
          <button
            id="player-play-btn"
            type="button"
            onClick={onPlayPause}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
            title={isPlaying ? t.pause : t.play}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Stop */}
          <button
            id="player-stop-btn"
            type="button"
            onClick={onStop}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={t.stop}
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          {/* Loop / Repeat */}
          <button
            id="player-loop-btn"
            type="button"
            onClick={onToggleLoop}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              isLooping
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
            title={t.loop}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Timecode display */}
          <div
            id="player-timecode-display"
            className="h-10 sm:h-11 flex items-center font-mono text-xs sm:text-sm shrink-0 px-3 bg-neutral-950/70 rounded-xl border border-neutral-800"
          >
            <span className="text-amber-400 font-bold">{formatTimeCode(currentTime)}</span>
            <span className="text-neutral-500 mx-1.5">/</span>
            <span className="text-neutral-400">{formatTimeCode(totalDuration)}</span>
          </div>
        </div>

        {/* Action Controls in Same Unified Row: Reset, Metadata & Export */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto sm:ml-0">
          {onReset && (
            <button
              id="slicer-bottom-reset-btn"
              type="button"
              onClick={onReset}
              className="h-10 sm:h-11 inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 font-semibold text-xs sm:text-sm border border-neutral-700 transition-colors cursor-pointer shadow-sm"
              title={t.newFile || 'Reset Audio'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.newFile || 'Reset'}</span>
            </button>
          )}

          {onOpenAudioMetadata && (
            <button
              id="open-audio-metadata-btn"
              type="button"
              onClick={onOpenAudioMetadata}
              className="h-10 sm:h-11 inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 font-semibold text-xs sm:text-sm border border-neutral-700 transition-colors cursor-pointer shadow-sm"
              title={t.audioMetadataBtn || 'Metadata'}
            >
              <Tag className="w-4 h-4 text-sky-400" />
              <span>{t.audioMetadataBtn || 'Metadata'}</span>
            </button>
          )}

          <button
            id="open-export-modal-btn"
            type="button"
            onClick={onOpenExportModal}
            disabled={activeCount === 0}
            className="h-10 sm:h-11 inline-flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <FileArchive className="w-4 h-4 fill-current" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
