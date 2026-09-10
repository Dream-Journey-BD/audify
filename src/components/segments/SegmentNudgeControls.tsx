import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatTimeCode } from '../../utils/audio';

interface SegmentNudgeControlsProps {
  start: number;
  end: number;
  onNudgeStart: (delta: number) => void;
  onNudgeEnd: (delta: number) => void;
}

export const SegmentNudgeControls: React.FC<SegmentNudgeControlsProps> = ({
  start,
  end,
  onNudgeStart,
  onNudgeEnd,
}) => {
  return (
    <div
      className="pt-2 border-t border-neutral-800/80 grid grid-cols-2 gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-neutral-800">
        <div className="text-[10px] text-neutral-400">
          <span className="font-mono text-amber-400 font-bold">
            {formatTimeCode(start)}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onNudgeStart(-0.05)}
            className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-[10px] font-bold cursor-pointer"
            title="-0.05s"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onNudgeStart(0.05)}
            className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-[10px] font-bold cursor-pointer"
            title="+0.05s"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-neutral-800">
        <div className="text-[10px] text-neutral-400">
          <span className="font-mono text-amber-400 font-bold">
            {formatTimeCode(end)}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onNudgeEnd(-0.05)}
            className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-[10px] font-bold cursor-pointer"
            title="-0.05s"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onNudgeEnd(0.05)}
            className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-[10px] font-bold cursor-pointer"
            title="+0.05s"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
