/**
 * Minimal async counting semaphore (Economy Service Phase 6).
 *
 * Used to cap concurrent `/api/run` executions so a burst of run requests can't
 * spawn unbounded in-flight Judge0 calls / event-loop work. `acquire()` resolves
 * with a `release` function; callers must call it (use try/finally).
 */
export class Semaphore {
  private available: number;
  private readonly waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.available = Math.max(1, permits);
  }

  /** Number of callers currently waiting for a permit. */
  get queued(): number {
    return this.waiters.length;
  }

  async acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available--;
      return this.makeRelease();
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.available--;
    return this.makeRelease();
  }

  private makeRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.available++;
      const next = this.waiters.shift();
      if (next) next();
    };
  }
}
