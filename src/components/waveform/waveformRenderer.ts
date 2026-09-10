import { AudioSegment } from '../../types';
import { formatTimeCode } from '../../utils/audio';

export interface MinimapRenderParams {
  canvas: HTMLCanvasElement;
  peaks: { min: Float32Array; max: Float32Array; rms: Float32Array } | null;
  segments: AudioSegment[];
  activeSegmentId: string | null;
  totalDuration: number;
  zoom: number;
  scrollLeft: number;
  containerWidth: number;
  currentTime: number;
  showCropPanel: boolean;
  cropStart: number;
  cropEnd: number;
}

export function drawMinimapCanvas(params: MinimapRenderParams): void {
  const {
    canvas,
    peaks,
    segments,
    activeSegmentId,
    totalDuration,
    zoom,
    scrollLeft,
    containerWidth,
    currentTime,
    showCropPanel,
    cropStart,
    cropEnd,
  } = params;

  if (!canvas || !peaks) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement?.clientWidth || 800;
  const height = 32;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, width, height);

  const centerY = height / 2;
  const totalBuckets = peaks.max.length;
  const barWidth = width / totalBuckets;

  segments.forEach((seg) => {
    if (!seg.enabled) return;
    const startX = (seg.start / totalDuration) * width;
    const endX = (seg.end / totalDuration) * width;
    ctx.fillStyle =
      seg.id === activeSegmentId ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.3)';
    ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);
  });

  for (let i = 0; i < totalBuckets; i += 2) {
    const x = i * barWidth;
    const minVal = peaks.min[i];
    const maxVal = peaks.max[i];
    const barH = Math.max(1, (maxVal - minVal) * (height / 2) * 0.9);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x, centerY - barH / 2, Math.max(1, barWidth * 2), barH);
  }

  if (showCropPanel && (cropStart > 0 || cropEnd < totalDuration)) {
    const cropStartX = (cropStart / totalDuration) * width;
    const cropEndX = (cropEnd / totalDuration) * width;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.fillRect(cropStartX, 0, cropEndX - cropStartX, height);
    ctx.strokeRect(cropStartX, 0, cropEndX - cropStartX, height);
  }

  if (zoom > 1 && containerWidth) {
    const fullWidth = containerWidth * zoom;
    const vpLeft = (scrollLeft / fullWidth) * width;
    const vpWidth = (containerWidth / fullWidth) * width;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.fillRect(vpLeft, 0, vpWidth, height);
    ctx.strokeRect(vpLeft, 0, vpWidth, height);
  }

  const phX = (currentTime / totalDuration) * width;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(phX, 0);
  ctx.lineTo(phX, height);
  ctx.stroke();
}

export interface MainWaveformRenderParams {
  canvas: HTMLCanvasElement;
  peaks: { min: Float32Array; max: Float32Array; rms: Float32Array } | null;
  segments: AudioSegment[];
  activeSegmentId: string | null;
  totalDuration: number;
  zoom: number;
  currentTime: number;
  hoverTime: number | null;
  showCropPanel: boolean;
  cropStart: number;
  cropEnd: number;
  baseWidth: number;
}

