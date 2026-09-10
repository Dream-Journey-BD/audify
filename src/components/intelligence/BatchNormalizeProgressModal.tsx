import React from 'react';
import { Volume2, X, Loader2 } from 'lucide-react';
import { AppLanguage } from '../../types';
import { translations } from '../../utils/translations';

interface BatchNormalizeProgressModalProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentFileName: string;
  percent: number;
  lang?: AppLanguage;
  onCancel: () => void;
}

export const BatchNormalizeProgressModal: React.FC<BatchNormalizeProgressModalProps> = ({
  isOpen,
  current,
  total,
  currentFileName,
  percent,
  lang = 'bn',
  onCancel,
}) => {
  if (!isOpen) return null;

  const isBn = lang === 'bn';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-100">
                Normalizing & Leveling Audio...
              </h3>
              <p className="text-xs text-neutral-400">
                {`Processing ${current} of ${total} files (${percent}%)`}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-150 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs font-mono text-neutral-400 truncate text-left">
            Current:{' '}
            <span className="text-amber-300">{currentFileName || 'Processing...'}</span>
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-neutral-800/80">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
