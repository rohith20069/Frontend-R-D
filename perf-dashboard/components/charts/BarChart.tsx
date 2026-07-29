// ============================================================
// components/charts/BarChart.tsx
// Canvas-rendered grouped bar chart.
// Renders grouped bars per time bucket with mouse hover tooltips.
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
  drawBars,
  drawTooltip,
  generateXTicks,
  generateYTicks,
  formatValue,
  formatTimestamp,
  DEFAULT_MARGIN,
} from '@/lib/canvasUtils';
import type { BarChartProps, CanvasMousePosition } from '@/lib/types';
import styles from './Chart.module.css';

const BarChart = memo(function BarChart({
  series,
  showGrid = true,
  showAxes = true,
  className,
}: BarChartProps) {
  const [crosshair, setCrosshair] = useState<CanvasMousePosition | null>(null);
  const crosshairRef = useRef(crosshair);
  crosshairRef.current = crosshair;

  // Sample the last N points for bar display (bars with too many buckets become unreadable)
  const MAX_BARS = 60;

  const normalizedData = useMemo(() => {
    const visible = series.filter((s) => s.visible && s.data.length > 0);
    if (visible.length === 0) return null;

    // Use the last MAX_BARS points of the first series for X buckets
    const timestamps = visible[0].data
      .slice(-MAX_BARS)
      .map((p) => p.timestamp);

    const minTs = timestamps[0];
    const maxTs = timestamps[timestamps.length - 1] || minTs;
    const tsRange = maxTs - minTs || 1;

    let globalMax = -Infinity;
    let globalMin = Infinity;

    const seriesData = visible.map((s) => {
      const pts = s.data.slice(-MAX_BARS);
      pts.forEach((p) => {
        if (p.value > globalMax) globalMax = p.value;
        if (p.value < globalMin) globalMin = p.value;
      });
      return { ...s, pts };
    });

    const valPad = (globalMax - globalMin) * 0.05 || 1;
    const valMin = Math.max(0, globalMin - valPad);
    const valMax = globalMax + valPad;
    const valRange = valMax - valMin || 1;

    return {
      seriesData,
      timestamps,
      minTs, maxTs, tsRange,
      valMin, valMax, valRange,
    };
  }, [series]);

  const render = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      clearCanvas(ctx, width, height);
      const margin = { ...DEFAULT_MARGIN, left: 65 };
      const bounds = computeChartBounds(width, height, margin);
      if (!normalizedData || bounds.width <= 0 || bounds.height <= 0) return;

      const { minTs, maxTs, valMin, valMax, seriesData, timestamps } = normalizedData;
      const xTicks = generateXTicks(minTs, maxTs, 6);
      const yTicks = generateYTicks(valMin, valMax, 5);

      if (showGrid) drawGrid(ctx, bounds, xTicks, yTicks);
      if (showAxes) {
        drawAxes(ctx, bounds);
        drawAxisLabels(ctx, bounds, xTicks, yTicks);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.clip();

      const n = timestamps.length;
      const groupWidth = bounds.width / (n || 1);
      const barW = groupWidth * 0.7 / (seriesData.length || 1);

      for (let si = 0; si < seriesData.length; si++) {
        const s = seriesData[si];
        const normalizedBars = s.pts.map((p, i) => ({
          x: (i / n) + (si * barW + barW / 2) / bounds.width,
          y: Math.max(0, (p.value - valMin) / normalizedData.valRange),
        }));
        drawBars(ctx, normalizedBars, bounds, s.color, barW);
      }

      ctx.restore();

      // Tooltip
      const ch = crosshairRef.current;
      if (ch) {
        const margin2 = { ...DEFAULT_MARGIN, left: 65 };
        const b = computeChartBounds(width, height, margin2);
        const idx = Math.round(((ch.x - b.x) / b.width) * (timestamps.length - 1));
        if (idx >= 0 && idx < timestamps.length) {
          const lines = [formatTimestamp(timestamps[idx])];
          for (const s of seriesData) {
            if (s.pts[idx]) {
              lines.push(`${s.name}: ${formatValue(s.pts[idx].value)}`);
            }
          }
          drawTooltip(ctx, ch.x, ch.y, lines, width, height);
        }
      }
    },
    [normalizedData, showGrid, showAxes]
  );

  const { canvasRef, markDirty } = useChartRenderer({ onRender: render });

  useEffect(() => markDirty(), [normalizedData, crosshair, markDirty]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      setCrosshair({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        dataX: 0,
        dataY: 0,
      });
    },
    []
  );

  return (
    <div className={`${styles.chartWrapper} ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCrosshair(null)}
      />
    </div>
  );
});

export default BarChart;
