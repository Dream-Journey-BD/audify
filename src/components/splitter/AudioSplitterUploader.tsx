import React, { useRef, useState } from 'react';
import { Split, UploadCloud, ShieldCheck, Zap } from 'lucide-react';
import { AppLanguage } from '../../types';

interface AudioSplitterUploaderProps {
  lang?: AppLanguage;
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  decodingProgress?: { percent: number; stage: string } | null;
  error?: string | null;
}

export const AudioSplitterUploader: React.FC<AudioSplitterUploaderProps> = ({
  onFileSelected,
  isLoading,
  decodingProgress,
  error,
}) => {
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
      const file = e.dataTransfer.files[0];
      if (
        file.type.startsWith('audio/') ||
        /\.(mp3|wav|m4a|ogg|flac|aac|webm)$/i.test(file.name)
      ) {
        onFileSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3 shadow-sm">
          <Split className="w-3.5 h-3.5" />
          <span>Audio Splitter Studio</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight">
          Upload Single Audio File
        </h2>
        <p className="text-sm sm:text-base text-neutral-400 mt-2 max-w-xl mx-auto">
          Split voice recordings and tracks into equal parts, duration intervals, or precise manual cut points.
        </p>
      </div>

      {/* Main Dropzone */}
      <div
        id="splitter-audio-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
            : 'border-neutral-800 bg-neutral-900/60 hover:border-emerald-500/50 hover:bg-neutral-900/90'
        } ${isLoading ? 'pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 transition-transform">
            {isLoading ? (
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-base sm:text-lg font-semibold text-neutral-200">
              {isLoading
                ? (decodingProgress?.stage || 'Decoding and preparing audio...')
                : 'Click to select an audio file'}
            </p>
            <p className="text-xs sm:text-sm text-neutral-400">
              {isLoading
                ? 'Processing in background thread without freezing the browser'
                : 'or drag & drop directly from your computer (MP3, WAV, M4A, OGG, WebM)'}
            </p>
          </div>

          {/* Decoding Progress Bar */}
          {isLoading && (
            <div className="w-full max-w-sm mx-auto mt-2 space-y-1.5 animate-in fade-in">
              <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, decodingProgress?.percent || 20)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>{decodingProgress?.stage || 'Reading bytes...'}</span>
                <span className="text-emerald-400 font-bold">{decodingProgress?.percent || 20}%</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="px-2.5 py-1 rounded-md bg-neutral-800 border border-neutral-700/80 text-[11px] font-mono text-neutral-300">
              Single File Mode
            </span>
            <span className="px-2.5 py-1 rounded-md bg-neutral-800 border border-neutral-700/80 text-[11px] font-mono text-emerald-400">
              100% Client-Side
            </span>
            <span className="px-2.5 py-1 rounded-md bg-neutral-800 border border-neutral-700/80 text-[11px] font-mono text-neutral-300">
              Zero Server Upload
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl text-xs sm:text-sm text-red-300 text-center animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {/* Feature Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Split className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-semibold text-neutral-200">Equal & Duration Split</h4>
            <p className="text-[11px] text-neutral-400">Divide into N parts or fixed lengths</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-semibold text-neutral-200">Manual Cut Points</h4>
            <p className="text-[11px] text-neutral-400">Click waveform to add split markers</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-semibold text-neutral-200">Private & Local</h4>
            <p className="text-[11px] text-neutral-400">Processes locally with Web Audio</p>
          </div>
        </div>
      </div>
    </div>
  );
};
