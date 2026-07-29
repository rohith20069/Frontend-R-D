// ============================================================
// components/controls/TimeRangeSelector.tsx
// Time range and aggregation controls.
// ============================================================
'use client';

import React, { memo } from 'react';
import { useDataContext } from '@/components/providers/DataProvider';
import type { TimeRange, AggregationLevel } from '@/lib/types';
import styles from './Controls.module.css';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
];

const AGGREGATIONS: { label: string; value: AggregationLevel }[] = [
  { label: 'Raw', value: 'raw' },
  { label: '1 min', value: '1m' },
  { label: '5 min', value: '5m' },
  { label: '1 hr', value: '1h' },
];

const TimeRangeSelector = memo(function TimeRangeSelector() {
  const { filterState, setTimeRange, setAggregation } = useDataContext();

  return (
    <div className={styles.timeRangeBar}>
      <div className={styles.timeGroup}>
        <span className={styles.groupLabel}>Range</span>
        <div className={styles.pillGroup}>
          {TIME_RANGES.map(({ label, value }) => (
            <button
              key={value}
              className={`${styles.pill} ${
                filterState.timeRange === value ? styles.pillActive : ''
              }`}
              onClick={() => setTimeRange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.timeGroup}>
        <span className={styles.groupLabel}>Aggregation</span>
        <div className={styles.pillGroup}>
          {AGGREGATIONS.map(({ label, value }) => (
            <button
              key={value}
              className={`${styles.pill} ${
                filterState.aggregation === value ? styles.pillActive : ''
              }`}
              onClick={() => setAggregation(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default TimeRangeSelector;
