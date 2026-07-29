// ============================================================
// lib/canvasUtils.ts
// Reusable, optimized canvas drawing primitives.
// All functions are pure and work with a CanvasRenderingContext2D.
// Designed for maximum performance in a 60 FPS render loop.
// ============================================================

import type { AxisTick, ChartBounds, ChartMargin, ColorStop, HeatmapCell } from './types';

/** Default chart margin */
export const DEFAULT_MARGIN: ChartMargin = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 60,
};

/** Theme colors */
export const THEME = {
  grid: 'rgba(255,255,255,0.06)',
  axis: 'rgba(255,255,255,0.2)',
  text: 'rgba(255,255,255,0.6)',
  textBright: 'rgba(255,255,255,0.9)',
  background: 'rgba(10,12,20,0)',
  crosshair: 'rgba(255,255,255,0.3)',
  font: '11px "Inter", "SF Mono", monospace',
  fontBold: 'bold 11px "Inter", "SF Mono", monospace',
};

/**
 * Scale canvas for high-DPI (Retina) displays.
 * MUST be called before any drawing operations.
 * Returns the devicePixelRatio used.
 */
export function scaleCanvasForDPI(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  const dpr = window.devicePixelRatio || 1;
  // Set the canvas buffer size to physical pixels
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  // Set the CSS size to logical pixels
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // Scale the context to account for DPI
  ctx.scale(dpr, dpr);
  return dpr;
}

/**
 * Compute drawing area bounds from canvas size and margins.
 */
export function computeChartBounds(
  width: number,
  height: number,
  margin: ChartMargin = DEFAULT_MARGIN
): ChartBounds {
  return {
    x: margin.left,
    y: margin.top,
    width: Math.max(0, width - margin.left - margin.right),
    height: Math.max(0, height - margin.top - margin.bottom),
  };
}

/**
 * Clear the entire canvas efficiently using clearRect.
 * More performant than setting canvas.width = canvas.width.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw a subtle grid inside the chart bounds.
 * Horizontal lines at each Y tick, vertical at each X tick.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  xTicks: AxisTick[],
  yTicks: AxisTick[]
): void {
  ctx.save();
  ctx.strokeStyle = THEME.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  // Vertical grid lines
  for (const tick of xTicks) {
    const x = bounds.x + tick.position * bounds.width;
    ctx.beginPath();
    ctx.moveTo(x, bounds.y);
    ctx.lineTo(x, bounds.y + bounds.height);
    ctx.stroke();
  }

  // Horizontal grid lines
  for (const tick of yTicks) {
    const y = bounds.y + (1 - tick.position) * bounds.height;
    ctx.beginPath();
    ctx.moveTo(bounds.x, y);
    ctx.lineTo(bounds.x + bounds.width, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw X and Y axes as solid lines.
 */
export function drawAxes(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds
): void {
  ctx.save();
  ctx.strokeStyle = THEME.axis;
  ctx.lineWidth = 1;

  // Y axis (left)
  ctx.beginPath();
  ctx.moveTo(bounds.x, bounds.y);
  ctx.lineTo(bounds.x, bounds.y + bounds.height);
  ctx.stroke();

  // X axis (bottom)
  ctx.beginPath();
  ctx.moveTo(bounds.x, bounds.y + bounds.height);
  ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw axis labels (tick marks + text).
 */
export function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  bounds: ChartBounds,
  xTicks: AxisTick[],
  yTicks: AxisTick[]
): void {
  ctx.save();
  ctx.fillStyle = THEME.text;
  ctx.font = THEME.font;

  // X axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const tick of xTicks) {
    const x = bounds.x + tick.position * bounds.width;
    const y = bounds.y + bounds.height + 8;
    // Tick mark
    ctx.strokeStyle = THEME.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, bounds.y + bounds.height);
    ctx.lineTo(x, bounds.y + bounds.height + 4);
    ctx.stroke();
    ctx.fillText(tick.label, x, y);
  }

  // Y axis labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const tick of yTicks) {
    const y = bounds.y + (1 - tick.position) * bounds.height;
    const x = bounds.x - 8;
    ctx.strokeStyle = THEME.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bounds.x, y);
    ctx.lineTo(bounds.x - 4, y);
    ctx.stroke();
    ctx.fillText(tick.label, x, y);
  }

  ctx.restore();
}

/**
 * Generate evenly spaced Y-axis ticks between min and max values.
 * Uses a "nice" algorithm to round to human-readable boundaries.
 */