export function drawMainWaveformCanvas(params: MainWaveformRenderParams): void {
  const {
    canvas,
    peaks,
    segments,
    activeSegmentId,
    totalDuration,
    zoom,
    currentTime,
    hoverTime,
    showCropPanel,
    cropStart,
    cropEnd,
    baseWidth,
  } = params;

  if (!canvas || !peaks) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(baseWidth, baseWidth * zoom);
  const height = 140;
  const rulerHeight = 22;
  const leftGutter = 38;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  const waveTop = rulerHeight;
  const waveHeight = height - rulerHeight;
  const centerY = waveTop + waveHeight / 2;

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftGutter, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  const ampHalf = waveHeight * 0.23;
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
  ctx.beginPath();
  ctx.moveTo(leftGutter, centerY - ampHalf);
  ctx.lineTo(width, centerY - ampHalf);
  ctx.moveTo(leftGutter, centerY + ampHalf);
  ctx.lineTo(width, centerY + ampHalf);
  ctx.stroke();

  ctx.fillStyle = '#0d1322';
  ctx.fillRect(0, rulerHeight, leftGutter, waveHeight);
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(leftGutter, rulerHeight);
  ctx.lineTo(leftGutter, height);
  ctx.stroke();

  ctx.font = '8.5px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('+1.0', 5, centerY - waveHeight * 0.4);
  ctx.fillText(' 0.0', 5, centerY + 3);
  ctx.fillText('-1.0', 5, centerY + waveHeight * 0.4);

  const effectiveWidth = width - leftGutter;
  const timeToX = (time: number) =>
    totalDuration ? (time / totalDuration) * effectiveWidth : 0;

  if (showCropPanel && (cropStart > 0 || cropEnd < totalDuration)) {
    const cStartX = leftGutter + timeToX(cropStart);
    const cEndX = leftGutter + timeToX(cropEnd);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(leftGutter, waveTop, cStartX - leftGutter, waveHeight);
    ctx.fillRect(cEndX, waveTop, width - cEndX, waveHeight);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(cStartX, waveTop, cEndX - cStartX, waveHeight);
    ctx.setLineDash([]);
  }

  segments.forEach((seg) => {
    const startX = leftGutter + timeToX(seg.start);
    const endX = leftGutter + timeToX(seg.end);
    const segWidth = Math.max(3, endX - startX);
    const isActive = seg.id === activeSegmentId;

    if (seg.enabled) {
      const gradient = ctx.createLinearGradient(0, waveTop, 0, height);
      if (isActive) {
        gradient.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
        gradient.addColorStop(1, 'rgba(217, 119, 6, 0.15)');
      } else {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.20)');
        gradient.addColorStop(1, 'rgba(5, 150, 105, 0.10)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(startX, waveTop, segWidth, waveHeight);

      if (seg.subRanges && seg.subRanges.length > 1) {
        for (let sIdx = 0; sIdx < seg.subRanges.length; sIdx++) {
          const sub = seg.subRanges[sIdx];
          const subStartX = leftGutter + timeToX(sub.start);
          const subEndX = leftGutter + timeToX(sub.end);

          ctx.fillStyle = isActive ? 'rgba(245, 158, 11, 0.6)' : 'rgba(56, 189, 248, 0.5)';
          ctx.fillRect(subStartX, waveTop, 1.5, waveHeight);

          if (sIdx < seg.subRanges.length - 1) {
            const nextSub = seg.subRanges[sIdx + 1];
            const gapStartX = subEndX;
            const gapEndX = leftGutter + timeToX(nextSub.start);
            const gapW = Math.max(0, gapEndX - gapStartX);
            if (gapW > 2) {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
              ctx.fillRect(gapStartX, waveTop, gapW, waveHeight);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              ctx.moveTo(gapStartX + gapW / 2, waveTop);
              ctx.lineTo(gapStartX + gapW / 2, height);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      }

      ctx.fillStyle = isActive
        ? '#f59e0b'
        : seg.subRanges && seg.subRanges.length > 1
        ? '#0ea5e9'
        : '#10b981';
      ctx.fillRect(startX, waveTop, segWidth, 2);

      ctx.fillStyle = isActive
        ? '#f59e0b'
        : seg.subRanges && seg.subRanges.length > 1
        ? '#0284c7'
        : '#059669';
      const badgeW = Math.min(segWidth, 130);
      ctx.fillRect(startX, waveTop + 2, badgeW, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      const isMerged = seg.subRanges && seg.subRanges.length > 1;
      const labelText = `${isMerged ? '⚡ ' : ''}#${seg.index} ${
        seg.customName ? `(${seg.customName})` : ''
      } - ${formatTimeCode(seg.end - seg.start, false)}`;
      ctx.fillText(labelText, startX + 3, waveTop + 12);
    } else {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
      ctx.fillRect(startX, waveTop, segWidth, waveHeight);
      ctx.fillStyle = '#64748b';
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.fillText('[Excluded]', startX + 3, waveTop + 12);
    }
  });

  const totalBuckets = peaks.max.length;
  const barWidth = effectiveWidth / totalBuckets;

  for (let i = 0; i < totalBuckets; i++) {
    const x = leftGutter + i * barWidth;
    const t = (i / totalBuckets) * totalDuration;

    const inFocusedSegment = activeSegmentId
      ? segments.find((s) => s.id === activeSegmentId && t >= s.start && t <= s.end && s.enabled)
      : false;
    const inActiveSegment = segments.some((s) => s.enabled && t >= s.start && t <= s.end);

    const minVal = peaks.min[i];
    const maxVal = peaks.max[i];
    const rms = peaks.rms[i];

    const maxH = waveHeight * 0.44;
    const yTop = centerY - maxVal * maxH;
    const yBottom = centerY - minVal * maxH;
    const barH = Math.max(1, yBottom - yTop);

    if (inFocusedSegment) {
      ctx.fillStyle = '#fbbf24';
    } else if (inActiveSegment) {
      ctx.fillStyle = '#34d399';
    } else {
      ctx.fillStyle = 'rgba(71, 85, 105, 0.4)';
    }
    ctx.fillRect(x, yTop, Math.max(1, barWidth), barH);

    if (rms > 0.02) {
      const yRmsTop = centerY - rms * maxH * 0.9;
      const yRmsBottom = centerY + rms * maxH * 0.9;
      const rmsH = Math.max(1, yRmsBottom - yRmsTop);

      if (inFocusedSegment) {
        ctx.fillStyle = '#f59e0b';
      } else if (inActiveSegment) {
        ctx.fillStyle = '#059669';
      } else {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.6)';
      }
      ctx.fillRect(x, yRmsTop, Math.max(1, barWidth), rmsH);
    }
  }

  segments.forEach((seg) => {
    if (!seg.enabled) return;
    const startX = leftGutter + timeToX(seg.start);
    const endX = leftGutter + timeToX(seg.end);
    const isActive = seg.id === activeSegmentId;

    ctx.strokeStyle = isActive ? '#f59e0b' : '#10b981';
    ctx.lineWidth = isActive ? 2 : 1.5;

    ctx.beginPath();
    ctx.moveTo(startX, waveTop);
    ctx.lineTo(startX, height);
    ctx.moveTo(endX, waveTop);
    ctx.lineTo(endX, height);
    ctx.stroke();

    ctx.fillStyle = isActive ? '#f59e0b' : '#10b981';
    ctx.beginPath();
    ctx.moveTo(startX, waveTop);
    ctx.lineTo(startX + 8, waveTop + 7);
    ctx.lineTo(startX, waveTop + 14);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(endX, height);
    ctx.lineTo(endX - 8, height - 7);
    ctx.lineTo(endX, height - 14);
    ctx.closePath();
    ctx.fill();
  });

  // Timecode Ruler
  ctx.fillStyle = '#0d1322';
  ctx.fillRect(0, 0, width, rulerHeight);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, rulerHeight);
  ctx.lineTo(width, rulerHeight);
  ctx.stroke();

  let tickStep = 1;
  if (zoom >= 8) tickStep = 0.1;
  else if (zoom >= 4) tickStep = 0.25;
  else if (zoom >= 2) tickStep = 0.5;
  else if (totalDuration > 300) tickStep = 30;
  else if (totalDuration > 120) tickStep = 15;
  else if (totalDuration > 60) tickStep = 5;

  ctx.font = '8.5px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';

  for (let t = 0; t <= totalDuration; t += tickStep) {
    const x = leftGutter + timeToX(t);
    const isMajor = Math.abs(t % (tickStep * 2)) < 0.001 || t === 0;

    ctx.beginPath();
    ctx.moveTo(x, isMajor ? 5 : 12);
    ctx.lineTo(x, rulerHeight);
    ctx.stroke();

    if (isMajor || zoom >= 3) {
      ctx.fillText(formatTimeCode(t, zoom >= 4), x + 3, 13);
    }
  }

  // Hover indicator
  if (hoverTime !== null && hoverTime >= 0) {
    const hx = leftGutter + timeToX(hoverTime);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(hx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    const tooltipText = formatTimeCode(hoverTime, true);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    const textW = 66;
    ctx.fillRect(Math.min(hx + 4, width - textW - 4), centerY - 12, textW, 18);
    ctx.strokeRect(Math.min(hx + 4, width - textW - 4), centerY - 12, textW, 18);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.fillText(tooltipText, Math.min(hx + 4, width - textW - 4) + 5, centerY + 1);
  }

  // Playhead line
  const playX = leftGutter + timeToX(currentTime);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playX, 0);
  ctx.lineTo(playX, height);
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(playX - 5, 0);
  ctx.lineTo(playX + 5, 0);
  ctx.lineTo(playX, 8);
  ctx.closePath();
  ctx.fill();
}
