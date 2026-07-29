// ============================================================
// app/dashboard/page.tsx
// Main dashboard page — Server Component shell.
// Client islands are imported with 'use client' components.
// ============================================================

import { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import DashboardLoading from './loading';

export const metadata = {
  title: 'Performance Dashboard | Real-Time Data Visualization',
  description:
    'Bloomberg-style real-time dashboard rendering 10,000+ data points at 60 FPS using Canvas.',
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient />
    </Suspense>
  );
}

// Trigger rebuild
