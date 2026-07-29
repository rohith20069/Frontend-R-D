// ============================================================
// hooks/useDataStream.ts
// Manages the real-time data stream with a sliding window.
// Generates data every 100ms using setInterval.
// Uses a CircularBuffer to enforce bounded memory usage.
// ============================================================
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { generateBatch, generateInitialData, SERIES_CONFIGS } from '@/lib/dataGenerator';
import { CircularBuffer, createStopwatch } from '@/lib/performanceUtils';
import type { DataPoint, DataSeries, StressMode } from '@/lib/types';

/** Max data points per series in normal mode */
const WINDOW_SIZES: Record<StressMode, number> = {
  normal: 10_000,
  stress: 50_000,
  extreme: 100_000,
};

const INTERVAL_MS = 100;

interface DataStreamResult {
  series: DataSeries[];
  rawPoints: DataPoint[];
  isStreaming: boolean;
  processingTimeMs: number;
  toggleStreaming: () => void;
  reset: () => void;
}

export function useDataStream(stressMode: StressMode): DataStreamResult {
  const maxPoints = WINDOW_SIZES[stressMode];

  // One circular buffer per series for O(1) push + bounded memory
  const buffersRef = useRef<Map<string, CircularBuffer<DataPoint>>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStreamingRef = useRef(true);
  const processingTimeRef = useRef(0);

  const [series, setSeries] = useState<DataSeries[]>(() => {
    // Return empty state initially to match server and client hydration
    const buffers = new Map<string, CircularBuffer<DataPoint>>();
    const initialSeries = SERIES_CONFIGS.map((cfg) => {
      buffers.set(cfg.id, new CircularBuffer<DataPoint>(maxPoints));
      return {
        id: cfg.id,
        name: cfg.name,
        color: cfg.color,
        visible: true,
        data: [],
      };
    });
    buffersRef.current = buffers;
    return initialSeries;
  });

  // Generate initial data on the client side after mount to avoid hydration mismatch
  useEffect(() => {
    const initial = generateInitialData(60_000, INTERVAL_MS);
    const buffers = buffersRef.current;
    
    setSeries((prev) => 
      prev.map(s => {
        const buf = buffers.get(s.id);
        if (!buf) return s;
        const pts = initial.filter((p) => p.series === s.id);
        buf.pushMany(pts);
        return { ...s, data: buf.toArray() };
      })
    );
  }, []);

  const [isStreaming, setIsStreaming] = useState(true);

  /** Ensure buffers are recreated when stressMode changes */
  useEffect(() => {
    const newBuffers = new Map<string, CircularBuffer<DataPoint>>();
    SERIES_CONFIGS.forEach((cfg) => {
      const old = buffersRef.current.get(cfg.id);
      const buf = new CircularBuffer<DataPoint>(maxPoints);
      if (old) buf.pushMany(old.toArray().slice(-maxPoints));
      newBuffers.set(cfg.id, buf);
    });
    buffersRef.current = newBuffers;
  }, [maxPoints]);

  const tick = useCallback(() => {
    if (!isStreamingRef.current) return;
    const stopwatch = createStopwatch();
    const now = Date.now();
    const batch = generateBatch(now);

    const buffers = buffersRef.current;
    batch.forEach((point) => {
      buffers.get(point.series)?.push(point);
    });

    processingTimeRef.current = stopwatch();

    // Update React state — use functional update to avoid stale closure
    setSeries((prev) =>
      prev.map((s) => {
        const buf = buffers.get(s.id);
        if (!buf) return s;
        // Only create a new array reference (triggers re-render)
        return { ...s, data: buf.toArray() };
      })
    );
  }, []);

  useEffect(() => {
    // Start the data stream
    intervalRef.current = setInterval(tick, INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tick]);

  const toggleStreaming = useCallback(() => {
    isStreamingRef.current = !isStreamingRef.current;
    setIsStreaming(isStreamingRef.current);
  }, []);

  const reset = useCallback(() => {
    const buffers = buffersRef.current;
    buffers.forEach((buf) => buf.clear());
    setSeries((prev) => prev.map((s) => ({ ...s, data: [] })));
  }, []);

  // Flatten all series data into a single array (for table display)
  const rawPoints = series.flatMap((s) => s.data);

  return {
    series,
    rawPoints,
    isStreaming,
    processingTimeMs: processingTimeRef.current,
    toggleStreaming,
    reset,
  };
}
