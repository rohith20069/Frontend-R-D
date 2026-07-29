// ============================================================
// hooks/useChartRenderer.ts
// Core hook that manages the canvas lifecycle for any chart.
// Provides: canvas ref, ctx ref, RAF loop, resize observer,
// high-DPI scaling, and a dirty-flag rendering optimization.
// ============================================================
'use client';

import { useRef, useEffect, useCallback, RefObject } from 'react';
import { scaleCanvasForDPI } from '@/lib/canvasUtils';
import { FPSCounter } from '@/lib/performanceUtils';

export interface ChartRendererOptions {
  /** Called every animation frame. Must draw the chart. */
  onRender: (ctx: CanvasRenderingContext2D, width: number, height: number, timestamp: number) => void;
  /** Called when the canvas is resized. */
  onResize?: (width: number, height: number) => void;
  /** Disable the RAF loop and only render when markDirty() is called */
  onDemand?: boolean;
}

export interface ChartRendererResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Call to force a redraw on the next animation frame */
  markDirty: () => void;
  /** Current FPS (updated on each frame) */
  fps: number;
}

/**
 * useChartRenderer — the heart of every chart.
 *
 * Design decisions:
 * - Uses a dirty flag to skip renders when nothing changed (saves GPU time)
 * - ResizeObserver replaces window.resize for element-level precision
 * - devicePixelRatio is re-checked on resize for external monitor changes
 * - Canvas context is obtained once and stored in a ref (no re-creation)
 */
export function useChartRenderer(options: ChartRendererOptions): ChartRendererResult {
  const { onRender, onResize, onDemand = false } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const dirtyRef = useRef<boolean>(true);
  const fpsCounterRef = useRef(new FPSCounter(120));
  const fpsRef = useRef(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  // Expose fps through a ref (no state = no re-render)
  const onRenderRef = useRef(onRender);
  const onResizeRef = useRef(onResize);
  useEffect(() => {
    onRenderRef.current = onRender;
  }, [onRender]);
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get 2D context with willReadFrequently=false for compositing perf
    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true });
    if (!ctx) return;
    ctxRef.current = ctx;

    /** Set canvas size and scale for DPI */
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w === dimensionsRef.current.width && h === dimensionsRef.current.height) return;
      dimensionsRef.current = { width: w, height: h };
      scaleCanvasForDPI(canvas, ctx, w, h);
      dirtyRef.current = true;
      onResizeRef.current?.(w, h);
    };

    // Initial size
    resize();

    /** RAF render loop */
    const loop = (timestamp: number) => {
      rafIdRef.current = requestAnimationFrame(loop);

      // Dirty flag: skip rendering if nothing changed (saves ~16ms per frame)
      if (!onDemand || dirtyRef.current) {
        dirtyRef.current = false;
        fpsRef.current = fpsCounterRef.current.tick(timestamp);
        const { width, height } = dimensionsRef.current;
        if (width > 0 && height > 0) {
          onRenderRef.current(ctx, width, height, timestamp);
        }
      }
    };

    rafIdRef.current = requestAnimationFrame(loop);

    /** ResizeObserver for container size changes */
    const ro = new ResizeObserver(() => resize());
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDemand]);

  return {
    canvasRef,
    markDirty,
    fps: fpsRef.current,
  };
}
