// ============================================================
// app/layout.tsx
// Root layout: sets font, meta, viewport, and global CSS.
// ============================================================

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PerfViz — Real-Time Data Visualization Dashboard',
  description:
    'A Bloomberg-grade real-time dashboard rendering 10,000+ data points at 60 FPS using HTML5 Canvas and React 19.',
  keywords: ['dashboard', 'real-time', 'data visualization', 'canvas', 'performance'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080b14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
