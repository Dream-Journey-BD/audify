import { getAudioContext } from './audio/context';

export interface DemuxMp4Result {
  isMp4: boolean;
  hasAudio: boolean;
  buffer: ArrayBuffer | null;
}

interface IsoBox {
  type: string;
  offset: number;
  size: number;
  headerSize: number;
}

/**
 * Parses top-level or child boxes of an ISO BMFF (MP4 / MOV) container.
 */
function findIsoBoxes(view: DataView, bytes: Uint8Array, start: number, end: number): IsoBox[] {
  const boxes: IsoBox[] = [];
  let p = start;
  while (p + 8 <= end) {
    const size32 = view.getUint32(p);
    const type = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    let boxSize = size32;
    let headerSize = 8;
    if (size32 === 1) {
      if (p + 16 > end) break;
      boxSize = Number(view.getBigUint64(p + 8));
      headerSize = 16;
    } else if (size32 === 0) {
      boxSize = end - p;
    }
    if (boxSize < headerSize || p + boxSize > end) break;
    boxes.push({ type, offset: p, size: boxSize, headerSize });
    p += boxSize;
  }
  return boxes;
}

/**
 * Inspects an MP4 / MOV container, checks for audio tracks ('soun'),
 * and masks out any video tracks ('vide') by replacing their box type with 'free'.
 * This leaves chunk offsets and sample tables intact while presenting an audio-only stream.
 */
export function demuxMp4Audio(buffer: ArrayBuffer): DemuxMp4Result {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const len = buffer.byteLength;

  if (len < 16) {
    return { isMp4: false, hasAudio: false, buffer: null };
  }

  const rootBoxes = findIsoBoxes(view, bytes, 0, len);
  const moov = rootBoxes.find((b) => b.type === 'moov');
  if (!moov) {
    return { isMp4: false, hasAudio: false, buffer: null };
  }

  const moovBoxes = findIsoBoxes(view, bytes, moov.offset + moov.headerSize, moov.offset + moov.size);
  const traks = moovBoxes.filter((b) => b.type === 'trak');

  let hasAudio = false;
  const nonAudioTraks: IsoBox[] = [];

  for (const trak of traks) {
    const trakBoxes = findIsoBoxes(view, bytes, trak.offset + trak.headerSize, trak.offset + trak.size);
    const mdia = trakBoxes.find((b) => b.type === 'mdia');
    if (!mdia) continue;

    const mdiaBoxes = findIsoBoxes(view, bytes, mdia.offset + mdia.headerSize, mdia.offset + mdia.size);
    const hdlr = mdiaBoxes.find((b) => b.type === 'hdlr');
    if (!hdlr || hdlr.offset + 20 > len) continue;

    const handler = String.fromCharCode(
      bytes[hdlr.offset + 16],
      bytes[hdlr.offset + 17],
      bytes[hdlr.offset + 18],
      bytes[hdlr.offset + 19]
    );

    if (handler === 'soun') {
      hasAudio = true;
    } else if (handler === 'vide') {
      nonAudioTraks.push(trak);
    }
  }

  if (!hasAudio) {
    return { isMp4: true, hasAudio: false, buffer: null };
  }

  if (nonAudioTraks.length === 0) {
    return { isMp4: true, hasAudio: true, buffer };
  }

  // Create a copy and mask non-audio tracks as 'free' padding boxes
  const copy = new Uint8Array(buffer).slice();
  for (const vt of nonAudioTraks) {
    copy[vt.offset + 4] = 102; // 'f'
    copy[vt.offset + 5] = 114; // 'r'
    copy[vt.offset + 6] = 101; // 'e'
    copy[vt.offset + 7] = 101; // 'e'
  }

  return { isMp4: true, hasAudio: true, buffer: copy.buffer };
}

/**
 * Fallback media decoder using HTMLVideoElement / HTMLAudioElement for video/audio containers.
 */
export function decodeViaMediaElement(file: File): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const isVideo =
      file.type.startsWith('video/') ||
      /\.(mp4|mov|mkv|webm|avi|m4v|3gp)$/i.test(file.name);
    const element = document.createElement(isVideo ? 'video' : 'audio');
    const objectUrl = URL.createObjectURL(file);

    element.src = objectUrl;
    element.preload = 'auto';
    element.muted = false;
    element.volume = 1.0;
    if (isVideo && 'playsInline' in element) {
      (element as HTMLVideoElement).playsInline = true;
    }

    const cleanup = () => {
      try {
        element.pause();
        element.src = '';
        element.load();
      } catch {
        // ignore
      }
      URL.revokeObjectURL(objectUrl);
      element.remove();
    };

    let settled = false;
    const safeResolve = (buf: AudioBuffer) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(buf);
    };

    const safeReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    element.onerror = () => {
      safeReject(
        new Error(
          `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
        )
      );
    };

    element.onloadedmetadata = async () => {
      try {
        const duration = element.duration;
        if (!duration || isNaN(duration) || duration <= 0) {
          safeReject(
            new Error(
              `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
            )
          );
          return;
        }

        const ctx = getAudioContext();
        const stream =
          (element as any).captureStream
            ? (element as any).captureStream()
            : (element as any).mozCaptureStream
            ? (element as any).mozCaptureStream()
            : null;

        if (stream && stream.getAudioTracks().length === 0) {
          safeReject(
            new Error(
              `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
            )
          );
          return;
        }

        if (stream && stream.getAudioTracks().length > 0 && typeof MediaRecorder !== 'undefined') {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';
          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = async () => {
            try {
              if (chunks.length === 0) {
                safeReject(
                  new Error(
                    `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
                  )
                );
                return;
              }
              const blob = new Blob(chunks, { type: chunks[0].type || 'audio/webm' });
              const arr = await blob.arrayBuffer();
              const decoded = await ctx.decodeAudioData(arr);
              safeResolve(decoded);
            } catch {
              safeReject(
                new Error(
                  `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
                )
              );
            }
          };

          recorder.start();
          element.playbackRate = 16.0;
          element.play().catch(() => {
            element.playbackRate = 1.0;
            element.play().catch(() => {
              safeReject(
                new Error(
                  `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
                )
              );
            });
          });

          element.onended = () => {
            if (recorder.state !== 'inactive') recorder.stop();
          };
          return;
        }

        const response = await fetch(objectUrl);
        const buf = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        safeResolve(decoded);
      } catch {
        safeReject(
          new Error(
            `Unable to decode media file "${file.name}". Please ensure it contains a supported audio track.`
          )
        );
      }
    };
  });
}
