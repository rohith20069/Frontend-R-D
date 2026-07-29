// ============================================================
// lib/dataGenerator.ts
// High-performance random data generation using a seeded PRNG.
// Uses a mulberry32 algorithm for deterministic, fast generation
// without Math.random() overhead in hot paths.
// ============================================================

import type { DataPoint, DataSeries, AggregatedPoint, AggregationLevel } from './types';

/** Mulberry32 seeded PRNG — faster than Math.random() in tight loops */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(Date.now() ^ 0xdeadbeef);

/** Series configuration for generation */
interface SeriesConfig {
  id: string;
  name: string;
  color: string;
  baseValue: number;
  volatility: number;
  trend: number;
}

export const SERIES_CONFIGS: SeriesConfig[] = [
  { id: 'series-a', name: 'Alpha', color: '#00d4ff', baseValue: 100, volatility: 5, trend: 0.01 },
  { id: 'series-b', name: 'Beta', color: '#ff6b35', baseValue: 200, volatility: 8, trend: -0.005 },
  { id: 'series-c', name: 'Gamma', color: '#7fff6f', baseValue: 150, volatility: 3, trend: 0.008 },
  { id: 'series-d', name: 'Delta', color: '#ff4da6', baseValue: 80, volatility: 10, trend: 0.002 },
];

/** Per-series state for realistic simulation (Geometric Brownian Motion) */
const seriesState: Map<string, number> = new Map(
  SERIES_CONFIGS.map((c) => [c.id, c.baseValue])
);

/**
 * Generate a single data point using GBM (Geometric Brownian Motion).
 * This produces realistic-looking financial/sensor data with drift + noise.
 */
export function generateDataPoint(config: SeriesConfig, timestamp: number): DataPoint {
  const current = seriesState.get(config.id) ?? config.baseValue;
  // GBM: next = current * exp((μ - σ²/2) * dt + σ * W)
  const dt = 0.1; // 100ms normalized to 0.1s
  const drift = (config.trend - (config.volatility ** 2) / 20000) * dt;
  const diffusion = (config.volatility / 100) * Math.sqrt(dt) * normalRandom();
  const next = Math.max(1, current * Math.exp(drift + diffusion));
  seriesState.set(config.id, next);

  return {
    timestamp,
    value: parseFloat(next.toFixed(4)),
    series: config.id,
  };
}

/**
 * Box-Muller transform to get normally distributed random numbers.
 * Required for the GBM simulation.
 */
function normalRandom(): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Generate a batch of data points for all series at a given timestamp.
 * Used in the data stream loop (every 100ms).
 */
export function generateBatch(timestamp: number): DataPoint[] {
  return SERIES_CONFIGS.map((config) => generateDataPoint(config, timestamp));
}

/**
 * Generate initial historical data to pre-fill the sliding window.
 * Called once on startup to avoid empty charts.
 */
export function generateInitialData(
  windowSizeMs: number,
  intervalMs: number = 100
): DataPoint[] {
  const points: DataPoint[] = [];
  const now = Date.now();
  const count = Math.floor(windowSizeMs / intervalMs);

  for (let i = count; i >= 0; i--) {
    const ts = now - i * intervalMs;
    SERIES_CONFIGS.forEach((config) => {
      points.push(generateDataPoint(config, ts));
    });
  }

  return points;
}

/**
 * Aggregate raw data points into OHLCV candles at a given time resolution.
 * Optimized for large datasets: single-pass O(n) aggregation.
 */
export function aggregatePoints(
  points: DataPoint[],
  level: AggregationLevel
): Map<string, AggregatedPoint[]> {
  if (level === 'raw' || points.length === 0) return new Map();

  const bucketMs: Record<Exclude<AggregationLevel, 'raw'>, number> = {
    '1m': 60_000,
    '5m': 300_000,
    '1h': 3_600_000,
  };

  const bucket = bucketMs[level as Exclude<AggregationLevel, 'raw'>];
  const result = new Map<string, Map<number, AggregatedPoint>>();

  for (const point of points) {
    const bucketKey = Math.floor(point.timestamp / bucket) * bucket;

    if (!result.has(point.series)) {
      result.set(point.series, new Map());
    }
    const seriesMap = result.get(point.series)!;

    if (!seriesMap.has(bucketKey)) {
      seriesMap.set(bucketKey, {
        timestamp: bucketKey,
        open: point.value,
        high: point.value,
        low: point.value,
        close: point.value,
        avg: point.value,
        count: 1,
      });
    } else {
      const agg = seriesMap.get(bucketKey)!;
      agg.high = Math.max(agg.high, point.value);
      agg.low = Math.min(agg.low, point.value);
      agg.close = point.value;
      // Incremental average: newAvg = oldAvg + (x - oldAvg) / n
      agg.count++;
      agg.avg += (point.value - agg.avg) / agg.count;
    }
  }

  const out = new Map<string, AggregatedPoint[]>();
  for (const [series, bucketMap] of result) {
    out.set(series, Array.from(bucketMap.values()).sort((a, b) => a.timestamp - b.timestamp));
  }
  return out;
}

/**
 * Initialize all series with empty data arrays.
 */
export function createInitialSeries(): DataSeries[] {
  return SERIES_CONFIGS.map((config) => ({
    id: config.id,
    name: config.name,
    color: config.color,
    visible: true,
    data: [],
  }));
}

// Re-export for convenient access
export type { DataSeries, DataPoint, AggregatedPoint };
