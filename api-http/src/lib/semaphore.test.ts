import { describe, it, expect } from "vitest";
import { Semaphore } from "./semaphore";

describe("Semaphore", () => {
  it("grants up to `permits` acquisitions immediately", async () => {
    const sem = new Semaphore(2);
    const r1 = await sem.acquire();
    const r2 = await sem.acquire();
    expect(sem.queued).toBe(0);
    r1();
    r2();
  });

  it("queues the next acquirer until a permit is released", async () => {
    const sem = new Semaphore(1);
    const release1 = await sem.acquire();

    let secondAcquired = false;
    const second = sem.acquire().then((release) => {
      secondAcquired = true;
      return release;
    });

    // Still blocked while the single permit is held.
    await Promise.resolve();
    expect(secondAcquired).toBe(false);
    expect(sem.queued).toBe(1);

    release1();
    const release2 = await second;
    expect(secondAcquired).toBe(true);
    expect(sem.queued).toBe(0);
    release2();
  });

  it("processes waiters in FIFO order", async () => {
    const sem = new Semaphore(1);
    const held = await sem.acquire();
    const order: number[] = [];

    const a = sem.acquire().then((r) => {
      order.push(1);
      r();
    });
    const b = sem.acquire().then((r) => {
      order.push(2);
      r();
    });

    held();
    await Promise.all([a, b]);
    expect(order).toEqual([1, 2]);
  });

  it("is idempotent: calling release twice frees only one permit", async () => {
    const sem = new Semaphore(1);
    const release = await sem.acquire();
    release();
    release(); // no-op

    // Only one permit exists, so exactly one further acquire should be immediate.
    const r1 = await sem.acquire();
    let secondImmediate = false;
    void sem.acquire().then((r) => {
      secondImmediate = true;
      r();
    });
    await Promise.resolve();
    expect(secondImmediate).toBe(false);
    r1();
  });
});
