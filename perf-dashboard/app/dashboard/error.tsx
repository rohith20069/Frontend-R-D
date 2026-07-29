// ============================================================
// app/dashboard/error.tsx
// Error boundary for the dashboard route.
// ============================================================
'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px',
        background: '#080b14',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
        Dashboard Error
      </h1>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', maxWidth: 400 }}>
        {error.message || 'An unexpected error occurred in the dashboard.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          background: 'rgba(0,212,255,0.15)',
          border: '1px solid rgba(0,212,255,0.3)',
          borderRadius: '8px',
          color: '#00d4ff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  );
}
