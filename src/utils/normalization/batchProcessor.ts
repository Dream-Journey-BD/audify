import { BatchAudioItem, NormalizationTarget } from '../../types';
import { normalizeAudioBuffer } from './bufferNormalizer';
import { yieldToMain } from '../asyncScheduler';

/**
 * Normalizes all batch audio items to the identical target with background yielding and cancellation support
 */
export async function processBatchNormalization(
  items: BatchAudioItem[],
  target: NormalizationTarget,
  onProgress?: (index: number, total: number, currentName: string, percent: number) => void,
  shouldCancel?: () => boolean
): Promise<BatchAudioItem[]> {
  const updated: BatchAudioItem[] = [];

  for (let i = 0; i < items.length; i++) {
    if (shouldCancel?.()) {
      for (let rest = i; rest < items.length; rest++) {
        updated.push(items[rest]);
      }
      break;
    }

    const item = items[i];
    const pct = Math.round((i / items.length) * 100);
    onProgress?.(i, items.length, item.name, pct);
    await yieldToMain();

    try {
      const res = await normalizeAudioBuffer(
        item.originalBuffer,
        target,
        item.analytics,
        item.customGainDb || 0
      );
      updated.push({
        ...item,
        normalizedBuffer: res.buffer,
        normalizedAnalytics: res.newAnalytics,
        gainAppliedDb: res.gainAppliedDb,
        status: 'normalized',
        isProcessing: false,
      });
    } catch (err: unknown) {
      updated.push({
        ...item,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Normalization failed',
        isProcessing: false,
      });
    }
    await yieldToMain();
  }

  onProgress?.(items.length, items.length, 'Completed', 100);
  return updated;
}
