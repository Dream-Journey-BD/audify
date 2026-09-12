import React from 'react';
import {
  Keyboard,
  X,
  Play,
  RotateCcw,
  RotateCw,
  CheckSquare,
  CornerDownLeft,
  MousePointer,
  Sliders,
  Trash2,
  ArrowLeftRight,
  Layers,
  ClipboardList,
} from 'lucide-react';
import { AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: AppLanguage;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  const t = translations[lang || 'en'] || translations.en;

  const shortcutsList = [
    {
      icon: Play,
      keys: ['Space'],
      desc: t.shortcutsSpace,
      tag: 'Playback',
    },
    {
      icon: RotateCcw,
      keys: ['Ctrl / ⌘', 'Z'],
      desc: t.shortcutsUndo,
      tag: 'History',
    },
    {
      icon: RotateCw,
      keys: ['Ctrl / ⌘', 'Y'],
      desc: t.shortcutsRedo,
      tag: 'History',
    },
    {
      icon: Trash2,
      keys: ['Delete'],
      desc: t.shortcutsDelete,
      tag: 'Editing',
    },
    {
      icon: Layers,
      keys: ['Ctrl / ⌘', 'M'],
      desc: t.shortcutsMergeSelected,
      tag: 'Editing',
    },
    {
      icon: ArrowLeftRight,
      keys: ['←', '→', '↑', '↓'],
      desc: t.shortcutsArrows,
      tag: 'Navigation',
    },
    {
      icon: CheckSquare,
      keys: ['Ctrl / ⌘', 'Click'],
      desc: t.shortcutsMultiSelect,
      tag: 'Selection',
    },
    {
      icon: CheckSquare,
      keys: ['Shift', 'Click'],
      desc: t.shortcutsRangeSelect,
      tag: 'Selection',
    },
    {
      icon: CornerDownLeft,
      keys: ['Enter ↵'],
      desc: t.shortcutsEnterNext,
      tag: 'Naming',
    },
    {
      icon: ClipboardList,
      keys: ['Ctrl / ⌘', 'V'],
      desc: t.shortcutsPasteMultiLine || 'Paste multi-line list to auto-assign clip names across all slots',
      tag: 'Naming',
    },
    {
      icon: Sliders,
      keys: ['Drag Handles'],
      desc: t.shortcutsWaveformDrag,
      tag: 'Waveform',
    },
    {
      icon: MousePointer,
      keys: ['Click Waveform'],
      desc: t.shortcutsWaveformClick,
      tag: 'Waveform',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-100">
                {t.shortcutsModalTitle}
              </h3>
              <p className="text-xs text-neutral-400">{t.shortcutsModalSub}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {shortcutsList.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center text-amber-400 shrink-0 border border-neutral-800">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-neutral-300 font-medium leading-tight truncate">
                    {item.desc}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-amber-300 text-[11px] font-mono font-semibold shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
