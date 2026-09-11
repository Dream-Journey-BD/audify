import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Download,
  FileArchive,
  CheckSquare,
  Square as SquareIcon,
  FileAudio,
  FileVideo,
} from 'lucide-react';
import { TgVoiceItem } from '../../types';

interface TgVoiceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: (settings: {
    bitrate: number | 'original';
    compression: boolean;
    selectedIds: string[];
  }) => void;
  isExporting: boolean;
  exportProgress: number;
  exportStatusText?: string;
  onCancelExport?: () => void;
  items: TgVoiceItem[];
}

export const TgVoiceExportModal: React.FC<TgVoiceExportModalProps> = ({
  isOpen,
  onClose,
  onConfirmExport,
  isExporting,
  exportProgress,
  exportStatusText,
  onCancelExport,
  items,
}) => {
  const [bitrate, setBitrate] = useState<number | 'original'>('original');
  const [compression, setCompression] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Ready items that can be exported
  const readyItems = items.filter((it) => it.status === 'ready');

  // Select all ready items by default when modal opens or items change
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(readyItems.map((it) => it.id)));
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    if (isExporting) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (isExporting) return;
    setSelectedIds(new Set(readyItems.map((it) => it.id)));
  };

  const deselectAll = () => {
    if (isExporting) return;
    setSelectedIds(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExporting || selectedIds.size === 0) return;
    onConfirmExport({
      bitrate,
      compression,
      selectedIds: Array.from(selectedIds),
    });
  };

  const selectedCount = selectedIds.size;
  const isAllSelected = readyItems.length > 0 && selectedCount === readyItems.length;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      id="tg-voice-export-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl relative text-neutral-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/60 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-neutral-100 flex items-center gap-2">
              {readyItems.length <= 1 ? 'Export Voice Message' : 'Export Voice Messages'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {selectedCount === 1
                ? 'Export 1 selected file as Telegram Opus OGG'
                : `Export ${selectedCount} selected files as Telegram Opus OGG (.zip)`}
            </p>
          </div>
          <button
            id="close-tg-export-modal-btn"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* File Selection Section */}
          <div className="space-y-2">
            {/* Header: Title on Left, Select All & Deselect All on Right */}
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <span>Select Files to Export</span>
                <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-[11px] font-bold">
                  {selectedCount}/{readyItems.length}
                </span>
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={isExporting || isAllSelected}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-neutral-100 text-[11px] font-medium border border-neutral-700 transition cursor-pointer disabled:opacity-40"
                  title="Select all files"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={isExporting || selectedCount === 0}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-neutral-100 text-[11px] font-medium border border-neutral-700 transition cursor-pointer disabled:opacity-40"
                  title="Deselect all files"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Scrollable File List */}
            <div className="border border-neutral-800 rounded-xl bg-neutral-950/60 divide-y divide-neutral-850 max-h-48 sm:max-h-56 overflow-y-auto">
              {readyItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">
                  No ready files available to export.
                </div>
              ) : (
                readyItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isVideo =
                    item.file.type.startsWith('video/') ||
                    /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(item.originalName);

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-500/10 hover:bg-sky-500/15'
                          : 'hover:bg-neutral-800/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(item.id);
                          }}
                          className="shrink-0 text-sky-400 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-400" />
                          ) : (
                            <SquareIcon className="w-4 h-4 text-neutral-500" />
                          )}
                        </button>

                        <div className="shrink-0 text-neutral-400">
                          {isVideo ? (
                            <FileVideo className="w-4 h-4 text-purple-400" />
                          ) : (
                            <FileAudio className="w-4 h-4 text-sky-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono font-medium text-neutral-200 truncate" title={item.originalName}>
                            {item.originalName}
                          </p>
                          <p className="text-[10px] font-mono text-neutral-400 truncate">
                            {item.outputName} • {formatFileSize(item.size)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                          {item.selectedBitrate === 'original' || !item.selectedBitrate
                            ? `${item.originalBitrate || 64}k`
                            : `${item.selectedBitrate}k`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 1. Bitrate Selection */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-neutral-800/80">
            <div>
              <label
                htmlFor="tg-export-bitrate-spinner"
                className="text-xs sm:text-sm font-semibold text-neutral-200 block"
              >
                Bitrate
              </label>
              <span className="text-[11px] text-neutral-400 block">
                {bitrate === 'original'
                  ? 'Keep individual / original file bitrates'
                  : `Override selected files to ${bitrate} kbps`}
              </span>
            </div>
            <select
              id="tg-export-bitrate-spinner"
              value={bitrate}
              disabled={isExporting}
              onChange={(e) =>
                setBitrate(
                  e.target.value === 'original' ? 'original' : Number(e.target.value)
                )
              }
              className="bg-neutral-800 hover:bg-neutral-750 text-neutral-100 text-xs sm:text-sm rounded-xl px-3 py-2 border border-neutral-700 focus:outline-none focus:border-sky-500 cursor-pointer min-w-[150px] disabled:opacity-50 font-mono"
            >
              <option value="original">Original</option>
              <option value={16}>16 kbps</option>
              <option value={24}>24 kbps</option>
              <option value={32}>32 kbps</option>
              <option value={48}>48 kbps</option>
              <option value={64}>64 kbps (Standard)</option>
              <option value={96}>96 kbps</option>
              <option value={128}>128 kbps</option>
              <option value={160}>160 kbps</option>
              <option value={192}>192 kbps</option>
              <option value={256}>256 kbps</option>
              <option value={320}>320 kbps</option>
            </select>
          </div>

          {/* 2. Compression Switch */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-neutral-800/80">
            <div>
              <span className="text-xs sm:text-sm font-semibold text-neutral-200 block">
                Compression
              </span>
              <span className="text-[11px] text-neutral-400 block">
                Smooth speech dynamic range and prevent distortion
              </span>
            </div>
            <button
              id="tg-export-compression-switch"
              type="button"
              role="switch"
              aria-checked={compression}
              disabled={isExporting}
              onClick={() => setCompression((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                compression ? 'bg-sky-500' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  compression ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Progress Bar when Exporting */}
          {isExporting && (
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between text-xs text-sky-400 font-medium">
                <span className="flex items-center gap-2 truncate max-w-[80%]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">{exportStatusText || 'Processing & Encoding...'}</span>
                </span>
                <span className="font-mono">{exportProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-200 rounded-full"
                  style={{ width: `${Math.max(5, exportProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            {isExporting ? (
              <button
                type="button"
                onClick={onCancelExport}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-red-400 text-xs sm:text-sm font-medium transition-colors cursor-pointer border border-red-500/30"
              >
                Cancel Export
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              id="confirm-tg-export-btn"
              type="submit"
              disabled={isExporting || selectedCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-sky-500/20 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : selectedCount === 0 ? (
                <span>Select Files to Export</span>
              ) : selectedCount === 1 ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export .ogg</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  <span>Export ZIP ({selectedCount})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
