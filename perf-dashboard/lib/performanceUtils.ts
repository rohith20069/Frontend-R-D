// ============================================================
// lib/performanceUtils.ts
// Utilities for measuring and tracking render performance.
// Uses the Performance API for sub-millisecond precision.
// ============================================================

/** Rolling average calculator with fixed-size ring buffer */
export class RollingAverage {
  private buffer: Float64Array;
  private head: number = 0;
  private count: number = 0;
  private sum: number = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Float64Array(capacity);
  }

  push(value: number): void {
    if (this.count === this.capacity) {
      // Remove oldest value
      this.sum -= this.buffer[this.head];
    } else {
      this.count++;
    }
    this.buffer[this.head] = value;
    this.sum += value;
    this.head = (this.head + 1) % this.capacity;
  }

  get average(): number {
    return this.count === 0 ? 0 : this.sum / this.count;
  }

  get latest(): number {
    if (this.count === 0) return 0;
    const lastIdx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIdx];
  }
}

/** High-resolution frame timer using RAF timestamps */
export class FPSCounter {
  private frameTimes: Float64Array;
  private head: number = 0;
  private count: number = 0;
  private lastTime: number = 0;
  private droppedFrames: number = 0;
  private readonly TARGET_FRAME_MS = 1000 / 60;

  constructor(private readonly capacity: number = 120) {
    this.frameTimes = new Float64Array(capacity);
  }

  /**
   * Record a new frame at the given timestamp (from RAF callback).
   * Returns current FPS.
   */
  tick(now: number): number {
    if (this.lastTime !== 0) {
      const delta = now - this.lastTime;
      this.frameTimes[this.head] = delta;
      this.head = (this.head + 1) % this.capacity;
      if (this.count < this.capacity) this.count++;

      // Track dropped frames (delta > 2x target = frame took too long)
      if (delta > this.TARGET_FRAME_MS * 2) {
        this.droppedFrames++;
      }
    }
    this.lastTime = now;
    return this.currentFPS;
  }

  get currentFPS(): number {
    if (this.count < 2) return 0;
    let totalMs = 0;
    for (let i = 0; i < this.count; i++) {
      totalMs += this.frameTimes[i];
    }
    return Math.round(1000 / (totalMs / this.count));
  }

  get droppedFrameCount(): number {
    return this.droppedFrames;
  }

  reset(): void {
    this.head = 0;
    this.count = 0;
    this.lastTime = 0;
    this.droppedFrames = 0;
  }
}

/**
 * Measure JS heap memory usage using the Performance Memory API.
 * Falls back to 0 if not available (non-Chrome browsers).
 */
export function getMemoryUsageMB(): number {
  if (typeof performance === 'undefined') return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (performance as any).memory;
  if (!mem) return 0;
  return mem.usedJSHeapSize / (1024 * 1024);
}

/**
 * Create a high-precision stopwatch using performance.now().
 * Returns a function that, when called, returns elapsed ms.
 */
export function createStopwatch(): () => number {
  const start = performance.now();
  return () => performance.now() - start;
}

/**
 * Debounce a function — useful for resize handlers.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Throttle a function to fire at most once per animationFrame.
 * Better than setTimeout-based throttle for visual updates.
 */
export function throttleToRAF<T extends (...args: unknown[]) => void>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T>;

  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn(...lastArgs);
        rafId = null;
      });
    }
  };
}

/**
 * CircularBuffer — fixed-capacity array that overwrites oldest entries.
 * Used for the sliding window data store. O(1) push, O(n) toArray.
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private count: number = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array<T>(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  pushMany(items: T[]): void {
    for (const item of items) this.push(item);
  }

  /** Return all items in chronological order (oldest first) */
  toArray(): T[] {
    if (this.count === 0) return [];
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count);
    }
    // Buffer is full: oldest is at `head`
    const tail = this.buffer.slice(this.head);
    const head = this.buffer.slice(0, this.head);
    return [...tail, ...head];
  }

  get size(): number {
    return this.count;
  }

  get isFull(): boolean {
    return this.count === this.capacity;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two numbers.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map a value from one range to another.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