export function generateYTicks(
  minValue: number,
  maxValue: number,
  tickCount: number = 5
): AxisTick[] {
  if (minValue === maxValue) {
    return [{ position: 0.5, label: formatValue(minValue), value: minValue }];
  }

  const range = maxValue - minValue;
  const rawStep = range / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / magnitude) * magnitude;
  const niceMin = Math.floor(minValue / step) * step;

  const ticks: AxisTick[] = [];
  for (let i = 0; i <= tickCount + 1; i++) {
    const value = niceMin + i * step;
    if (value > maxValue + step) break;
    const position = (value - minValue) / range;
    if (position >= -0.01 && position <= 1.01) {
      ticks.push({ position: Math.max(0, Math.min(1, position)), label: formatValue(value), value });
    }
  }
  return ticks;
}

/**
 * Generate evenly spaced X-axis ticks for timestamps.
 */
export function generateXTicks(
  minTs: number,
  maxTs: number,
  tickCount: number = 6
): AxisTick[] {
  const range = maxTs - minTs;
  if (range === 0) return [];

  const step = range / (tickCount - 1);
  const ticks: AxisTick[] = [];
  for (let i = 0; i < tickCount; i++) {
    const ts = minTs + i * step;
    const position = (ts - minTs) / range;
    ticks.push({ position, label: formatTimestamp(ts), value: ts });
  }
  return ticks;
}

/** Format a numeric value for display on axes */
export function formatValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

/** Format a Unix timestamp for X axis display */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Draw a polyline from normalized [0,1] x/y values.
 * x and y arrays must be same length and pre-normalized.
 */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  bounds: ChartBounds,
  color: string,
  lineWidth: number = 1.5,
  smooth: boolean = false
): void {
  if (xs.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  const x0 = bounds.x + xs[0] * bounds.width;
  const y0 = bounds.y + (1 - ys[0]) * bounds.height;
  ctx.moveTo(x0, y0);

  if (smooth) {
    // Catmull-Rom → cubic bezier conversion for smooth curves
    for (let i = 1; i < xs.length - 1; i++) {
      const px = bounds.x + xs[i - 1] * bounds.width;
      const py = bounds.y + (1 - ys[i - 1]) * bounds.height;
      const cx = bounds.x + xs[i] * bounds.width;
      const cy = bounds.y + (1 - ys[i]) * bounds.height;
      const nx = bounds.x + xs[i + 1] * bounds.width;
      const ny = bounds.y + (1 - ys[i + 1]) * bounds.height;
      const cp1x = cx - (nx - px) / 6;
      const cp1y = cy - (ny - py) / 6;
      const cp2x = cx + (nx - px) / 6;
      const cp2y = cy + (ny - py) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nx, ny);
    }
  } else {
    for (let i = 1; i < xs.length; i++) {
      ctx.lineTo(bounds.x + xs[i] * bounds.width, bounds.y + (1 - ys[i]) * bounds.height);
    }
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Draw an area fill under a line.
 * Uses gradient from series color to transparent.
 */
export function drawAreaFill(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  bounds: ChartBounds,
  color: string
): void {
  if (xs.length < 2) return;
  ctx.save();

  // Parse color to rgba for gradient stops
  const [r, g, b] = parseColor(color);

  const gradient = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.height);
  gradient.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

  // Build area path
  ctx.beginPath();
  ctx.moveTo(bounds.x + xs[0] * bounds.width, bounds.y + bounds.height);
  for (let i = 0; i < xs.length; i++) {
    ctx.lineTo(bounds.x + xs[i] * bounds.width, bounds.y + (1 - ys[i]) * bounds.height);
  }
  ctx.lineTo(bounds.x + xs[xs.length - 1] * bounds.width, bounds.y + bounds.height);
  ctx.closePath();

  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

/**
 * Draw bar chart columns.
 * Bars are rendered as filled rectangles with rounded tops.
 */
export function drawBars(
  ctx: CanvasRenderingContext2D,
  normalizedData: Array<{ x: number; y: number }>,
  bounds: ChartBounds,
  color: string,
  barWidth?: number
): void {
  if (normalizedData.length === 0) return;

  const bw = barWidth ?? Math.max(1, (bounds.width / normalizedData.length) * 0.7);
  const halfBw = bw / 2;

  ctx.save();
  ctx.fillStyle = color;

  for (const { x, y } of normalizedData) {
    const px = bounds.x + x * bounds.width;
    const barH = y * bounds.height;
    const py = bounds.y + bounds.height - barH;
    const r = Math.min(2, halfBw);
    // Rounded top rectangle
    if (barH > 0) {
      ctx.beginPath();
      ctx.moveTo(px - halfBw + r, py);
      ctx.lineTo(px + halfBw - r, py);
      ctx.quadraticCurveTo(px + halfBw, py, px + halfBw, py + r);
      ctx.lineTo(px + halfBw, py + barH);
      ctx.lineTo(px - halfBw, py + barH);
      ctx.lineTo(px - halfBw, py + r);
      ctx.quadraticCurveTo(px - halfBw, py, px - halfBw + r, py);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draw scatter plot dots.
 * Uses a single arc path batch for performance.
 */
export function drawScatter(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  bounds: ChartBounds,
  color: string,
  radius: number = 3
): void {
  if (xs.length === 0) return;
  ctx.save();
  ctx.fillStyle = color;

  // Draw all circles in a single path batch
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) {
    const px = bounds.x + xs[i] * bounds.width;
    const py = bounds.y + (1 - ys[i]) * bounds.height;
    ctx.moveTo(px + radius, py);
    ctx.arc(px, py, radius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a heatmap grid.
 * Uses an off-screen ImageData approach for maximum performance.
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  cells: HeatmapCell[][],
  bounds: ChartBounds,
  colorScale: ColorStop[]
): void {
  if (cells.length === 0 || cells[0].length === 0) return;

  const rows = cells.length;
  const cols = cells[0].length;
  const cellW = bounds.width / cols;
  const cellH = bounds.height / rows;

  // Find global min/max for normalization
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const row of cells) {
    for (const cell of row) {
      if (cell.value < minVal) minVal = cell.value;
      if (cell.value > maxVal) maxVal = cell.value;
    }
  }

  const range = maxVal - minVal || 1;

  ctx.save();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const t = (cell.value - minVal) / range;
      const color = interpolateColorScale(colorScale, t);
      ctx.fillStyle = color;
      ctx.fillRect(
        bounds.x + c * cellW,
        bounds.y + r * cellH,
        Math.ceil(cellW),
        Math.ceil(cellH)
      );
    }
  }

  ctx.restore();
}

/**
 * Interpolate a color from a multi-stop color scale.
 */
export function interpolateColorScale(stops: ColorStop[], t: number): string {
  if (stops.length === 0) return '#000';
  if (t <= 0) return stops[0].color;
  if (t >= 1) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].offset && t <= stops[i + 1].offset) {
      const localT = (t - stops[i].offset) / (stops[i + 1].offset - stops[i].offset);
      return lerpColor(stops[i].color, stops[i + 1].color, localT);
    }
  }
  return stops[stops.length - 1].color;
}

