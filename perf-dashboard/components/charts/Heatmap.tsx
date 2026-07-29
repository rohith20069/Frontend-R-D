// ============================================================
// components/charts/Heatmap.tsx
// Canvas-rendered heatmap using fillRect per cell.
// Generates heatmap data from series correlation matrix.
// ============================================================
'use client';

import React, { useCallback, useMemo, useEffect, memo } from 'react';
import { useChartRenderer } from '@/hooks/useChartRenderer';
import {
  clearCanvas,
  computeChartBounds,
  drawAxes,
  drawHeatmap,
  DEFAULT_HEATMAP_SCALE,
  THEME,
} from '@/lib/canvasUtils';
import type { HeatmapProps, HeatmapCell } from '@/lib/types';
import styles from './Chart.module.css';

const Heatmap = memo(function Heatmap({
  data,
  rows,
  cols,
  colorScale = DEFAULT_HEATMAP_SCALE,
  className,
}: HeatmapProps) {
  const render = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      clearCanvas(ctx, width, height);
      const margin = { top: 30, right: 20, bottom: 50, left: 80 };
      const bounds = computeChartBounds(width, height, margin);
      if (bounds.width <= 0 || bounds.height <= 0 || data.length === 0) return;

      drawAxes(ctx, bounds);
      drawHeatmap(ctx, data, bounds, colorScale);

      // Row/column labels
      const cellH = bounds.height / rows;
      const cellW = bounds.width / cols;

      ctx.save();
      ctx.fillStyle = THEME.text;
      ctx.font = '10px Inter, monospace';

      // Y labels (rows)
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < rows; r++) {
        ctx.fillText(
          `T-${rows - r}`,
          bounds.x - 6,
          bounds.y + r * cellH + cellH / 2
        );
      }

      // X labels (columns) — rotated
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let c = 0; c < cols; c += Math.max(1, Math.floor(cols / 8))) {
        ctx.save();
        const lx = bounds.x + c * cellW + cellW / 2;
        const ly = bounds.y + bounds.height + 6;
        ctx.translate(lx, ly);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(`S${c + 1}`, 0, 0);
        ctx.restore();
      }

      // Colorscale legend bar
      const legendW = bounds.width;
      const legendH = 8;
      const legendY = bounds.y + bounds.height + 30;
      const gradient = ctx.createLinearGradient(bounds.x, 0, bounds.x + legendW, 0);
      for (const stop of colorScale) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(bounds.x, legendY, legendW, legendH);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(bounds.x, legendY, legendW, legendH);

      // Legend labels
      ctx.fillStyle = THEME.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Low', bounds.x, legendY + legendH + 2);
      ctx.textAlign = 'right';
      ctx.fillText('High', bounds.x + legendW, legendY + legendH + 2);

      ctx.restore();
    },
    [data, rows, cols, colorScale]
  );

  const { canvasRef, markDirty } = useChartRenderer({ onRender: render });

  useEffect(() => markDirty(), [data, markDirty]);

  return (
    <div className={`${styles.chartWrapper} ${className ?? ''}`}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
});

/**
 * Utility: build a heatmap matrix from multiple series.
 * Computes rolling correlation-like intensity per time slot × series.
 */
export function buildHeatmapData(
  seriesValues: number[][],
  timeSlots: number = 20
): { data: HeatmapCell[][]; rows: number; cols: number } {
  const numSeries = seriesValues.length;
  if (numSeries === 0) return { data: [], rows: 0, cols: 0 };

  const cells: HeatmapCell[][] = [];

  for (let t = 0; t < timeSlots; t++) {
    const row: HeatmapCell[] = [];
    for (let s = 0; s < numSeries; s++) {
      const vals = seriesValues[s];
      if (vals.length === 0) {
        row.push({ row: t, col: s, value: 0 });
        continue;
      }
      // Sample a window of the series values for this time slot
      const segLen = Math.floor(vals.length / timeSlots);
      const start = t * segLen;
      const end = Math.min(start + segLen, vals.length);
      let sum = 0;
      for (let i = start; i < end; i++) sum += vals[i];
      row.push({ row: t, col: s, value: sum / Math.max(1, end - start) });
    }
    cells.push(row);
  }

  return { data: cells, rows: timeSlots, cols: numSeries };
}

export default Heatmap;
