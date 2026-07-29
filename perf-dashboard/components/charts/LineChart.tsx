// ============================================================
// components/charts/LineChart.tsx
// Canvas-rendered line chart with zoom/pan, crosshair tooltip,
// area fills, and smooth Catmull-Rom curves.
// ============================================================
'use client';

import React, { useCallback, useRef, useState, useMemo, useEffect, memo } from 'react';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import {
  clearCanvas,
  computeChartBounds,
  drawGrid,
  drawAxes,
  drawAxisLabels,
  drawLine,
  drawAreaFill,
  drawCrosshair,
  drawTooltip,
  generateXTicks,
  generateYTicks,
  formatValue,
  formatTimestamp,
  DEFAULT_MARGIN,
  THEME,
} from '@/lib/canvasUtils';
import { clamp } from '@/lib/performanceUtils';
import type { LineChartProps, ViewportState, CanvasMousePosition } from '@/lib/types';
import styles from './Chart.module.css';

const LineChart = memo(function LineChart({
  series,
  smooth = false,
  fillArea = true,
  showGrid = true,
  showAxes = true,
  className,
}: LineChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 },
    isDragging: false,
    dragStart: null,
  });
  const [crosshair, setCrosshair] = useState<CanvasMousePosition | null>(null);
  const viewportRef = useRef(viewport);
  const crosshairRef = useRef(crosshair);
  viewportRef.current = viewport;
  crosshairRef.current = crosshair;

  // Pre-compute normalized data for rendering (avoids per-frame normalization)
  const normalizedData = useMemo(() => {
    const visible = series.filter((s) => s.visible && s.data.length > 1);
    if (visible.length === 0) return null;

    const allData = visible.flatMap((s) => s.data);
    let minTs = Infinity, maxTs = -Infinity, minVal = Infinity, maxVal = -Infinity;

    for (const p of allData) {
      if (p.timestamp < minTs) minTs = p.timestamp;
      if (p.timestamp > maxTs) maxTs = p.timestamp;
      if (p.value < minVal) minVal = p.value;
      if (p.value > maxVal) maxVal = p.value;
    }

    const tsRange = maxTs - minTs || 1;
    const valRange = (maxVal - minVal) * 1.1 || 1;
    const valMin = minVal - valRange * 0.05;

    return {
      series: visible.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        xs: new Float32Array(s.data.map((p) => (p.timestamp - minTs) / tsRange)),
        ys: new Float32Array(s.data.map((p) => (p.value - valMin) / valRange)),
        rawData: s.data,
      })),
      minTs, maxTs, minVal, maxVal,
      tsRange, valRange, valMin,
    };
  }, [series]);

  const render = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      clearCanvas(ctx, width, height);

      const margin = { ...DEFAULT_MARGIN, left: 65 };
      const bounds = computeChartBounds(width, height, margin);
      if (!normalizedData || bounds.width <= 0 || bounds.height <= 0) return;

      const { transform } = viewportRef.current;
      const { minTs, maxTs, minVal, maxVal } = normalizedData;

      // Apply viewport transform for zoom/pan
      const visibleMinTs = minTs + (maxTs - minTs) * (-transform.translateX / transform.scaleX / bounds.width);
      const visibleMaxTs = visibleMinTs + (maxTs - minTs) / transform.scaleX;

      const xTicks = generateXTicks(visibleMinTs, visibleMaxTs, 6);
      const valPad = (maxVal - minVal) * 0.05;
      const yTicks = generateYTicks(minVal - valPad, maxVal + valPad, 5);

      if (showGrid) drawGrid(ctx, bounds, xTicks, yTicks);
      if (showAxes) {
        drawAxes(ctx, bounds);
        drawAxisLabels(ctx, bounds, xTicks, yTicks);
      }

      // Apply clipping to keep drawing inside the chart area
      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.clip();

      // Apply zoom/pan transform
      ctx.translate(transform.translateX, transform.translateY);
      ctx.scale(transform.scaleX, transform.scaleY);

      for (const s of normalizedData.series) {
        if (fillArea) {
          drawAreaFill(ctx, s.xs, s.ys, bounds, s.color);
        }
        drawLine(ctx, s.xs, s.ys, bounds, s.color, 1.5, smooth);
      }

      ctx.restore();

      // Crosshair (outside clip, in screen space)
      const ch = crosshairRef.current;
      if (ch) {
        drawCrosshair(ctx, ch.x, ch.y, bounds);
        // Tooltip with series values at cursor
        const tooltipLines: string[] = [formatTimestamp(ch.dataX)];
        for (const s of normalizedData.series) {
          // Find closest point
          const idx = findClosestIndex(s.rawData, ch.dataX);
          if (idx >= 0) {
            tooltipLines.push(`${s.name}: ${formatValue(s.rawData[idx].value)}`);
          }
        }
        drawTooltip(ctx, ch.x, ch.y, tooltipLines, width, height);
      }
    },
    [normalizedData, smooth, fillArea, showGrid, showAxes]
  );

  const { canvasRef, markDirty } = useChartRenderer({ onRender: render });

  // Mark dirty when data changes
  useEffect(() => {
    markDirty();
  }, [normalizedData, viewport, crosshair, markDirty]);

  // ── Mouse event handlers for zoom/pan/crosshair ────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (normalizedData) {
        const margin = { ...DEFAULT_MARGIN, left: 65 };
        const bounds = computeChartBounds(rect.width, rect.height, margin);
        const normX = clamp((x - bounds.x) / bounds.width, 0, 1);
        const dataX = normalizedData.minTs + normX * normalizedData.tsRange;
        const normY = clamp(1 - (y - bounds.y) / bounds.height, 0, 1);
        const dataY = normalizedData.valMin + normY * normalizedData.valRange;
        setCrosshair({ x, y, dataX, dataY });
      }

      if (viewport.isDragging && viewport.dragStart) {
        const dx = x - viewport.dragStart.x;
        setViewport((prev) => ({
          ...prev,
          transform: {
            ...prev.transform,
            translateX: clamp(prev.transform.translateX + dx, -5000, 0),
          },
          dragStart: { x, y },
        }));
      }
    },
    [normalizedData, viewport, canvasRef]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setViewport((prev) => ({
        ...prev,
        transform: {
          ...prev.transform,
          scaleX: clamp(prev.transform.scaleX * factor, 0.1, 20),
        },
      }));
    },
    []
  );

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    setViewport((prev) => ({
      ...prev,
      isDragging: true,
      dragStart: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    setViewport((prev) => ({ ...prev, isDragging: false, dragStart: null }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
    setViewport((prev) => ({ ...prev, isDragging: false, dragStart: null }));
  }, []);

  return (
    <div ref={wrapperRef} className={`${styles.chartWrapper} ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ cursor: viewport.isDragging ? 'grabbing' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </div>
  );
});

/** Binary search for the closest timestamp */
function findClosestIndex(data: { timestamp: number }[], target: number): number {
  if (data.length === 0) return -1;
  let lo = 0, hi = data.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (data[mid].timestamp < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export default LineChart;
