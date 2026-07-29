# PerfViz — Performance-Critical Data Visualization Dashboard

A Bloomberg/Grafana-inspired real-time data dashboard built with **Next.js 15**, **React 19**, and **HTML5 Canvas**, capable of rendering **10,000+ data points at ~60 FPS**.

---

## 🚀 Quick Start

```bash
cd perf-dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/dashboard`.

---

## 🏗️ Architecture

```
app/
├── page.tsx                    → Redirect to /dashboard
├── layout.tsx                  → Root layout (fonts, meta)
├── globals.css                 → Dark theme design tokens
├── dashboard/
│   ├── page.tsx                → Server Component shell
│   ├── DashboardClient.tsx     → Main client island
│   ├── Dashboard.module.css    → Dashboard layout styles
│   ├── layout.tsx              → Wraps DataProvider context
│   ├── loading.tsx             → Suspense fallback
│   └── error.tsx               → Error boundary
└── api/data/route.ts           → Edge API (batch/stream/initial)

components/
├── charts/
│   ├── LineChart.tsx           → Canvas line chart w/ zoom/pan
│   ├── BarChart.tsx            → Canvas grouped bar chart
│   ├── ScatterPlot.tsx         → Canvas scatter (5K+ pts/series)
│   ├── Heatmap.tsx             → Canvas heatmap w/ color scale
│   └── Chart.module.css        → Shared chart styles
├── controls/
│   ├── FilterPanel.tsx         → Series toggles + stress mode
│   ├── TimeRangeSelector.tsx   → Range + aggregation pills
│   └── Controls.module.css
├── providers/
│   └── DataProvider.tsx        → Context + useReducer + useTransition
└── ui/
    ├── DataTable.tsx           → Virtual scroll (no libraries!)
    ├── PerformanceMonitor.tsx  → FPS / Memory / Render metrics
    └── UI.module.css

hooks/
├── useChartRenderer.ts         → RAF loop + DPI scaling + resize
├── useDataStream.ts            → 100ms interval + CircularBuffer
├── usePerformanceMonitor.ts    → FPS counter + rolling average
└── useVirtualization.ts        → Custom virtual scrolling

lib/
├── types.ts                    → All TypeScript interfaces
├── dataGenerator.ts            → GBM-based data generation
├── canvasUtils.ts              → All canvas draw primitives
└── performanceUtils.ts         → FPSCounter, CircularBuffer, etc.
```

---

## 📊 Charts (All from Scratch, No Libraries)

| Chart | Points | Features |
|-------|--------|----------|
| Line Chart | 10,000+ per series | Zoom, Pan, Crosshair, Area Fill, Smooth Curves |
| Bar Chart | Last 60 ticks | Grouped, Rounded tops, Tooltips |
| Scatter Plot | 5,000 per series | Batched arc draw, Density view |
| Heatmap | 20×N grid | Color scale, Row/Col labels, Legend bar |

---

## ⚡ Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| FPS | 60 | ~60 |
| Data Points | 10,000+ | 10K / 50K / 100K modes |
| Interaction Latency | <100ms | <16ms (1 frame) |
| Memory Leak | None | CircularBuffer bounds all data |

---

## 🎛️ Controls

- **Series Toggle** — Show/hide individual data series
- **Time Range** — 1m / 5m / 15m / 1h / 6h / 24h
- **Aggregation** — Raw / 1min / 5min / 1hr OHLCV
- **Stress Mode** — Normal (10K) / Stress (50K) / Extreme (100K)
- **Zoom/Pan** — Mouse wheel to zoom, drag to pan on line chart
- **Pause/Resume** — Stop/start the data stream

---

## 🔧 Tech Stack

- **Next.js 15** — App Router, Server + Client Components, Edge API
- **React 19** — useTransition, Concurrent Rendering
- **TypeScript** — Strict mode, no `any`
- **HTML5 Canvas** — All chart rendering (no D3/Chart.js)
- **CSS Modules** — Scoped styles, no Tailwind/MUI/Chakra
- **React Context API** — Global state (no Redux/Zustand)
- **Custom Hooks** — Data stream, chart renderer, virtualization

---

## 🧠 Key Design Decisions

### Dirty Flag Rendering
Charts skip canvas draws when data hasn't changed, saving significant GPU time.

### CircularBuffer Sliding Window
Bounded-capacity ring buffers prevent unbounded memory growth in all stress modes.

### Geometric Brownian Motion
Realistic sensor/financial data simulation using GBM with per-series drift and volatility.

### Virtual Scrolling
Data table only renders visible rows (~20) regardless of dataset size (supports 50K+ rows).

### useTransition for Filters
Filter state changes use `useTransition` so they don't block chart rendering.
