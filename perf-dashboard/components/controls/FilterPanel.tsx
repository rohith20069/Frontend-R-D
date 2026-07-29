// ============================================================
// components/controls/FilterPanel.tsx
// Controls for toggling series visibility, stress mode,
// streaming state, and zoom reset.
// ============================================================
'use client';

import React, { memo } from 'react';
import { useDataContext } from '@/components/providers/DataProvider';
import type { StressMode } from '@/lib/types';
import styles from './Controls.module.css';

const STRESS_MODES: { label: string; value: StressMode; points: string }[] = [
  { label: 'Normal', value: 'normal', points: '10K' },
  { label: 'Stress', value: 'stress', points: '50K' },
  { label: 'Extreme', value: 'extreme', points: '100K' },
];

const FilterPanel = memo(function FilterPanel() {
  const {
    series,
    filterState,
    isStreaming,
    toggleSeries,
    setStressMode,
    toggleStreaming,
    resetZoom,
  } = useDataContext();

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Data Series</h3>
        <div className={styles.seriesList}>
          {series.map((s) => (
            <button
              key={s.id}
              className={`${styles.seriesToggle} ${
                filterState.visibleSeries.has(s.id) ? styles.seriesActive : styles.seriesInactive
              }`}
              onClick={() => toggleSeries(s.id)}
              aria-pressed={filterState.visibleSeries.has(s.id)}
            >
              <span
                className={styles.seriesColor}
                style={{ background: s.color }}
              />
              <span className={styles.seriesName}>{s.name}</span>
              <span className={styles.seriesCount}>
                {s.data.length.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Stress Mode</h3>
        <div className={styles.buttonGroup}>
          {STRESS_MODES.map(({ label, value, points }) => (
            <button
              key={value}
              className={`${styles.modeButton} ${
                filterState.stressMode === value ? styles.modeActive : ''
              }`}
              onClick={() => setStressMode(value)}
            >
              <span className={styles.modeLabel}>{label}</span>
              <span className={styles.modePoints}>{points} pts</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Controls</h3>
        <div className={styles.controlButtons}>
          <button
            className={`${styles.controlBtn} ${isStreaming ? styles.btnDanger : styles.btnSuccess}`}
            onClick={toggleStreaming}
          >
            {isStreaming ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button
            className={`${styles.controlBtn} ${styles.btnSecondary}`}
            onClick={resetZoom}
          >
            ↺ Reset
          </button>
        </div>
      </div>
    </div>
  );
});

export default FilterPanel;
