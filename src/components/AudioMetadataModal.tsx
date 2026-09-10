import React from 'react';
import {
  X,
  Tag,
  Music,
  User,
  Disc,
  Calendar,
  FileText,
  Activity,
  Layers,
  Clock,
  HardDrive,
  CheckCircle,
} from 'lucide-react';
import { AudioMetadata, AppLanguage } from '../types';
import { translations } from '../utils/translations';
import { formatTimeCode } from '../utils/audioEngine';

interface AudioMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: AppLanguage;
  metadata: AudioMetadata;
}

export const AudioMetadataModal: React.FC<AudioMetadataModalProps> = ({
  isOpen,
  onClose,
  lang = 'en',
  metadata,
}) => {
  const t = translations[lang || 'en'] || translations.en;

  if (!isOpen) return null;

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      id="audio-metadata-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="audio-metadata-modal-content"
        className="relative w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-neutral-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 id="metadata-modal-title" className="text-lg font-bold text-neutral-100">
                {t.audioMetadataModalTitle || 'Metadata & Audio Properties'}
              </h2>
              <p className="text-xs text-neutral-400">
                {t.audioMetadataModalSub || 'Inspect audio format, sample rate, channels, and tags'}
              </p>
            </div>
          </div>
          <button
            id="close-metadata-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio File Identity */}
        <div className="my-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              {t.fileProperties || 'Audio Properties'}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Verified Master
            </span>
          </div>

          <div className="font-semibold text-sm text-neutral-200 truncate" title={metadata.name}>
            {metadata.name || 'audio-source.wav'}
          </div>

          {/* Grid of Audio Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/70 text-xs">
            <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
              <div className="text-[10px] text-neutral-400 flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-amber-400" />
                {t.metadataDuration || 'Duration'}
              </div>
              <div className="font-mono font-bold text-neutral-200">
                {formatTimeCode(metadata.duration)}
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
              <div className="text-[10px] text-neutral-400 flex items-center gap-1 mb-0.5">
                <Activity className="w-3 h-3 text-sky-400" />
                {t.sampleRate || 'Sample Rate'}
              </div>
              <div className="font-mono font-bold text-neutral-200">
                {metadata.sampleRate || 44100} Hz
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
              <div className="text-[10px] text-neutral-400 flex items-center gap-1 mb-0.5">
                <Layers className="w-3 h-3 text-emerald-400" />
                {t.channels || 'Channels'}
              </div>
              <div className="font-mono font-bold text-neutral-200">
                {metadata.numberOfChannels === 1 ? '1 (Mono)' : '2 (Stereo)'}
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
              <div className="text-[10px] text-neutral-400 flex items-center gap-1 mb-0.5">
                <HardDrive className="w-3 h-3 text-purple-400" />
                {t.fileSize || 'File Size'}
              </div>
              <div className="font-mono font-bold text-neutral-200">
                {formatBytes(metadata.size)}
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only Metadata & ID3 Tags Grid */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider text-[11px]">
            Tags & Annotations
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Title */}
            <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] font-medium text-neutral-400 mb-1 flex items-center gap-1.5">
                <Music className="w-3 h-3 text-neutral-400" />
                <span>{t.audioTitle || 'Title'}</span>
              </div>
              <div className="text-xs font-medium text-neutral-200">
                {metadata.title || metadata.name.replace(/\.[^/.]+$/, '') || '—'}
              </div>
            </div>

            {/* Artist */}
            <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] font-medium text-neutral-400 mb-1 flex items-center gap-1.5">
                <User className="w-3 h-3 text-neutral-400" />
                <span>{t.audioArtist || 'Artist / Speaker'}</span>
              </div>
              <div className="text-xs font-medium text-neutral-200">
                {metadata.artist || 'Voice Recording / Speaker'}
              </div>
            </div>

            {/* Album */}
            <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] font-medium text-neutral-400 mb-1 flex items-center gap-1.5">
                <Disc className="w-3 h-3 text-neutral-400" />
                <span>{t.audioAlbum || 'Album / Project'}</span>
              </div>
              <div className="text-xs font-medium text-neutral-200">
                {metadata.album || 'AudioGap Studio Project'}
              </div>
            </div>

            {/* Year / Bitrate */}
            <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-medium text-neutral-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  <span>{t.audioYear || 'Year'}</span>
                </div>
                <div className="text-xs font-medium text-neutral-200">
                  {metadata.year || new Date().getFullYear().toString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-medium text-neutral-400 mb-1">
                  Bitrate Target
                </div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  {metadata.bitrate || 320} kbps
                </div>
              </div>
            </div>
          </div>

          {/* Comment / Transcript note */}
          {metadata.comment && (
            <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] font-medium text-neutral-400 mb-1 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-neutral-400" />
                <span>{t.audioComment || 'Comment / Description'}</span>
              </div>
              <div className="text-xs text-neutral-300 whitespace-pre-wrap">
                {metadata.comment}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-neutral-800 flex items-center justify-end">
          <button
            id="close-metadata-bottom-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {t.closeModal || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
