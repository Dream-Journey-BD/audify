/**
 * High-performance asynchronous background scheduler
 * Allows processor-heavy audio DSP, encoding, and analysis to run without blocking the browser UI thread.
 */

/**
 * Yields control to the browser event loop using the fastest available micro/macro task scheduling.
 * Prioritizes window.scheduler.yield() -> MessageChannel (0ms) -> setTimeout(0).
 */
export function yieldToMain(): Promise<void> {
  if (typeof window !== 'undefined' && 'scheduler' in window) {
    const scheduler = (window as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (typeof scheduler?.yield === 'function') {
      return scheduler.yield();
    }
  }

  if (typeof MessageChannel !== 'undefined') {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }

  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Executes an intensive loop in time-slices.
 * Yields to the main thread whenever the current slice exceeds budgetMs (default: 12ms to guarantee 60fps).
 */
export async function runTimeSliced<T>(
  items: T[],
  processItem: (item: T, index: number) => Promise<void> | void,
  onProgress?: (processed: number, total: number, percent: number) => void,
  budgetMs: number = 12
): Promise<void> {
  const total = items.length;
  if (total === 0) return;

  let lastYieldTime = performance.now();

  for (let i = 0; i < total; i++) {
    await processItem(items[i], i);

    if (onProgress) {
      const pct = Math.round(((i + 1) / total) * 100);
      onProgress(i + 1, total, pct);
    }

    const now = performance.now();
    if (now - lastYieldTime > budgetMs) {
      await yieldToMain();
      lastYieldTime = performance.now();
    }
  }
}
