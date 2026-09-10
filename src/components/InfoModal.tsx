import React from 'react';
import { HelpCircle, X, Info } from 'lucide-react';
import { AppLanguage } from '../types';
import { translations } from '../utils/translations';

interface InfoButtonProps {
  settingKey: keyof typeof translations.en.settingInfo;
  lang?: AppLanguage;
  onOpenInfo: (key: keyof typeof translations.en.settingInfo) => void;
  className?: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({
  settingKey,
  lang,
  onOpenInfo,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenInfo(settingKey);
      }}
      className={`inline-flex items-center justify-center p-1 rounded-full text-neutral-400 hover:text-amber-400 hover:bg-neutral-800/80 transition-colors cursor-pointer ${className}`}
      title="View detailed information"
      aria-label="Help information"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
};

interface InfoModalProps {
  isOpen?: boolean;
  onClose: () => void;
  settingKey: keyof typeof translations.en.settingInfo | null;
  lang?: AppLanguage;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen = true,
  onClose,
  settingKey,
  lang = 'en',
}) => {
  if (!isOpen || !settingKey) return null;

  const t = translations[lang || 'en'] || translations.en;
  const info = t.settingInfo[settingKey];

  if (!info) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-neutral-100">{info.title}</h4>
              <span className="text-[11px] text-amber-400 font-mono">
                Settings Guide
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-sm text-neutral-300 leading-relaxed space-y-2">
          <p>{info.desc}</p>
        </div>

        <div className="mt-5 flex justify-end">
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
