// ============================================================
// hooks/useVirtualization.ts
// Custom virtual scrolling — renders only the visible rows.
// No external libraries. Uses scrollTop + row height math.
// Optimized to not trigger rapid re-renders from streaming data.
// ============================================================
'use client';

import { useRef, useState, useCallback, useLayoutEffect } from 'react';
import type { TableRow, VirtualScrollState } from '@/lib/types';

interface VirtualizationOptions {
  rowHeight: number;
  /** Number of extra rows to render above/below viewport for smoother scroll */
  overscan?: number;
  containerHeight: number;
}

/**
 * useVirtualization computes which rows are visible given the scroll position.
 *
 * Design:
 * - All row data is accessed through refs to avoid stale closures
 * - State updates are triggered by scroll events OR layout effects
 * - Uses useLayoutEffect for synchronous initial sizing (avoids flash)
 * - Only renders visible rows + overscan padding
 */
export function useVirtualization(
  rows: TableRow[],
  options: VirtualizationOptions
): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  state: VirtualScrollState;
  onScroll: () => void;
} {
  const { rowHeight, overscan = 5, containerHeight } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);

  // All mutable values go through refs — computeState is stable forever
  const rowsRef = useRef<TableRow[]>(rows);
  const rowHeightRef = useRef(rowHeight);
  const overscanRef = useRef(overscan);
  const containerHeightRef = useRef(containerHeight);
  const prevRowsLenRef = useRef(rows.length);

  // Sync refs without triggering effects
  rowsRef.current = rows;
  rowHeightRef.current = rowHeight;
  overscanRef.current = overscan;
  containerHeightRef.current = containerHeight;

  /** Stable compute function — never changes reference */
  const computeState = useCallback((scrollTop: number): VirtualScrollState => {
    const totalRows = rowsRef.current.length;
    const rh = rowHeightRef.current;
    const os = overscanRef.current;
    const ch = containerHeightRef.current;

    const visibleCount = Math.ceil(ch / rh) + 1;
    const startIndex = Math.max(0, Math.floor(scrollTop / rh) - os);
    const endIndex = Math.min(totalRows - 1, startIndex + visibleCount + os * 2);

    return {
      startIndex,
      endIndex,
      totalHeight: totalRows * rh,
      visibleRows: rowsRef.current.slice(startIndex, endIndex + 1),
      offsetY: startIndex * rh,
    };
  }, []); // Empty deps — stable forever, uses refs

  const [state, setState] = useState<VirtualScrollState>(() => computeState(0));

  // Update state when row count changes significantly (batched via layout effect)
  useLayoutEffect(() => {
    const newLen = rows.length;
    // Only update if row count changed meaningfully (avoid update on every 100ms tick)
    if (Math.abs(newLen - prevRowsLenRef.current) >= 4) {
      prevRowsLenRef.current = newLen;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      setState(computeState(scrollTop));
    }
  }); // No deps = runs after every render, but is gated by the length check

  const onScroll = useCallback(() => {
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    setState(computeState(scrollTop));
  }, [computeState]);

  return { containerRef, state, onScroll };
}
