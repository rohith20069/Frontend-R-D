// ============================================================
// app/dashboard/layout.tsx
// Dashboard layout wrapping: DataProvider context + structure.
// Server Component — wraps client island with context.
// ============================================================

import { DataProvider } from '@/components/providers/DataProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      {children}
    </DataProvider>
  );
}
