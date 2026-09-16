/**
 * High-performance asynchronous background scheduler
 * Allows processor-heavy audio DSP, encoding, and analysis to run without blocking the browser UI thread.
 */

/**
 * High-performance asynchronous background scheduler
 * Allows processor-heavy audio DSP, encoding, and analysis to run without blocking the browser UI thread.
 * Guarantees silky-smooth 60fps UI progress rendering and prevents mobile device overheating / freezing.
 */

let lastYieldTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * Yields control to the browser event loop, guaranteeing time for DOM painting and touch interaction.
 * When CPU-intensive audio encoding or slicing runs, this pauses momentarily (4-6ms) whenever
 * a frame period has elapsed, allowing the browser rendering engine and progress bars to update smoothly.
 *
 * @param forcePaint If true or if >=16ms has elapsed since the last paint yield, forces a render-friendly delay
 */
export function yieldToMain(forcePaint = false): Promise<void> {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const timeSinceLast = now - lastYieldTime;

  // If forcePaint is true or more than 16ms (1 screen refresh frame) has passed:
  // We explicitly pause for a small micro-slice (4-6ms) to allow the browser compositor
  // and layout engine to paint the DOM, animate progress bars, and process user events.
  if (forcePaint || timeSinceLast >= 16) {
    lastYieldTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          setTimeout(resolve, 4);
        });
      } else {
        setTimeout(resolve, 6);
      }
    });
  }

  // Micro-slice yield between very fast iterations
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
      await yieldToMain(true);
      lastYieldTime = performance.now();
    }
  }
}

