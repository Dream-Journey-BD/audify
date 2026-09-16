import React from 'react';
import { RotateCcw, FileAudio, Keyboard } from 'lucide-react';
import { AppActiveTab, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface HeaderProps {
  lang?: AppLanguage;
  activeTab: AppActiveTab;
  onChangeTab?: (tab: AppActiveTab) => void;
  onToggleLang?: () => void;
  onReset: () => void;
  onOpenShortcuts?: () => void;
  hasAudio: boolean;
  fileName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  activeTab,
  onReset,
  onOpenShortcuts,
  fileName,
}) => {
  const t = translations[lang || 'en'] || translations.en;

  const themeColors = {
    slicer: {
      shadow: 'shadow-amber-500/10',
      proBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      iconText: 'text-amber-400',
    },
    intelligence: {
      shadow: 'shadow-violet-500/15',
      proBadge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
      iconText: 'text-violet-400',
    },
    splitter: {
      shadow: 'shadow-emerald-500/15',
      proBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      iconText: 'text-emerald-400',
    },
    'tg-voice': {
      shadow: 'shadow-sky-500/15',
      proBadge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      iconText: 'text-sky-400',
    },
  }[activeTab];

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-lg ${themeColors.shadow} shrink-0 relative overflow-hidden transition-shadow`}>
              <img src="./favicon.svg" alt="Audify" className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-100 truncate tracking-tight flex items-center gap-2">
                Audify
                <span className={`hidden lg:inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors ${themeColors.proBadge}`}>
                  PRO
                </span>
              </h1>
              <p className="text-xs text-neutral-400 truncate hidden sm:block">
                {fileName && activeTab === 'slicer' ? (
                  <span className="flex items-center gap-1.5 text-neutral-300 font-mono">
                    <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                    {fileName}
                  </span>
                ) : activeTab === 'tg-voice' ? (
                  'Telegram Voice Converter'
                ) : activeTab === 'intelligence' ? (
                  'Voice Leveler & Loudness Mastering'
                ) : (
                  'Web Audio Silence Slicer & LUFS Normalizer'
                )}
              </p>
            </div>
          </div>

          {/* Right: Controls (Reset & Shortcuts) with Dynamic Tab Color */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Reset Button: shown for Silence Slicer, Voice Leveler, and TG Voice */}
            <button
              id="reset-audio-btn"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer border border-neutral-700 shadow-sm"
              title={
                activeTab === 'slicer'
                  ? (t.newFile || 'Reset Audio')
                  : activeTab === 'intelligence'
                  ? 'Reset Voice Leveler'
                  : 'Reset TG Voice'
              }
            >
              <RotateCcw className={`w-3.5 h-3.5 ${themeColors.iconText}`} />
              <span className="hidden sm:inline">
                {activeTab === 'slicer' ? (t.newFile || 'Reset') : 'Reset'}
              </span>
            </button>

            {/* Keyboard Shortcuts Button - Beside Reset with Dynamic Accent Icon */}
            {onOpenShortcuts && (
              <button
                id="open-shortcuts-btn"
                onClick={onOpenShortcuts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 text-xs sm:text-sm font-medium transition-colors border border-neutral-700 cursor-pointer shadow-sm"
                title={t.shortcutsModalTitle}
              >
                <Keyboard className={`w-4 h-4 ${themeColors.iconText}`} />
                <span className="font-semibold hidden sm:inline">{t.shortcutsBtn}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

