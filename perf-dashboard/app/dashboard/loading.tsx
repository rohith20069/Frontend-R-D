// ============================================================
// app/dashboard/loading.tsx
// Suspense loading state for the dashboard route.
// ============================================================

export default function DashboardLoading() {
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
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '3px solid rgba(0,212,255,0.2)',
          borderTop: '3px solid #00d4ff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '13px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Initializing Dashboard…
      </p>
    </div>
  );
}
