import JSZip from 'jszip';
import { BatchAudioItem, NormalizationTarget, IntelligenceExportConfig } from '../../types';
import { audioBufferToWavBlobAsync, audioBufferToMp3BlobAsync } from '../audio';
import { yieldToMain } from '../asyncScheduler';

/**
 * Formats export filename based on original file name with selected format extension
 */
export function formatBatchExportFileName(
  item: BatchAudioItem,
  index?: number,
  config?: IntelligenceExportConfig
): string {
  const ext = config?.format === 'mp3' ? 'mp3' : 'wav';
  const baseOriginal = item.name.replace(/\.[^/.]+$/, '');
  return `${baseOriginal}.${ext}`;
}

/**
 * Creates a ZIP file containing all normalized audio items with background yielding and progress reporting
 */
export async function exportNormalizedBatchZip(
  items: BatchAudioItem[],
  target: NormalizationTarget,
  config?: IntelligenceExportConfig,
  onProgress?: (percent: number, currentName: string) => void,
  shouldCancel?: () => boolean
): Promise<Blob> {
  const exportCfg: IntelligenceExportConfig = config || {
    format: 'wav',
    mp3Bitrate: 256,
    namingPattern: 'prefix_number',
    prefix: 'voice',
    separator: '_',
    digits: 2,
    startNumber: 1,
    exportMode: 'zip',
    joinedPauseDuration: 0.4,
    includeReport: true,
  };

  const zip = new JSZip();
  const folder = zip.folder('normalized_voices') || zip;

  let report = `AUDIOMASTER PRO - LOUDNESS NORMALIZATION REPORT\n`;
  report += `Date: ${new Date().toISOString()}\n`;
  report += `Target Mode: ${target.mode.toUpperCase()}\n`;
  report += `Target LUFS: ${target.targetLufs} LUFS | Peak Ceiling: ${target.targetPeakDb} dBFS\n`;
  report += `Voice Compressor: ${target.enableCompressor ? 'Enabled' : 'Disabled'}\n`;
  report += `80Hz Rumble Filter: ${target.enableHighPass ? 'Enabled' : 'Disabled'}\n`;
  report += `Vocal Presence EQ: ${target.enableWarmthEQ ? 'Enabled' : 'Disabled'}\n`;
  report += `Format: ${exportCfg.format.toUpperCase()} (${exportCfg.format === 'mp3' ? `${exportCfg.mp3Bitrate} kbps` : '16-bit PCM'})\n`;
  report += `------------------------------------------------------------\n\n`;

  const total = items.length;

  for (let i = 0; i < total; i++) {
    if (shouldCancel?.()) {
      throw new Error('Export canceled by user');
    }

    const item = items[i];
    const outName = formatBatchExportFileName(item, i, exportCfg);
    const basePct = Math.round((i / total) * 85);
    onProgress?.(basePct, outName);
    await yieldToMain();

    const buf = item.normalizedBuffer || item.originalBuffer;
    const blob =
      exportCfg.format === 'mp3'
        ? await audioBufferToMp3BlobAsync(buf, exportCfg.mp3Bitrate)
        : await audioBufferToWavBlobAsync(buf);

    folder.file(outName, blob);
    await yieldToMain();

    const origLufs = item.analytics.integratedLufs;
    const newLufs = item.normalizedAnalytics?.integratedLufs ?? origLufs;
    const origPeak = item.analytics.peakDb;
    const newPeak = item.normalizedAnalytics?.peakDb ?? origPeak;

    report += `File #${i + 1}: ${item.name}\n`;
    report += `  - Exported As: ${outName}\n`;
    report += `  - Original Loudness: ${origLufs} LUFS (Peak: ${origPeak} dBFS)\n`;
    report += `  - Normalized Loudness: ${newLufs} LUFS (Peak: ${newPeak} dBFS)\n`;
    report += `  - Gain Applied: ${item.gainAppliedDb > 0 ? '+' : ''}${item.gainAppliedDb} dB\n`;
    report += `  - Custom Trim: ${item.customGainDb || 0} dB\n\n`;
  }

  if (exportCfg.includeReport) {
    folder.file('normalization_summary.txt', report);
  }

  if (onProgress) {
    onProgress(88, 'Packaging ZIP archive...');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      const p = 85 + Math.round(metadata.percent * 0.15);
      onProgress(Math.min(99, p), 'Packaging ZIP archive...');
    }
  });

  onProgress?.(100, 'Complete');
  return zipBlob;
}
