// ============================================================
// components/ui/PerformanceMonitor.tsx
// Live metrics display: FPS, memory, render/process time,
// dropped frames, data point count.
// Uses CSS animations for the "live" indicator pulse.
// ============================================================
'use client';

import React, { memo } from 'react';
import { useDataContext } from '@/components/providers/DataProvider';
import styles from './UI.module.css';

const PerformanceMonitor = memo(function PerformanceMonitor() {
  const { metrics, isStreaming } = useDataContext();

  const fpsColor =
    metrics.fps >= 55 ? '#7fff6f' :
    metrics.fps >= 30 ? '#ffaa00' : '#ff4444';

  const memColor =
    metrics.memoryMB < 100 ? '#7fff6f' :
    metrics.memoryMB < 300 ? '#ffaa00' : '#ff4444';

  return (
    <div className={styles.perfMonitor} suppressHydrationWarning>
      <div className={styles.perfHeader}>
        <span className={styles.perfTitle}>Performance</span>
        <span
          className={`${styles.liveIndicator} ${isStreaming ? styles.liveActive : ''}`}
        >
          {isStreaming ? '● LIVE' : '○ PAUSED'}
        </span>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          label="FPS"
          value={metrics.fps.toString()}
          unit="fps"
          color={fpsColor}
          bar={(metrics.fps / 60) * 100}
        />
        <MetricCard
          label="Memory"
          value={metrics.memoryMB.toFixed(1)}
          unit="MB"
          color={memColor}
          bar={Math.min(100, (metrics.memoryMB / 500) * 100)}
        />
        <MetricCard
          label="Render"
          value={metrics.renderTimeMs.toFixed(1)}
          unit="ms"
          color="#00d4ff"
          bar={Math.min(100, (metrics.renderTimeMs / 16.6) * 100)}
        />
        <MetricCard
          label="Process"
          value={metrics.processingTimeMs.toFixed(1)}
          unit="ms"
          color="#ff6b35"
          bar={Math.min(100, (metrics.processingTimeMs / 100) * 100)}
        />
        <MetricCard
          label="Dropped"
          value={metrics.droppedFrames.toString()}
          unit="frames"
          color={metrics.droppedFrames === 0 ? '#7fff6f' : '#ff4444'}
          bar={0}
        />
        <MetricCard
          label="Points"
          value={
            metrics.dataPointCount >= 1_000_000
              ? `${(metrics.dataPointCount / 1_000_000).toFixed(1)}M`
              : metrics.dataPointCount >= 1_000
              ? `${(metrics.dataPointCount / 1_000).toFixed(1)}K`
              : metrics.dataPointCount.toString()
          }
          unit="total"
          color="#a78bfa"
          bar={0}
        />
      </div>
    </div>
  );
});

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
  bar: number;
}

const MetricCard = memo(function MetricCard({
  label,
  value,
  unit,
  color,
  bar,
}: MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} style={{ color }}>
        {value}
        <span className={styles.metricUnit}>{unit}</span>
      </div>
      {bar > 0 && (
        <div className={styles.metricBar}>
          <div
            className={styles.metricBarFill}
            style={{ width: `${bar}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
});

export default PerformanceMonitor;
