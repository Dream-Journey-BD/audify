import JSZip from 'jszip';
import { AudioSegment, ExportSettings, GlobalEffects } from '../../types';
import { renderSegmentToAudioBuffer, renderJoinedAudioBuffer } from './renderBuffer';
import { audioBufferToWavBlob, audioBufferToWavBlobAsync } from './wavEncoder';
import { audioBufferToMp3Blob, audioBufferToMp3BlobAsync } from './mp3Encoder';
import { yieldToMain } from '../asyncScheduler';

/**
 * Generates formatted file name according to user configuration
 */
export function formatSegmentFileName(
  segment: AudioSegment,
  settings: ExportSettings
): string {
  if (segment.customName && segment.customName.trim().length > 0) {
    const ext = settings.exportAudioFormat || 'wav';
    return `${segment.customName.trim()}.${ext}`;
  }

  const prefix = settings.prefix || 'clip';
  const sep = settings.separator || '_';
  const num = String(segment.index).padStart(settings.digits || 2, '0');
  const ext = settings.exportAudioFormat || 'wav';

  return `${prefix}${sep}${num}.${ext}`;
}

/**
 * Exports single segment as Blob with associated formatted filename
 */
export async function exportSegmentSingle(
  sourceBuffer: AudioBuffer,
  segment: AudioSegment,
  settings: ExportSettings,
  globalEffects?: GlobalEffects,
  defaultMaxGapMs: number = 300
): Promise<{ blob: Blob; fileName: string }> {
  const renderedBuffer = await renderSegmentToAudioBuffer(
    sourceBuffer,
    segment,
    globalEffects,
    defaultMaxGapMs
  );
  const fileName = formatSegmentFileName(segment, settings);

  let blob: Blob;
  if (settings.exportAudioFormat === 'mp3') {
    blob = await audioBufferToMp3BlobAsync(renderedBuffer, settings.mp3Bitrate || 192);
  } else {
    blob = await audioBufferToWavBlobAsync(renderedBuffer);
  }

  return { blob, fileName };
}

/**
 * Asynchronously generates a ZIP archive containing all enabled audio segments
 */
export async function exportSegmentsZip(
  sourceBuffer: AudioBuffer,
  segments: AudioSegment[],
  settings: ExportSettings,
  globalEffects?: GlobalEffects,
  onProgress?: (percent: number, currentFile: string) => void,
  shouldCancel?: () => boolean,
  defaultMaxGapMs: number = 300
): Promise<Blob> {
  const zip = new JSZip();
  const folderName = `${settings.prefix || 'audio'}_clips`;
  const folder = zip.folder(folderName) || zip;

  const activeSegments = segments.filter((s) => s.enabled);
  const total = activeSegments.length;

  for (let i = 0; i < total; i++) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('Export canceled by user');
    }
    const seg = activeSegments[i];
    const fileName = formatSegmentFileName(seg, settings);

    const renderBasePct = Math.round((i / total) * 80);
    const itemRange = (1 / total) * 80;

    if (onProgress) {
      onProgress(renderBasePct, `Rendering ${i + 1}/${total}: ${fileName}`);
    }

    const renderedBuffer = await renderSegmentToAudioBuffer(
      sourceBuffer,
      seg,
      globalEffects,
      defaultMaxGapMs
    );

    const blob =
      settings.exportAudioFormat === 'mp3'
        ? await audioBufferToMp3BlobAsync(
            renderedBuffer,
            settings.mp3Bitrate || 192,
            (subPct) => {
              if (onProgress) {
                const currentPct = Math.min(84, Math.round(renderBasePct + (subPct / 100) * itemRange));
                onProgress(currentPct, `Encoding ${i + 1}/${total}: ${fileName} (${subPct}%)`);
              }
            },
            shouldCancel
          )
        : await audioBufferToWavBlobAsync(
            renderedBuffer,
            (subPct) => {
              if (onProgress) {
                const currentPct = Math.min(84, Math.round(renderBasePct + (subPct / 100) * itemRange));
                onProgress(currentPct, `Encoding ${i + 1}/${total}: ${fileName} (${subPct}%)`);
              }
            },
            shouldCancel
          );

    folder.file(fileName, blob);
    await yieldToMain(true);
  }

  if (onProgress) {
    onProgress(85, 'Creating ZIP archive...');
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: settings.exportAudioFormat === 'mp3' ? 'STORE' : 'DEFLATE',
      compressionOptions: { level: 1 },
    },
    (metadata) => {
      if (onProgress) {
        const currentPct = 85 + Math.round(metadata.percent * 0.15);
        onProgress(Math.min(99, currentPct), 'Compressing ZIP archive...');
      }
    }
  );

  if (onProgress) {
    onProgress(100, 'Done');
  }

  return zipBlob;
}

/**
 * Asynchronously renders and exports all enabled audio segments stitched into a single joined audio file
 */
export async function exportJoinedAudioBlob(
  sourceBuffer: AudioBuffer,
  segments: AudioSegment[],
  settings: ExportSettings,
  globalEffects?: GlobalEffects,
  onProgress?: (percent: number, currentFile: string) => void,
  shouldCancel?: () => boolean,
  defaultMaxGapMs: number = 300
): Promise<Blob> {
  const joinedBuffer = await renderJoinedAudioBuffer(
    sourceBuffer,
    segments,
    globalEffects,
    defaultMaxGapMs,
    (percent, status) => {
      if (onProgress) onProgress(Math.round(percent * 0.7), status);
    }
  );

  if (shouldCancel && shouldCancel()) {
    throw new Error('Export canceled by user');
  }

  if (settings.exportAudioFormat === 'mp3') {
    if (onProgress) onProgress(70, 'Encoding continuous MP3 file...');
    return audioBufferToMp3BlobAsync(
      joinedBuffer,
      settings.mp3Bitrate || 192,
      (p) => {
        if (onProgress) onProgress(70 + Math.round(p * 0.3), `Encoding MP3: ${p}%`);
      },
      shouldCancel
    );
  }

  if (onProgress) onProgress(70, 'Encoding continuous WAV file...');
  return audioBufferToWavBlobAsync(
    joinedBuffer,
    (p) => {
      if (onProgress) onProgress(70 + Math.round(p * 0.3), `Encoding WAV: ${p}%`);
    },
    shouldCancel
  );
}
