import React from 'react';
import { X, Layers, Download, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { BatchAudioItem, NormalizationTarget } from '../../types';

interface BatchComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchAudioItem[];
  target: NormalizationTarget;
  onExportZip: () => void;
}

export const BatchComparisonModal: React.FC<BatchComparisonModalProps> = ({
  isOpen,
  onClose,
  items,
  target,
  onExportZip,
}) => {
  if (!isOpen) return null;

  const normalizedCount = items.filter((i) => !!i.normalizedBuffer).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100">
                Multi-Voice Loudness Matrix
              </h2>
              <p className="text-xs text-neutral-400">
                Target: <span className="font-mono text-violet-400 font-bold">{target.targetLufs} LUFS</span> • Ceiling: <span className="font-mono text-neutral-200">{target.targetPeakDb} dBFS</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matrix Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/70">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4"># Clip / Name</th>
                  <th className="py-3 px-3">Orig LUFS</th>
                  <th className="py-3 px-3">Normalized</th>
                  <th className="py-3 px-3">Gain Shift</th>
                  <th className="py-3 px-3">Orig Peak</th>
                  <th className="py-3 px-3">Final Peak</th>
                  <th className="py-3 px-3">Speech %</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
                {items.map((item, idx) => {
                  const hasNorm = !!item.normalizedBuffer && item.normalizedAnalytics;
                  const newLufs = hasNorm ? item.normalizedAnalytics?.integratedLufs : 'Pending';
                  const newPeak = hasNorm ? item.normalizedAnalytics?.truePeakDb : 'Pending';

                  return (
                    <tr key={item.id} className="hover:bg-neutral-900/50 transition">
                      <td className="py-3 px-4 font-sans font-medium text-neutral-100 max-w-[200px] truncate">
                        <span className="text-violet-400 font-mono mr-1.5">#{idx + 1}</span>
                        {item.name}
                      </td>
                      <td className="py-3 px-3 text-neutral-400 font-bold">
                        {item.analytics.integratedLufs} LUFS
                      </td>
                      <td className="py-3 px-3 text-violet-400 font-bold">
                        {newLufs !== 'Pending' ? `${newLufs} LUFS` : <span className="text-neutral-500 font-normal">Pending</span>}
                      </td>
                      <td className="py-3 px-3">
                        {hasNorm ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              item.gainAppliedDb >= 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {item.gainAppliedDb > 0 ? `+${item.gainAppliedDb}` : item.gainAppliedDb} dB
                          </span>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-neutral-400">{item.analytics.peakDb} dB</td>
                      <td className="py-3 px-3 text-neutral-200">{newPeak !== 'Pending' ? `${newPeak} dB` : '-'}</td>
                      <td className="py-3 px-3 text-neutral-400">{item.analytics.speechRatio}%</td>
                      <td className="py-3 px-3 text-right">
                        {hasNorm ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-sans text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Matched</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-neutral-400 font-sans text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Ready</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            {normalizedCount} of {items.length} voices normalized to identical level
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition cursor-pointer"
            >
              Close
            </button>
            {normalizedCount > 0 && (
              <button
                onClick={() => {
                  onExportZip();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download All Normalized (ZIP)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
