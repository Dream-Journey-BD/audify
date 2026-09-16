import React, { useState } from 'react';
import { Play, Pause, Download, Edit2, Check, Scissors } from 'lucide-react';
import { SplitPart } from '../../types/splitter';
import { formatTimeCode } from '../../utils/audio/context';

interface SplitPartCardProps {
  part: SplitPart;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: (part: SplitPart) => void;
  onDownloadSingle: (part: SplitPart) => void;
  onUpdateName: (id: string, newName: string) => void;
  isExporting: boolean;
}

export const SplitPartCard: React.FC<SplitPartCardProps> = ({
  part,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onDownloadSingle,
  onUpdateName,
  isExporting,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameVal, setNameVal] = useState(part.name);

  const handleSaveName = () => {
    setIsEditing(false);
    if (nameVal.trim() && nameVal.trim() !== part.name) {
      onUpdateName(part.id, nameVal.trim());
    } else {
      setNameVal(part.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setNameVal(part.name);
    }
  };

  const pct = totalDuration > 0 ? ((part.duration / totalDuration) * 100).toFixed(1) : '0';

  return (
    <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700/80 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      {/* Left: Index, Play button, Name & Range */}
      <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onTogglePlay(part)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
            isPlaying
              ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
              : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700'
          }`}
          title={isPlaying ? 'Pause' : 'Play this part'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full px-2 py-1 rounded bg-neutral-800 border border-emerald-500 text-neutral-100 text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="p-1 rounded bg-emerald-500 text-neutral-950 hover:bg-emerald-400 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <span className="font-semibold text-neutral-200 truncate">{part.name}</span>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-neutral-400 hover:text-emerald-400 cursor-pointer"
                title="Rename file"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-neutral-400">
            <span>
              {formatTimeCode(part.start)} - {formatTimeCode(part.end)}
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{part.duration.toFixed(2)}s</span>
            <span>•</span>
            <span>{pct}% of audio</span>
          </div>
        </div>
      </div>

      {/* Right: Download Single */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={() => onDownloadSingle(part)}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white border border-neutral-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download this single sliced clip"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};
