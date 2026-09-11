import React from 'react';
import { Scissors, Sliders, Send } from 'lucide-react';
import { AppActiveTab, AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface NavigationTabsProps {
  activeTab: AppActiveTab;
  onChangeTab: (tab: AppActiveTab) => void;
  lang?: AppLanguage;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onChangeTab,
  lang,
}) => {
  const t = translations[lang || 'en'] || translations.en;

  return (
    <nav
      id="app-navigation-tabs-layout"
      className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-[57px] z-30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5">
        <div className="w-full bg-neutral-950 p-1 sm:p-1.5 rounded-xl border border-neutral-800 shadow-inner grid grid-cols-3 gap-1 sm:gap-2">
          <button
            id="tab-slicer-btn"
            onClick={() => onChangeTab('slicer')}
            className={`w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer text-center ${
              activeTab === 'slicer'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t.tabSlicer || 'Silence Slicer'}</span>
          </button>

          <button
            id="tab-intelligence-btn"
            onClick={() => onChangeTab('intelligence')}
            className={`w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer text-center ${
              activeTab === 'intelligence'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold shadow-md shadow-violet-500/20 border border-violet-500/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t.tabIntelligence || 'Voice Leveler'}</span>
          </button>

          <button
            id="tab-tgvoice-btn"
            onClick={() => onChangeTab('tg-voice')}
            className={`w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer text-center ${
              activeTab === 'tg-voice'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-md shadow-sky-500/20 border border-sky-400/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t.tabTgVoice || 'TG Voice'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
