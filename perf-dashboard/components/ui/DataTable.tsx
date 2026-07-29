// ============================================================
// components/ui/DataTable.tsx
// Virtual-scrolling data table without any external libraries.
// Only renders rows visible in the viewport + overscan.
// Handles 100,000+ rows smoothly.
// ============================================================
'use client';

import React, { useMemo, memo, useCallback, useDeferredValue } from 'react';
import { useVirtualization } from '@/hooks/useVirtualization';
import type { DataSeries, TableRow } from '@/lib/types';
import { formatValue, formatTimestamp } from '@/lib/canvasUtils';
import styles from './UI.module.css';

const ROW_HEIGHT = 32;
const CONTAINER_HEIGHT = 300;
const MAX_TABLE_ROWS = 5_000; // Cap for table performance

interface DataTableProps {
  series: DataSeries[];
}

const DataTable = memo(function DataTable({ series }: DataTableProps) {
  // useDeferredValue: table updates are lower priority than chart renders
  const deferredSeries = useDeferredValue(series);

  // Flatten and sort all data points into table rows
  const rows = useMemo<TableRow[]>(() => {
    const allPoints = deferredSeries
      .filter((s) => s.visible)
      .flatMap((s) =>
        s.data.map((p) => ({
          seriesName: s.name,
          ...p,
        }))
      )
      // Sort descending by timestamp (most recent first)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_TABLE_ROWS);

    return allPoints.map((p, i) => {
      const prevIdx = i + 1;
      const prevVal =
        prevIdx < allPoints.length && allPoints[prevIdx].series === p.series
          ? allPoints[prevIdx].value
          : p.value;
      const change = p.value - prevVal;
      const changePct = prevVal !== 0 ? ((change / prevVal) * 100).toFixed(2) : '0.00';

      return {
        id: i,
        timestamp: formatTimestamp(p.timestamp),
        series: p.seriesName,
        value: formatValue(p.value),
        change: `${change >= 0 ? '+' : ''}${changePct}%`,
        changeType: change > 0.001 ? 'positive' : change < -0.001 ? 'negative' : 'neutral',
      };
    });
  }, [series]);

  const { containerRef, state, onScroll } = useVirtualization(rows, {
    rowHeight: ROW_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 8,
  });

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableHeader}>
        <div className={styles.tableTitle}>
          Data Stream
          <span className={styles.tableCount}>{rows.length.toLocaleString()} rows</span>
        </div>
      </div>

      {/* Column headers */}
      <div className={styles.tableColHeaders}>
        <div className={styles.col} style={{ width: '22%' }}>Timestamp</div>
        <div className={styles.col} style={{ width: '18%' }}>Series</div>
        <div className={styles.col} style={{ width: '30%', textAlign: 'right' }}>Value</div>
        <div className={styles.col} style={{ width: '30%', textAlign: 'right' }}>Change</div>
      </div>

      {/* Scrollable virtual container */}
      <div
        ref={containerRef}
        className={styles.tableContainer}
        style={{ height: CONTAINER_HEIGHT }}
        onScroll={onScroll}
      >
        {/* Spacer that gives the scrollbar full height */}
        <div style={{ height: state.totalHeight, position: 'relative' }}>
          {/* Only the visible rows are rendered */}
          <div
            style={{
              position: 'absolute',
              top: state.offsetY,
              width: '100%',
            }}
          >
            {state.visibleRows.map((row) => (
              <TableRowItem key={row.id} row={row} height={ROW_HEIGHT} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

interface TableRowItemProps {
  row: TableRow;
  height: number;
}

const TableRowItem = memo(function TableRowItem({ row, height }: TableRowItemProps) {
  const changeStyle =
    row.changeType === 'positive'
      ? styles.changePositive
      : row.changeType === 'negative'
      ? styles.changeNegative
      : styles.changeNeutral;

  return (
    <div className={styles.tableRow} style={{ height }}>
      <div className={styles.col} style={{ width: '22%' }}>
        {row.timestamp}
      </div>
      <div className={styles.col} style={{ width: '18%' }}>
        <span className={styles.seriesBadge}>{row.series}</span>
      </div>
      <div className={`${styles.col} ${styles.valueCol}`} style={{ width: '30%' }}>
        {row.value}
      </div>
      <div className={`${styles.col} ${changeStyle}`} style={{ width: '30%', textAlign: 'right' }}>
        {row.change}
      </div>
    </div>
  );
});

export default DataTable;
