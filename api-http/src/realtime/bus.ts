import { EventEmitter } from "events";

/**
 * In-process event bus (Economy Service Phase 2).
 *
 * Replaces the Redis pub/sub hop between the judge worker and the realtime
 * gateway: now that both run in the same process, the submit processor emits a
 * `submission_result` and the realtime module (subscribed below) broadcasts it
 * over WebSocket. No Redis publisher/subscriber involved.
 */
type Verdict = "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error";

interface SubmissionResultBase {
  type: "SUBMISSION_RESULT";
  userId: number;
  status: Verdict;
  testCasesPassed: number;
  totalTestCases: number;
}

/**
 * A contest verdict. Fans out to the contest room: the full result to the
 * submitter's own sockets, an anonymised LEADERBOARD_UPDATE to everyone else.
 */
export interface ContestSubmissionResultEvent extends SubmissionResultBase {
  scope: "contest";
  dsaSubmissionId: number;
  attemptId: number;
  contestId: number;
  pointsEarned: number;
}

/**
 * A practice verdict. There is no contest room to fan out to — it goes to the
 * submitting user's own sockets and nowhere else (§4.2). Practice is unscored,
 * so there is no `pointsEarned` and no leaderboard signal.
 */
export interface PracticeSubmissionResultEvent extends SubmissionResultBase {
  scope: "practice";
  practiceSubmissionId: number;
  problemId: number;
}

export type SubmissionResultEvent =
  | ContestSubmissionResultEvent
  | PracticeSubmissionResultEvent;

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
