import React from 'react';
import { RotateCcw, FileAudio, Scissors, Keyboard, Sliders } from 'lucide-react';
import { AppActiveTab, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface HeaderProps {
  lang?: AppLanguage;
  activeTab: AppActiveTab;
  onChangeTab: (tab: AppActiveTab) => void;
  onToggleLang?: () => void;
  onReset: () => void;
  onOpenShortcuts?: () => void;
  hasAudio: boolean;
  fileName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  activeTab,
  onChangeTab,
  onReset,
  onOpenShortcuts,
  hasAudio,
  fileName,
}) => {
  const t = translations[lang || 'en'] || translations.en;

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0 relative overflow-hidden">
              <img src="./favicon.svg" alt="Audify" className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-100 truncate tracking-tight flex items-center gap-2">
                Audify
                <span className="hidden lg:inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-neutral-400 truncate hidden sm:block">
                {fileName && activeTab === 'slicer' ? (
                  <span className="flex items-center gap-1.5 text-neutral-300 font-mono">
                    <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                    {fileName}
                  </span>
                ) : (
                  'Web Audio Silence Slicer & LUFS Normalizer'
                )}
              </p>
            </div>
          </div>

          {/* Center: Main App Tabs Switcher (Visible on desktop/tablet) */}
          <div className="hidden md:flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0 shadow-inner">
            <button
              id="tab-slicer-btn"
              onClick={() => onChangeTab('slicer')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'slicer'
                  ? 'bg-neutral-800 text-amber-300 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{t.tabSlicer || 'Silence Slicer'}</span>
            </button>

            <button
              id="tab-intelligence-btn"
              onClick={() => onChangeTab('intelligence')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'intelligence'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold shadow-md shadow-amber-500/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.tabIntelligence || 'Voice Leveler'}</span>
            </button>
          </div>

          {/* Right: Inline at the end of the title row (Keyboard Shortcuts & Reset) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {hasAudio && activeTab === 'slicer' && (
              <button
                id="reset-audio-btn"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer border border-neutral-700 shadow-sm"
                title={t.newFile}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t.newFile}</span>
              </button>
            )}

            {/* Keyboard Shortcuts Button - Always available in both tabs */}
            {onOpenShortcuts && (
              <button
                id="open-shortcuts-btn"
                onClick={onOpenShortcuts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-neutral-100 text-xs sm:text-sm font-medium transition-colors border border-neutral-700 cursor-pointer shadow-sm"
                title={t.shortcutsModalTitle}
              >
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span className="font-semibold hidden sm:inline">{t.shortcutsBtn}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile App Tabs Switcher Row (Under title row on small screens) */}
        <div className="flex md:hidden items-center justify-center mt-2 pt-2 border-t border-neutral-800/70">
          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 shadow-inner w-full">
            <button
              id="tab-slicer-btn-mobile"
              onClick={() => onChangeTab('slicer')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'slicer'
                  ? 'bg-neutral-800 text-amber-300 shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{t.tabSlicer || 'Silence Slicer'}</span>
            </button>

            <button
              id="tab-intelligence-btn-mobile"
              onClick={() => onChangeTab('intelligence')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'intelligence'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-bold shadow-md shadow-amber-500/10'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.tabIntelligence || 'Voice Leveler'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