/** Linear interpolation between two hex/rgb colors */
function lerpColor(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Parse a hex color string to [r, g, b] */
function parseColor(hex: string): [number, number, number] {
  if (hex.startsWith('#')) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  // Handle rgb() format
  const match = hex.match(/\d+/g);
  if (match && match.length >= 3) {
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  }
  return [0, 0, 0];
}

/**
 * Draw a crosshair at the given canvas coordinates.
 */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bounds: ChartBounds
): void {
  ctx.save();
  ctx.strokeStyle = THEME.crosshair;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(x, bounds.y);
  ctx.lineTo(x, bounds.y + bounds.height);
  ctx.stroke();

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(bounds.x, y);
  ctx.lineTo(bounds.x + bounds.width, y);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw a tooltip box at the given position.
 */
export function drawTooltip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lines: string[],
  canvasWidth: number,
  canvasHeight: number
): void {
  if (lines.length === 0) return;
  ctx.save();

  const padding = 8;
  const lineHeight = 16;
  const boxW = 160;
  const boxH = lines.length * lineHeight + padding * 2;

  // Flip tooltip to stay inside canvas
  let bx = x + 12;
  let by = y - boxH / 2;
  if (bx + boxW > canvasWidth - 10) bx = x - boxW - 12;
  if (by < 5) by = 5;
  if (by + boxH > canvasHeight - 5) by = canvasHeight - boxH - 5;

  // Background
  ctx.fillStyle = 'rgba(15,18,30,0.92)';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = THEME.textBright;
  ctx.font = THEME.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bx + padding, by + padding + i * lineHeight);
  }

  ctx.restore();
}

/** Draw a rounded rectangle path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Default heatmap color scale (blue → cyan → green → yellow → red) */
export const DEFAULT_HEATMAP_SCALE: ColorStop[] = [
  { offset: 0, color: '#0a0a2e' },
  { offset: 0.25, color: '#00d4ff' },
  { offset: 0.5, color: '#7fff6f' },
  { offset: 0.75, color: '#ffaa00' },
  { offset: 1, color: '#ff2255' },
];
