// ============================================================
// components/charts/ScatterPlot.tsx
// Canvas-rendered scatter plot.
// Renders up to 10,000+ points using batched arc drawing.
// Supports color density mapping and crosshair tooltips.
// ============================================================
'use client';

import React, { useCallback, useMemo, useEffect, useRef, useState, memo } from 'react';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import {
  clearCanvas,
  computeChartBounds,
  drawGrid,
  drawAxes,
  drawAxisLabels,
  drawScatter,
  drawCrosshair,
  drawTooltip,
  generateXTicks,
  generateYTicks,
  formatValue,
  formatTimestamp,
  DEFAULT_MARGIN,
} from '@/lib/canvasUtils';
import { clamp } from '@/lib/performanceUtils';
import type { ScatterPlotProps, CanvasMousePosition } from '@/lib/types';
import styles from './Chart.module.css';

// Limit scatter points per series (performance-balanced)
const MAX_SCATTER_POINTS = 5000;

const ScatterPlot = memo(function ScatterPlot({
  series,
  pointRadius = 2.5,
  showGrid = true,
  showAxes = true,
  className,
}: ScatterPlotProps) {
  const [crosshair, setCrosshair] = useState<CanvasMousePosition | null>(null);
  const crosshairRef = useRef(crosshair);
  crosshairRef.current = crosshair;

  const normalizedData = useMemo(() => {
    const visible = series.filter((s) => s.visible && s.data.length > 0);
    if (visible.length === 0) return null;

    const allData = visible.flatMap((s) => s.data.slice(-MAX_SCATTER_POINTS));

    let minTs = Infinity, maxTs = -Infinity, minVal = Infinity, maxVal = -Infinity;
    for (const p of allData) {
      if (p.timestamp < minTs) minTs = p.timestamp;
      if (p.timestamp > maxTs) maxTs = p.timestamp;
      if (p.value < minVal) minVal = p.value;
      if (p.value > maxVal) maxVal = p.value;
    }

    const tsRange = maxTs - minTs || 1;
    const valPad = (maxVal - minVal) * 0.05 || 1;
    const valMin = minVal - valPad;
    const valMax = maxVal + valPad;
    const valRange = valMax - valMin;

    return {
      series: visible.map((s) => {
        const pts = s.data.slice(-MAX_SCATTER_POINTS);
        return {
          id: s.id,
          name: s.name,
          color: s.color,
          xs: new Float32Array(pts.map((p) => (p.timestamp - minTs) / tsRange)),
          ys: new Float32Array(pts.map((p) => (p.value - valMin) / valRange)),
          rawData: pts,
        };
      }),
      minTs, maxTs, tsRange,
      minVal: valMin, maxVal: valMax, valRange,
    };
  }, [series]);

  const render = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      clearCanvas(ctx, width, height);
      const margin = { ...DEFAULT_MARGIN, left: 65 };
      const bounds = computeChartBounds(width, height, margin);
      if (!normalizedData || bounds.width <= 0 || bounds.height <= 0) return;

      const { minTs, maxTs, minVal, maxVal } = normalizedData;
      const xTicks = generateXTicks(minTs, maxTs, 6);
      const yTicks = generateYTicks(minVal, maxVal, 5);

      if (showGrid) drawGrid(ctx, bounds, xTicks, yTicks);
      if (showAxes) {
        drawAxes(ctx, bounds);
        drawAxisLabels(ctx, bounds, xTicks, yTicks);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.clip();

      // Draw each series with slightly transparent fill for density perception
      for (const s of normalizedData.series) {
        ctx.globalAlpha = 0.7;
        drawScatter(ctx, s.xs, s.ys, bounds, s.color, pointRadius);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      const ch = crosshairRef.current;
      if (ch) {
        drawCrosshair(ctx, ch.x, ch.y, bounds);
        const tooltipLines: string[] = [formatTimestamp(ch.dataX)];
        for (const s of normalizedData.series) {
          // Find nearest point
          const normX = clamp((ch.x - bounds.x) / bounds.width, 0, 1);
          const idx = Math.round(normX * (s.xs.length - 1));
          if (idx >= 0 && idx < s.rawData.length) {
            tooltipLines.push(`${s.name}: ${formatValue(s.rawData[idx].value)}`);
          }
        }
        drawTooltip(ctx, ch.x, ch.y, tooltipLines, width, height);
      }
    },
    [normalizedData, pointRadius, showGrid, showAxes]
  );

  const { canvasRef, markDirty } = useChartRenderer({ onRender: render });

  useEffect(() => markDirty(), [normalizedData, crosshair, markDirty]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!normalizedData) return;
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const margin = { ...DEFAULT_MARGIN, left: 65 };
      const bounds = computeChartBounds(rect.width, rect.height, margin);
      const normX = clamp((x - bounds.x) / bounds.width, 0, 1);
      const dataX = normalizedData.minTs + normX * normalizedData.tsRange;
      const normY = clamp(1 - (y - bounds.y) / bounds.height, 0, 1);
      const dataY = normalizedData.minVal + normY * normalizedData.valRange;
      setCrosshair({ x, y, dataX, dataY });
    },
    [normalizedData]
  );

  return (
    <div className={`${styles.chartWrapper} ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCrosshair(null)}
      />
    </div>
  );
});

export default ScatterPlot;
