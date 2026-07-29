// ============================================================
// hooks/usePerformanceMonitor.ts
// Tracks FPS, memory, render time and dropped frames.
// Updates on a separate RAF loop to avoid coupling with charts.
// ============================================================
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FPSCounter, getMemoryUsageMB, RollingAverage } from '@/lib/performanceUtils';
import type { PerformanceMetrics } from '@/lib/types';

const SAMPLE_INTERVAL_MS = 500; // update display every 500ms

export function usePerformanceMonitor(dataPointCount: number) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryMB: 0,
    renderTimeMs: 0,
    processingTimeMs: 0,
    droppedFrames: 0,
    dataPointCount: 0,
    timestamp: Date.now(),
  });

  const fpsCounterRef = useRef(new FPSCounter(120));
  const renderTimeAvgRef = useRef(new RollingAverage(60));
  const processingTimeAvgRef = useRef(new RollingAverage(60));
  const rafIdRef = useRef<number | null>(null);
  const lastSampleRef = useRef(0);
  // Use a ref to avoid recreating the RAF loop on every data change
  const dataPointCountRef = useRef(dataPointCount);
  dataPointCountRef.current = dataPointCount;

  const recordRenderTime = useCallback((ms: number) => {
    renderTimeAvgRef.current.push(ms);
  }, []);

  const recordProcessingTime = useCallback((ms: number) => {
    processingTimeAvgRef.current.push(ms);
  }, []);

  useEffect(() => {
    const loop = (timestamp: number) => {
      rafIdRef.current = requestAnimationFrame(loop);
      fpsCounterRef.current.tick(timestamp);

      // Only update state every SAMPLE_INTERVAL_MS to avoid flooding React
      if (timestamp - lastSampleRef.current >= SAMPLE_INTERVAL_MS) {
        lastSampleRef.current = timestamp;
        setMetrics({
          fps: fpsCounterRef.current.currentFPS,
          memoryMB: getMemoryUsageMB(),
          renderTimeMs: parseFloat(renderTimeAvgRef.current.average.toFixed(2)),
          processingTimeMs: parseFloat(processingTimeAvgRef.current.average.toFixed(2)),
          droppedFrames: fpsCounterRef.current.droppedFrameCount,
          dataPointCount: dataPointCountRef.current,
          timestamp: Date.now(),
        });
      }
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
    // Empty deps — RAF loop runs once and uses refs for all changing values
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { metrics, recordRenderTime, recordProcessingTime };
}

