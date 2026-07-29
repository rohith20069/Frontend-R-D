// ============================================================
// lib/types.ts
// Central type definitions for the entire dashboard application
// ============================================================

/** A single timestamped data point */
export interface DataPoint {
  timestamp: number;
  value: number;
  series: string;
}

/** A named series with color and visibility */
export interface DataSeries {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  data: DataPoint[];
}

/** Aggregation granularity options */
export type AggregationLevel = '1m' | '5m' | '1h' | 'raw';

/** Time range presets */
export type TimeRange = '1m' | '5m' | '15m' | '1h' | '6h' | '24h';

/** Stress mode data sizes */
export type StressMode = 'normal' | 'stress' | 'extreme';

/** Canvas rendering bounds */
export interface ChartBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Margin around chart drawing area */
export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Pan/zoom transform state */
export interface Transform {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
}

/** Interactive viewport state for pan/zoom */
export interface ViewportState {
  transform: Transform;
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
}

/** Aggregated data point for coarser time windows */
export interface AggregatedPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  avg: number;
  count: number;
}

/** Performance metrics snapshot */
export interface PerformanceMetrics {
  fps: number;
  memoryMB: number;
  renderTimeMs: number;
  processingTimeMs: number;
  droppedFrames: number;
  dataPointCount: number;
  timestamp: number;
}

/** Filter state for controlling dataset visibility */
export interface FilterState {
  visibleSeries: Set<string>;
  timeRange: TimeRange;
  aggregation: AggregationLevel;
  stressMode: StressMode;
}

/** Heatmap cell value */
export interface HeatmapCell {
  row: number;
  col: number;
  value: number;
  label?: string;
}

/** Data context shape */
export interface DataContextValue {
  series: DataSeries[];
  rawPoints: DataPoint[];
  aggregatedPoints: Map<string, AggregatedPoint[]>;
  filterState: FilterState;
  metrics: PerformanceMetrics;
  isStreaming: boolean;
  toggleSeries: (id: string) => void;
  setTimeRange: (range: TimeRange) => void;
  setAggregation: (level: AggregationLevel) => void;
  setStressMode: (mode: StressMode) => void;
  toggleStreaming: () => void;
  resetZoom: () => void;
}

/** Row item for virtual table */
export interface TableRow {
  id: number;
  timestamp: string;
  series: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

/** Mouse event position on canvas */
export interface CanvasMousePosition {
  x: number;
  y: number;
  dataX: number;
  dataY: number;
}

/** Axis tick mark */
export interface AxisTick {
  position: number;
  label: string;
  value: number;
}

/** Color stop for gradient rendering */
export interface ColorStop {
  offset: number;
  color: string;
}

/** Chart component base props */
export interface BaseChartProps {
  series: DataSeries[];
  width?: number;
  height?: number;
  className?: string;
  showGrid?: boolean;
  showAxes?: boolean;
  animate?: boolean;
}

/** Line chart specific props */
export interface LineChartProps extends BaseChartProps {
  smooth?: boolean;
  fillArea?: boolean;
  showPoints?: boolean;
}

/** Bar chart specific props */
export interface BarChartProps extends BaseChartProps {
  stacked?: boolean;
  horizontal?: boolean;
}

/** Scatter plot specific props */
export interface ScatterPlotProps extends BaseChartProps {
  pointRadius?: number;
  showDensity?: boolean;
}

/** Heatmap specific props */
export interface HeatmapProps {
  data: HeatmapCell[][];
  rows: number;
  cols: number;
  colorScale?: ColorStop[];
  width?: number;
  height?: number;
  className?: string;
}

/** Virtual scroll state */
export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  visibleRows: TableRow[];
  offsetY: number;
}
