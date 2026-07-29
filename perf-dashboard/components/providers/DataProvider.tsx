// ============================================================
// components/providers/DataProvider.tsx
// Global context provider wrapping the entire dashboard.
// Manages: data series, filter state, aggregation, metrics.
// ============================================================
'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  useTransition,
} from 'react';
import { useDataStream } from '@/hooks/useDataStream';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { aggregatePoints } from '@/lib/dataGenerator';
import type {
  DataContextValue,
  DataSeries,
  FilterState,
  TimeRange,
  AggregationLevel,
  StressMode,
} from '@/lib/types';

// ─── Context ────────────────────────────────────────────────

const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataContext must be used inside <DataProvider>');
  return ctx;
}

// ─── Reducer ────────────────────────────────────────────────

type FilterAction =
  | { type: 'TOGGLE_SERIES'; id: string }
  | { type: 'SET_TIME_RANGE'; range: TimeRange }
  | { type: 'SET_AGGREGATION'; level: AggregationLevel }
  | { type: 'SET_STRESS'; mode: StressMode }
  | { type: 'RESET_FILTERS' };

const initialFilter: FilterState = {
  visibleSeries: new Set(['series-a', 'series-b', 'series-c', 'series-d']),
  timeRange: '5m',
  aggregation: 'raw',
  stressMode: 'normal',
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'TOGGLE_SERIES': {
      const next = new Set(state.visibleSeries);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, visibleSeries: next };
    }
    case 'SET_TIME_RANGE':
      return { ...state, timeRange: action.range };
    case 'SET_AGGREGATION':
      return { ...state, aggregation: action.level };
    case 'SET_STRESS':
      return { ...state, stressMode: action.mode };
    case 'RESET_FILTERS':
      return initialFilter;
    default:
      return state;
  }
}

// ─── Provider ────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [filterState, dispatch] = useReducer(filterReducer, initialFilter);
  const [, startTransition] = useTransition();

  const { series: allSeries, rawPoints, isStreaming, processingTimeMs, toggleStreaming } =
    useDataStream(filterState.stressMode);

  const { metrics } = usePerformanceMonitor(rawPoints.length);

  // ── Filter by time range ──────────────────────────────────
  const timeRangeMs: Record<TimeRange, number> = {
    '1m': 60_000,
    '5m': 300_000,
    '15m': 900_000,
    '1h': 3_600_000,
    '6h': 21_600_000,
    '24h': 86_400_000,
  };

  // useMemo: only recompute when series or filter changes
  const filteredSeries = useMemo<DataSeries[]>(() => {
    const cutoff = Date.now() - timeRangeMs[filterState.timeRange];
    return allSeries
      .filter((s) => filterState.visibleSeries.has(s.id))
      .map((s) => ({
        ...s,
        visible: true,
        // Slice from the end for performance (data is already sorted by time)
        data: s.data.filter((p) => p.timestamp >= cutoff),
      }));
  }, [allSeries, filterState.visibleSeries, filterState.timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const aggregatedPoints = useMemo(
    () =>
      filterState.aggregation !== 'raw'
        ? aggregatePoints(rawPoints, filterState.aggregation)
        : new Map(),
    [rawPoints, filterState.aggregation]
  );

  // ── Action callbacks (stable references via useCallback) ──

  const toggleSeries = useCallback((id: string) => {
    startTransition(() => dispatch({ type: 'TOGGLE_SERIES', id }));
  }, []);

  const setTimeRange = useCallback((range: TimeRange) => {
    startTransition(() => dispatch({ type: 'SET_TIME_RANGE', range }));
  }, []);

  const setAggregation = useCallback((level: AggregationLevel) => {
    startTransition(() => dispatch({ type: 'SET_AGGREGATION', level }));
  }, []);

  const setStressMode = useCallback((mode: StressMode) => {
    startTransition(() => dispatch({ type: 'SET_STRESS', mode }));
  }, []);

  const resetZoom = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const metricsWithProcessing = useMemo(
    () => ({ ...metrics, processingTimeMs }),
    [metrics, processingTimeMs]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      series: filteredSeries,
      rawPoints,
      aggregatedPoints,
      filterState,
      metrics: metricsWithProcessing,
      isStreaming,
      toggleSeries,
      setTimeRange,
      setAggregation,
      setStressMode,
      toggleStreaming,
      resetZoom,
    }),
    [
      filteredSeries,
      rawPoints,
      aggregatedPoints,
      filterState,
      metricsWithProcessing,
      isStreaming,
      toggleSeries,
      setTimeRange,
      setAggregation,
      setStressMode,
      toggleStreaming,
      resetZoom,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
