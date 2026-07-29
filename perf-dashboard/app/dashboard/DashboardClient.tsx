// ============================================================
// app/dashboard/DashboardClient.tsx
// The main client-side dashboard shell.
// Composes all charts, controls, table, and monitor.
// ============================================================
'use client';

import React, { useMemo, memo, useState, useEffect } from 'react';
import { useDataContext } from '@/components/providers/DataProvider';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import ScatterPlot from '@/components/charts/ScatterPlot';
import Heatmap, { buildHeatmapData } from '@/components/charts/Heatmap';
import FilterPanel from '@/components/controls/FilterPanel';
import TimeRangeSelector from '@/components/controls/TimeRangeSelector';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import DataTable from '@/components/ui/DataTable';
import styles from './Dashboard.module.css';

// ─── Statistics Cards ─────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  change?: string;
  positive?: boolean;
  color: string;
  icon: string;
}

const StatCard = memo(function StatCard({
  label, value, subValue, change, positive, color, icon,
}: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color }}>
        {value}
      </div>
      {subValue && <div className={styles.statSubValue}>{subValue}</div>}
      {change && (
        <div className={`${styles.statChange} ${positive ? styles.statChangePos : styles.statChangeNeg}`}>
          {positive ? '▲' : '▼'} {change}
        </div>
      )}
      <div className={styles.statGlow} style={{ background: color }} />
    </div>
  );
});

// ─── Main Dashboard ───────────────────────────────────────

const DashboardClient = memo(function DashboardClient() {
  const { series, rawPoints, metrics, filterState } = useDataContext();

  // Prevent hydration mismatch: only show live data after client mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Heatmap data ──────────────────────────────────────
  const heatmapData = useMemo(() => {
    const seriesValues = series
      .filter((s) => s.visible)
      .map((s) => s.data.slice(-500).map((p) => p.value));
    return buildHeatmapData(seriesValues, 20);
  }, [series]);

  // ── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const visible = series.filter((s) => s.visible && s.data.length > 0);
    return visible.map((s) => {
      const last = s.data[s.data.length - 1]?.value ?? 0;
      const prev = s.data[s.data.length - 2]?.value ?? last;
      const pct = prev !== 0 ? (((last - prev) / prev) * 100).toFixed(2) : '0.00';
      const positive = last >= prev;
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        value: last.toFixed(2),
        change: `${pct}%`,
        positive,
        count: s.data.length.toLocaleString(),
      };
    });
  }, [series]);

  return (
    <div className={styles.root}>
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>PerfViz</span>
        </div>
        <nav className={styles.sidebarNav}>
          <a href="#charts" className={`${styles.navItem} ${styles.navActive}`}>
            <span>📊</span> Charts
          </a>
          <a href="#data" className={`${styles.navItem}`}>
            <span>📋</span> Data
          </a>
          <a href="#perf" className={`${styles.navItem}`}>
            <span>⚡</span> Performance
          </a>
        </nav>
        <div className={styles.sidebarFilter}>
          <FilterPanel />
        </div>
        <div className={styles.sidebarPerf} id="perf">
          <PerformanceMonitor />
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.headerTitle}>
              Real-Time Analytics
            </h1>
            <span className={styles.headerSubtitle} suppressHydrationWarning>
              {mounted ? `${rawPoints.length.toLocaleString()} data points · ${metrics.fps} FPS · ${filterState.timeRange} window` : 'Loading...'}
            </span>
          </div>
          <div className={styles.headerRight}>
            <TimeRangeSelector />
          </div>
        </header>

        {/* Stats Row */}
        <section className={styles.statsRow}>
          {mounted && stats.map((s) => (
            <StatCard
              key={s.id}
              icon="◉"
              label={s.name}
              value={s.value}
              subValue={`${s.count} pts`}
              change={s.change}
              positive={s.positive}
              color={s.color}
            />
          ))}
        </section>

        {/* Chart Grid */}
        <section className={styles.chartGrid} id="charts">
          {/* Line Chart — spans full width */}
          <div className={styles.chartCardFull}>
            <div className={styles.chartCardHeader}>
              <span className={styles.chartCardTitle}>Line Chart</span>
              <span className={styles.chartCardMeta}>
                Smooth • Area Fill • Pan/Zoom
              </span>
            </div>
            <div className={styles.chartBody}>
              <LineChart series={series} smooth fillArea showGrid showAxes />
            </div>
          </div>

          {/* Bar Chart */}
          <div className={styles.chartCardHalf}>
            <div className={styles.chartCardHeader}>
              <span className={styles.chartCardTitle}>Bar Chart</span>
              <span className={styles.chartCardMeta}>Last 60 ticks</span>
            </div>
            <div className={styles.chartBody}>
              <BarChart series={series} showGrid showAxes />
            </div>
          </div>

          {/* Scatter Plot */}
          <div className={styles.chartCardHalf}>
            <div className={styles.chartCardHeader}>
              <span className={styles.chartCardTitle}>Scatter Plot</span>
              <span className={styles.chartCardMeta}>5K points/series</span>
            </div>
            <div className={styles.chartBody}>
              <ScatterPlot series={series} pointRadius={2.5} showGrid showAxes />
            </div>
          </div>

          {/* Heatmap */}
          <div className={styles.chartCardHalf}>
            <div className={styles.chartCardHeader}>
              <span className={styles.chartCardTitle}>Heatmap</span>
              <span className={styles.chartCardMeta}>Value intensity over time</span>
            </div>
            <div className={styles.chartBody}>
              <Heatmap
                data={heatmapData.data}
                rows={heatmapData.rows}
                cols={heatmapData.cols}
              />
            </div>
          </div>

          {/* Data Table */}
          <div className={styles.chartCardHalf} id="data">
            <DataTable series={series} />
          </div>
        </section>
      </main>
    </div>
  );
});

export default DashboardClient;
