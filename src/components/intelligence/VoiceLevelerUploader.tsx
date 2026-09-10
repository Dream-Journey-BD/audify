import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, ShieldCheck, Sliders, Zap, Sparkles } from 'lucide-react';
import { AppLanguage } from '../../types';
import { translations } from '../../utils/translations';

interface VoiceLevelerUploaderProps {
  lang: AppLanguage;
  onFilesSelected: (files: FileList | File[]) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const VoiceLevelerUploader: React.FC<VoiceLevelerUploaderProps> = ({
  lang,
  onFilesSelected,
  isLoading,
  error,
}) => {
  const t = translations[lang || 'en'] || translations.en;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-3 shadow-sm">
          <Sliders className="w-3.5 h-3.5" />
          <span>{t.voiceLevelerBadge}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight">
          {t.voiceLevelerUploadTitle}
        </h2>
        <p className="text-sm sm:text-base text-neutral-400 mt-2 max-w-xl mx-auto">
          {t.voiceLevelerUploadSub}
        </p>
      </div>

      {/* Main Multi-File Dropzone */}
      <div
        id="voice-leveler-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all p-8 sm:p-12 text-center cursor-pointer group ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : 'border-neutral-700 hover:border-amber-500/60 bg-neutral-900/60 hover:bg-neutral-900 shadow-xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-800 group-hover:bg-amber-500/20 border border-neutral-700 group-hover:border-amber-500/40 flex items-center justify-center text-amber-400 transition-transform duration-300 group-hover:scale-105 shadow-lg mb-4">
            {isLoading ? (
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-semibold text-neutral-200 group-hover:text-amber-300 transition-colors">
            {isLoading ? t.uploadDecoding : 'Click to select multiple voice tracks'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-md">
            or drag and drop multiple audio clips from your computer (10, 50, 100+ supported)
          </p>

          {/* Supported formats */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {['MP3', 'WAV', 'M4A', 'OGG', 'FLAC', 'AAC'].map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-md bg-neutral-800/80 text-neutral-400 border border-neutral-700/60"
              >
                .{fmt.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Clean Quick Specs */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-neutral-500 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          ITU-R BS.1770-4 LUFS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          EBU R128 Loudness Range (LRA)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          True Peak Inter-Sample Limiting
        </span>
      </div>
    </div>
  );
};
