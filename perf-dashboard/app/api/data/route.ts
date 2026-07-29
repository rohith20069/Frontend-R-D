// ============================================================
// app/api/data/route.ts
// API route for fetching historical or batch data.
// Supports streaming via SSE for future integrations.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateBatch, generateInitialData } from '@/lib/dataGenerator';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'batch';
  const window = parseInt(searchParams.get('window') ?? '60000', 10);

  if (type === 'initial') {
    // Return historical seed data for initial load
    const data = generateInitialData(window);
    return NextResponse.json(
      { data, timestamp: Date.now(), count: data.length },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (type === 'batch') {
    // Return a single batch of data points
    const batch = generateBatch(Date.now());
    return NextResponse.json(
      { data: batch, timestamp: Date.now() },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (type === 'stream') {
    // Server-Sent Events stream for real-time data
    const encoder = new TextEncoder();
    let intervalId: ReturnType<typeof setInterval>;

    const stream = new ReadableStream({
      start(controller) {
        intervalId = setInterval(() => {
          const batch = generateBatch(Date.now());
          const payload = `data: ${JSON.stringify(batch)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }, 100);
      },
      cancel() {
        clearInterval(intervalId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
