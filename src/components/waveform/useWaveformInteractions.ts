import React, { useState, RefObject, MouseEvent } from 'react';
import { AudioSegment } from '../../types';

interface DragState {
  type: 'start-handle' | 'end-handle' | 'seek';
  segmentId?: string;
  initialStart?: number;
  initialEnd?: number;
  startX: number;
}

interface UseWaveformInteractionsParams {
  segments: AudioSegment[];
  totalDuration: number;
  zoom: number;
  onSeek: (time: number) => void;
  onSelectSegment: (id: string) => void;
  onUpdateSegmentTimes: (id: string, start: number, end: number) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  mainCanvasRef: RefObject<HTMLCanvasElement | null>;
}

export function useWaveformInteractions({
  segments,
  totalDuration,
  zoom,
  onSeek,
  onSelectSegment,
  onUpdateSegmentTimes,
  containerRef,
  mainCanvasRef,
}: UseWaveformInteractionsParams) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverHandle, setHoverHandle] = useState<'start' | 'end' | null>(null);

  const timeToX = (time: number, effectiveWidth: number) =>
    totalDuration ? (time / totalDuration) * effectiveWidth : 0;

  const xToTime = (x: number, effectiveWidth: number) =>
    effectiveWidth > 0 ? Math.max(0, Math.min(totalDuration, (x / effectiveWidth) * totalDuration)) : 0;

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const baseWidth = containerRef.current?.clientWidth || 800;
    const totalWidth = Math.max(baseWidth, baseWidth * zoom);
    const leftGutter = 38;
    const effectiveWidth = totalWidth - leftGutter;

    if (x < leftGutter) return;

    const clickTime = xToTime(x - leftGutter, effectiveWidth);
    const tolerancePx = 8;

    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (!seg.enabled) continue;

      const startX = leftGutter + timeToX(seg.start, effectiveWidth);
      const endX = leftGutter + timeToX(seg.end, effectiveWidth);

      if (Math.abs(x - startX) <= tolerancePx) {
        setDragState({
          type: 'start-handle',
          segmentId: seg.id,
          initialStart: seg.start,
          startX: x,
        });
        onSelectSegment(seg.id);
        return;
      }

      if (Math.abs(x - endX) <= tolerancePx) {
        setDragState({
          type: 'end-handle',
          segmentId: seg.id,
          initialEnd: seg.end,
          startX: x,
        });
        onSelectSegment(seg.id);
        return;
      }
    }

    const clickedSegment = segments.find(
      (s) => s.enabled && clickTime >= s.start && clickTime <= s.end
    );
    if (clickedSegment) {
      onSelectSegment(clickedSegment.id);
    }

    onSeek(clickTime);
    setDragState({ type: 'seek', startX: x });
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const baseWidth = containerRef.current?.clientWidth || 800;
    const totalWidth = Math.max(baseWidth, baseWidth * zoom);
    const leftGutter = 38;
    const effectiveWidth = totalWidth - leftGutter;

    if (x >= leftGutter) {
      const currTime = xToTime(x - leftGutter, effectiveWidth);
      setHoverTime(currTime);

      if (!dragState) {
        const tolerancePx = 8;
        let isHandle = false;
        for (let i = segments.length - 1; i >= 0; i--) {
          const seg = segments[i];
          if (!seg.enabled) continue;
          const startX = leftGutter + timeToX(seg.start, effectiveWidth);
          const endX = leftGutter + timeToX(seg.end, effectiveWidth);
          if (Math.abs(x - startX) <= tolerancePx) {
            setHoverHandle('start');
            isHandle = true;
            break;
          }
          if (Math.abs(x - endX) <= tolerancePx) {
            setHoverHandle('end');
            isHandle = true;
            break;
          }
        }
        if (!isHandle) setHoverHandle(null);
      } else {
        if (dragState.type === 'start-handle' && dragState.segmentId) {
          const seg = segments.find((s) => s.id === dragState.segmentId);
          if (seg) {
            const newStart = Math.max(0, Math.min(seg.end - 0.05, currTime));
            onUpdateSegmentTimes(seg.id, Number(newStart.toFixed(3)), seg.end);
          }
        } else if (dragState.type === 'end-handle' && dragState.segmentId) {
          const seg = segments.find((s) => s.id === dragState.segmentId);
          if (seg) {
            const newEnd = Math.max(seg.start + 0.05, Math.min(totalDuration, currTime));
            onUpdateSegmentTimes(seg.id, Number(seg.start.toFixed(3)), Number(newEnd.toFixed(3)));
          }
        } else if (dragState.type === 'seek') {
          onSeek(currTime);
        }
      }
    }
  };

  const cursorStyle = dragState
    ? 'cursor-grabbing'
    : hoverHandle
    ? 'cursor-ew-resize'
    : 'cursor-crosshair';

  return {
    dragState,
    setDragState,
    hoverTime,
    setHoverTime,
    setHoverHandle,
    handleMouseDown,
    handleMouseMove,
    cursorStyle,
  };
}
