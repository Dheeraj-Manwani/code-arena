import { EventEmitter } from "events";

/**
 * In-process event bus (Economy Service Phase 2).
 *
 * Replaces the Redis pub/sub hop between the judge worker and the realtime
 * gateway: now that both run in the same process, the submit processor emits a
 * `submission_result` and the realtime module (subscribed below) broadcasts it
 * over WebSocket. No Redis publisher/subscriber involved.
 */
export interface SubmissionResultEvent {
  type: "SUBMISSION_RESULT";
  dsaSubmissionId: number;
  attemptId: number;
  userId: number;
  contestId: number;
  status: "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error";
  pointsEarned: number;
  testCasesPassed: number;
  totalTestCases: number;
}

interface BusEvents {
  submission_result: (event: SubmissionResultEvent) => void;
}

class TypedEventBus {
  private readonly emitter = new EventEmitter();

  on<E extends keyof BusEvents>(event: E, listener: BusEvents[E]): void {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
  }

  off<E extends keyof BusEvents>(event: E, listener: BusEvents[E]): void {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
  }

  emit<E extends keyof BusEvents>(event: E, ...args: Parameters<BusEvents[E]>): void {
    this.emitter.emit(event, ...args);
  }
}

export const bus = new TypedEventBus();
