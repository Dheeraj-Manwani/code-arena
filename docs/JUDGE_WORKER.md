# Judge Worker Service

The `judge-worker` is a standalone Node.js + TypeScript microservice that acts as a BullMQ consumer for DSA code submissions. It picks jobs off a Redis-backed queue, sends the source code to Judge0 (via RapidAPI) for execution, parses the result, and writes the verdict back to the main `api-http` backend.

---

## Table of Contents

- [Architecture](#architecture)
- [How a Job Flows Through the System](#how-a-job-flows-through-the-system)
- [Project Structure](#project-structure)
- [File-by-File Reference](#file-by-file-reference)
  - [Entry Point](#entry-point--srcindexts)
  - [Worker Setup](#worker-setup--srcworkerts)
  - [Job Processor](#job-processor--srcprocessorts)
  - [Queue Layer](#queue-layer--srcqueue)
  - [Job Types & Validation](#job-types--validation--srctypesjobts)
  - [Error Classes](#error-classes--srcerrorsindexts)
  - [Logger](#logger--srcloggerindexts)
  - [Judge0 Integration](#judge0-integration--srcjudge)
  - [Backend Integration](#backend-integration--srcbackend)
  - [Graceful Shutdown](#graceful-shutdown--srcshutdowngracefults)
- [Stdout Parsing Algorithm](#stdout-parsing-algorithm)
- [Verdict Derivation](#verdict-derivation)
- [Retry & Failure Strategy](#retry--failure-strategy)
- [Environment Variables](#environment-variables)
- [Running the Service](#running-the-service)
- [Docker](#docker)
- [Pending TODOs for api-http](#pending-todos-for-api-http)

---

## Architecture

```
┌─────────────┐       ┌───────────┐       ┌──────────────┐       ┌──────────────┐
│             │  push  │           │  pop   │              │ POST  │              │
│   api-http  │───────▶│   Redis   │───────▶│ judge-worker │──────▶│   Judge0     │
│  (producer) │       │  (BullMQ) │       │  (consumer)  │◀──────│  (RapidAPI)  │
│             │◀──────│           │       │              │  poll  │              │
│             │ PATCH  │           │       │              │       │              │
└─────────────┘       └───────────┘       └──────────────┘       └──────────────┘
      ▲                                          │
      │              PATCH verdict               │
      └──────────────────────────────────────────┘
```

**Key separation of concerns:**

| Component | Role |
|---|---|
| `api-http` | BullMQ producer. Generates the complete wrapped source code (user function + test harness), creates a `DsaSubmission` row with `status: "pending"`, and enqueues a job. |
| `judge-worker` | BullMQ consumer. Receives the job, submits the pre-built source code to Judge0, polls for the result, parses stdout markers, derives a verdict, and PATCHes the result back to `api-http`. |
| Redis | Shared message broker between producer and consumer. BullMQ manages the queue, retries, and job lifecycle. |
| Judge0 (RapidAPI) | Remote code execution engine. Receives a single submission per job (all test cases embedded in the harness) and returns stdout/stderr/status. |

The worker **never generates or modifies source code** — it receives a fully formed harness from `api-http` and submits it verbatim.

---

## How a Job Flows Through the System

Below is the complete lifecycle of a single submission, step by step:

```
1.  User submits code on the frontend
2.  api-http creates DsaSubmission (status: "pending")
3.  api-http generates wrapped source code (user fn + test harness)
4.  api-http enqueues a BullMQ job onto the "judge" queue
         │
         ▼
5.  judge-worker pops the job from Redis
6.  Validates the job payload with Zod
         │  (invalid payload → UnrecoverableError → job moves to "failed", no retry)
         ▼
7.  POST /submissions to Judge0 → receives a token
         │  (unsupported language → UnrecoverableError)
         │  (Judge0 HTTP error → JudgeApiError → BullMQ retries)
         ▼
8.  Poll GET /submissions/:token every 1.5s (up to 20 times = 30s max)
         │  (poll timeout → PollTimeoutError → BullMQ retries)
         ▼
9.  Judge0 returns terminal status (id >= 3)
         │
         ▼
10. Derive verdict:
         │  status 5         → time_limit_exceeded
         │  status 6         → runtime_error (compilation)
         │  status 7–14      → runtime_error (signals)
         │  status 4         → wrong_answer
         │  status 3         → parse stdout markers
         │      all passed   → accepted
         │      __ERROR__    → runtime_error
         │      mismatch     → wrong_answer
         │      empty stdout → runtime_error
         ▼
11. Compute pointsEarned:
         │  accepted → job.totalPoints
         │  anything else → 0
         ▼
12. PATCH /api/internal/submissions/dsa/:id  → store verdict on DsaSubmission
         │
         ▼
13. If pointsEarned > 0:
         PATCH /api/internal/attempts/:id/score → increment ContestAttempt.totalPoints
         │
         ▼
14. Job marked as "completed" in BullMQ
```

---

## Project Structure

```
judge-worker/
├── src/
│   ├── index.ts                         # Entry point — boots Redis, worker, shutdown
│   ├── worker.ts                        # BullMQ Worker creation + event listeners
│   ├── processor.ts                     # Core job logic (called by worker per job)
│   ├── judge/
│   │   ├── types.ts                     # Judge0 request/response TypeScript interfaces
│   │   ├── client.ts                    # Axios instance for Judge0 RapidAPI
│   │   ├── submit.ts                    # POST /submissions → returns token
│   │   ├── poll.ts                      # GET /submissions/:token polling loop
│   │   └── parse.ts                     # Stdout marker parser + verdict derivation
│   ├── backend/
│   │   ├── client.ts                    # Axios instance for api-http internal calls
│   │   ├── updateSubmission.ts          # PATCH DsaSubmission verdict
│   │   └── updateAttemptScore.ts        # PATCH ContestAttempt score
│   ├── queue/
│   │   ├── connection.ts                # Shared ioredis instance for BullMQ
│   │   └── constants.ts                 # Queue name, poll config, language map
│   ├── errors/
│   │   └── index.ts                     # Custom error classes
│   ├── logger/
│   │   └── index.ts                     # Pino logger setup
│   ├── shutdown/
│   │   └── graceful.ts                  # SIGTERM/SIGINT handler
│   └── types/
│       └── job.ts                       # JudgeJob interface + Zod schema
├── .env.example
├── .gitignore
├── Dockerfile
├── tsconfig.json
└── package.json
```

---

## File-by-File Reference

### Entry Point — `src/index.ts`

The startup sequence:

1. **Verify Redis** — calls `connection.ping()`. If Redis is unreachable, logs a fatal error and exits with code 1.
2. **Create Worker** — calls `createWorker()` which registers the BullMQ worker on the `"judge"` queue.
3. **Register Shutdown** — attaches SIGTERM/SIGINT handlers for graceful drain.
4. **Log startup** — prints queue name, concurrency, and `NODE_ENV` (never secrets).

No exports — this file is the entry point only.

---

### Worker Setup — `src/worker.ts`

Exports `createWorker()` which instantiates a BullMQ `Worker` with:

| Option | Value | Reason |
|---|---|---|
| `concurrency` | `WORKER_CONCURRENCY` (default 4) | Process up to N jobs in parallel |
| `limiter.max` | 10 | Max 10 jobs started per second |
| `limiter.duration` | 1000ms | Rate-limit window to respect RapidAPI limits |
| `connection` | shared ioredis instance | Connects to the same Redis as `api-http` |

**Event listeners:**

| Event | Action |
|---|---|
| `completed` | Logs job ID + processing duration (ms) |
| `failed` | Logs job ID, attempt number, error message |
| `error` | Logs worker-level error (does not crash) |
| `stalled` | Warns about stalled job ID |

---

### Job Processor — `src/processor.ts`

This is the function BullMQ calls for each job. The complete processing pipeline:

```
parseJob(job.data)
    │
    ▼
submitToJudge0(parsedJob)  →  token
    │
    ▼
pollForVerdict(token)  →  Judge0StatusResponse
    │
    ▼
deriveVerdict(response, totalTestCases)  →  { status, testCasesPassed, executionTime }
    │
    ▼
pointsEarned = (status === "accepted") ? totalPoints : 0
    │
    ▼
updateSubmission(dsaSubmissionId, payload)
    │
    ▼
if pointsEarned > 0:  updateAttemptScore(attemptId, pointsEarned)
```

**Error handling:**
- `ZodError` from `parseJob` → wrapped in `UnrecoverableError` → BullMQ skips retries, moves job to failed.
- All other errors bubble up to BullMQ, which handles retries based on the job's `attempts` config.
- A child logger is created per job with `jobId`, `dsaSubmissionId`, `attemptId`, and `workerId` for structured tracing.

---

### Queue Layer — `src/queue/`

#### `connection.ts`

Creates a single `ioredis` instance with two critical BullMQ-required options:

| Option | Value | Why |
|---|---|---|
| `maxRetriesPerRequest` | `null` | BullMQ uses blocking commands (`BRPOPLPUSH`) that can block indefinitely. A finite retry count would cause spurious failures. |
| `enableReadyCheck` | `false` | BullMQ manages its own readiness; the default Redis `READY` check can interfere. |

Reads `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from environment. Attaches an `error` event handler that logs but does not crash.

#### `constants.ts`

| Constant | Value | Purpose |
|---|---|---|
| `QUEUE_NAME` | `"judge"` | The BullMQ queue both producer and consumer share |
| `JOB_NAME` | `"dsa-submission"` | Job type identifier |
| `POLL_MAX_ATTEMPTS` | `20` | Maximum polling iterations |
| `POLL_INTERVAL_MS` | `1500` | Delay between polls (total max wait: 30s) |
| `WORKER_CONCURRENCY` | from env, default `4` | Parallel job processing slots |
| `JUDGE0_LANGUAGE_MAP` | `{ cpp: 54, python: 71, javascript: 63, java: 62 }` | Maps language strings to Judge0 IDs |
| `JUDGE0_TERMINAL_STATUSES` | `Set([3..14])` | Status IDs that indicate execution is complete |

---

### Job Types & Validation — `src/types/job.ts`

Defines the `JudgeJob` interface that mirrors what `api-http` enqueues:

```typescript
interface JudgeJob {
  jobId: string;              // UUID idempotency key
  dsaSubmissionId: number;    // PK of DsaSubmission row
  attemptId: number;          // FK to ContestAttempt
  userId: number;
  problemId: number;
  contestId: number;
  language: "cpp" | "python" | "javascript" | "java";
  sourceCode: string;         // Fully generated harness — submitted as-is
  totalTestCases: number;     // Number of test cases embedded in source
  totalPoints: number;        // DsaProblem.points for scoring
}
```

The `judgeJobSchema` (Zod) enforces every field's type at runtime. `parseJob(data)` validates unknown data and returns a typed `JudgeJob` or throws a `ZodError`.

---

### Error Classes — `src/errors/index.ts`

| Class | When Thrown | Retryable? |
|---|---|---|
| `UnrecoverableError` (from `bullmq`) | Invalid job payload, unsupported language | No — moves to failed immediately |
| `JudgeApiError` | Judge0 returns non-2xx HTTP status | Yes — BullMQ retries |
| `PollTimeoutError` | Polling loop exhausted (20 attempts) | Yes — BullMQ retries |
| `BackendApiError` | `api-http` returns 5xx | Yes — internal retry (3x) then BullMQ retry |

All custom classes extend `Error` and set `this.name` in the constructor for clean stack traces.

---

### Logger — `src/logger/index.ts`

Uses [Pino](https://getpino.io/) for structured JSON logging.

- **Production** (`NODE_ENV=production`): raw JSON output (ideal for log aggregators)
- **Development**: pretty-printed with color via `pino-pretty`

Exports:
- `logger` — root logger instance
- `childLogger(context)` — creates a child logger with additional fields (used per-job in the processor)

---

### Judge0 Integration — `src/judge/`

#### `types.ts`

Three TypeScript interfaces matching Judge0's API contract:

- `Judge0SubmitRequest` — `{ language_id, source_code, stdin }` (stdin is always `""`)
- `Judge0SubmitResponse` — `{ token }` (returned after submission)
- `Judge0StatusResponse` — `{ token, status, stdout, stderr, compile_output, time, memory }`

#### `client.ts`

An Axios instance preconfigured for Judge0 RapidAPI:

- Base URL: `JUDGE0_API_URL` (https://judge029.p.rapidapi.com)
- Headers: `X-RapidAPI-Host`, `X-RapidAPI-Key`, `Content-Type: application/json`
- Timeout: 10 seconds

#### `submit.ts`

`submitToJudge0(job: JudgeJob): Promise<string>`

1. Looks up `language_id` from `JUDGE0_LANGUAGE_MAP`.
2. If the language is not in the map, throws `UnrecoverableError` (no point retrying an unsupported language).
3. POSTs to `/submissions?base64_encoded=false&wait=false` with the body:
   ```json
   {
     "language_id": 54,
     "source_code": "<harness from api-http>",
     "stdin": ""
   }
   ```
4. On non-2xx: throws `JudgeApiError` with status code and response body.
5. Returns the `token` string for subsequent polling.

The `wait=false` parameter means Judge0 immediately returns a token rather than blocking until execution completes. This keeps our HTTP call fast and we handle waiting via polling.

#### `poll.ts`

`pollForVerdict(token: string): Promise<Judge0StatusResponse>`

A simple poll loop:

```
for attempt 0..19:
    GET /submissions/:token?base64_encoded=false&fields=token,status,stdout,stderr,time,memory,compile_output
    if status.id is terminal (>= 3):
        return response
    else:
        sleep 1500ms

throw PollTimeoutError
```

- Total maximum wait: 20 x 1500ms = **30 seconds**
- `sleep` is implemented as a plain `Promise` with `setTimeout` — no `setInterval`.
- If Judge0 is still queued/processing after 30s, a `PollTimeoutError` is thrown, which triggers a BullMQ retry (up to 3 attempts with exponential backoff).

#### `parse.ts`

Two exported functions for verdict derivation.

**`parseStdout(stdout, totalTestCases): ParseResult`**

Implements the "stop on first failure" marker parser. See [Stdout Parsing Algorithm](#stdout-parsing-algorithm) below.

**`deriveVerdict(judgeStatus, totalTestCases): VerdictResult`**

Maps the Judge0 status ID + parsed stdout into the final verdict. See [Verdict Derivation](#verdict-derivation) below.

---

### Backend Integration — `src/backend/`

#### `client.ts`

An Axios instance for calling `api-http`'s internal endpoints:

- Base URL: `BACKEND_API_URL` (e.g. `http://localhost:3000`)
- Auth: `Authorization: Bearer <BACKEND_INTERNAL_SECRET>` — a shared secret between the two services
- Timeout: 8 seconds
- **Response interceptor**: on any 5xx response, logs the error and throws `BackendApiError`

#### `updateSubmission.ts`

`updateSubmission(dsaSubmissionId, payload): Promise<void>`

PATCHes the verdict onto the `DsaSubmission` row:

```
PATCH /api/internal/submissions/dsa/:dsaSubmissionId
Body: {
  status: "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error",
  pointsEarned: number,
  testCasesPassed: number,
  totalTestCases: number,
  executionTime: number | null
}
```

Includes an internal retry loop (3 attempts, 1s delay) for transient network errors (`ECONNREFUSED` or Axios network errors with no response). Non-network errors are thrown immediately.

#### `updateAttemptScore.ts`

`updateAttemptScore(attemptId, pointsToAdd): Promise<void>`

Increments the contest attempt's total score:

```
PATCH /api/internal/attempts/:attemptId/score
Body: { pointsToAdd: number }
```

Only called when `pointsEarned > 0` (i.e., the submission was `"accepted"`). Same retry logic as `updateSubmission`.

---

### Graceful Shutdown — `src/shutdown/graceful.ts`

`registerGracefulShutdown(worker): void`

Registers handlers for `SIGTERM` and `SIGINT`. The shutdown sequence:

1. Log "Shutdown signal received"
2. Start a 30-second hard-kill timer (`.unref()` so it doesn't keep the event loop alive)
3. `await worker.close()` — BullMQ finishes all in-flight jobs before closing
4. `await connection.quit()` — cleanly disconnects from Redis
5. `process.exit(0)`

If the graceful shutdown takes longer than 30 seconds (e.g., a job is stuck in a long poll), the hard-kill timer fires `process.exit(1)`.

---

## Stdout Parsing Algorithm

The test harness generated by `api-http` prints structured markers to stdout for each test case. The format per test case is:

```
__CASE__<zero-indexed number>
__OUTPUT__<result>          ← if the test ran without exception
__ERROR__<message>          ← if an exception was thrown
```

The worker parses these markers using a **stop-on-first-failure** strategy:

```
Split stdout by newline
Walk lines in order:

  __CASE__<i>     →  Set currentCase = i

  __OUTPUT__<r>   →  Test case passed. Increment testCasesPassed.

  __ERROR__<msg>  →  STOP. Return { verdict: "runtime_error", stoppedAtCase: currentCase }

After all lines:
  if testCasesPassed >= totalTestCases  →  "accepted"
  if testCasesPassed > 0 but < total    →  "wrong_answer" (some passed, then ran out of output)
  if testCasesPassed == 0               →  "runtime_error" (no output at all)
```

The function never throws. Even malformed stdout results in a valid `ParseResult` with `verdict: "runtime_error"`.

---

## Verdict Derivation

`deriveVerdict` maps the raw Judge0 response into one of four final statuses:

| Judge0 `status.id` | Verdict | stdout parsed? |
|---|---|---|
| 5 | `time_limit_exceeded` | No |
| 6 | `runtime_error` (compilation failure) | No |
| 7–14 | `runtime_error` (SIGSEGV, SIGFPE, NZEC, etc.) | No |
| 4 | `wrong_answer` | No |
| 3 (stdout empty) | `runtime_error` | No |
| 3 (stdout present) | Determined by `parseStdout()` | Yes |

**Points calculation:**

| Verdict | pointsEarned |
|---|---|
| `accepted` | `job.totalPoints` (full marks) |
| Everything else | `0` |

**Execution time:** Parsed from Judge0's `time` field (a string like `"0.042"` representing seconds). Converted to milliseconds via `Math.round(parseFloat(time) * 1000)`. If `null`, stored as `null`.

---

## Retry & Failure Strategy

Retries operate at two levels:

### Level 1: BullMQ Job Retries

Configured by `api-http` when enqueuing (the worker respects whatever the producer sets). The expected defaults:

| Option | Value |
|---|---|
| `attempts` | 3 |
| `backoff.type` | `"exponential"` |
| `backoff.delay` | 2000ms (so: 2s, 4s, 8s) |
| `removeOnComplete.count` | 500 (keep last 500 completed jobs) |
| `removeOnFail` | `false` (keep all failed jobs for inspection) |

Errors that trigger BullMQ retries:
- `JudgeApiError` — Judge0 returned a non-2xx (may be transient)
- `PollTimeoutError` — Judge0 was slow, might succeed on retry
- `BackendApiError` — `api-http` returned 5xx
- Network errors — connection failures to Judge0 or Redis

Errors that **skip** retries:
- `UnrecoverableError` — invalid job payload or unsupported language. There's no point retrying — the same data will fail again.

### Level 2: Backend Call Retries (Internal)

Both `updateSubmission` and `updateAttemptScore` have a built-in retry loop:
- 3 attempts, 1-second delay between retries
- Only retries on **network errors** (no response from `api-http`)
- Non-network errors (4xx, 5xx with response) are thrown immediately

This two-tier approach means a transient `api-http` restart won't waste a BullMQ attempt.

### Rate Limiting

The worker's BullMQ limiter (`max: 10, duration: 1000`) ensures at most 10 jobs start processing per second, preventing bursts from overwhelming the Judge0 RapidAPI quota.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_HOST` | No | `localhost` | Redis server hostname |
| `REDIS_PORT` | No | `6379` | Redis server port |
| `REDIS_PASSWORD` | No | _(empty)_ | Redis password (if auth is enabled) |
| `WORKER_CONCURRENCY` | No | `4` | Number of jobs processed in parallel |
| `NODE_ENV` | No | `development` | `production` for JSON logs, anything else for pretty logs |
| `JUDGE0_API_URL` | Yes | — | Judge0 RapidAPI base URL (`https://judge029.p.rapidapi.com`) |
| `JUDGE0_RAPIDAPI_HOST` | Yes | — | RapidAPI host header (`judge029.p.rapidapi.com`) |
| `JUDGE0_RAPIDAPI_KEY` | Yes | — | Your RapidAPI key (never commit this) |
| `BACKEND_API_URL` | Yes | — | `api-http` base URL (e.g. `http://localhost:3000`) |
| `BACKEND_INTERNAL_SECRET` | Yes | — | Shared secret for service-to-service auth |

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

---

## Running the Service

### Prerequisites

- Node.js 20+
- A running Redis instance
- A running `api-http` instance (for the PATCH callbacks)
- A valid Judge0 RapidAPI key

### Development

```bash
cd judge-worker
npm install
cp .env.example .env   # then fill in your values
npm run dev             # starts with tsx watch (auto-reload on file changes)
```

### Production

```bash
npm run build           # compiles TypeScript to dist/
npm start               # runs node dist/index.js
```

---

## Docker

The `Dockerfile` uses a multi-stage build:

**Stage 1 (`builder`):** `node:20-alpine` — installs all dependencies (including dev), compiles TypeScript.

**Stage 2 (`runner`):** `node:20-alpine` — copies only `dist/`, `node_modules/`, and `package.json`. Runs as the non-root `node` user for security.

```bash
docker build -t judge-worker .
docker run --env-file .env judge-worker
```

The final image contains no TypeScript source, no dev dependencies, and no build tooling.

---

## Pending TODOs for api-http

The worker calls two internal `api-http` endpoints that do not exist yet. These must be implemented before the full pipeline works end-to-end:

### 1. `PATCH /api/internal/submissions/dsa/:dsaSubmissionId`

Must update the `DsaSubmission` row with:

| Field | Type |
|---|---|
| `status` | `"accepted" \| "wrong_answer" \| "time_limit_exceeded" \| "runtime_error"` |
| `pointsEarned` | `number` |
| `testCasesPassed` | `number` |
| `totalTestCases` | `number` |
| `executionTime` | `number \| null` |

### 2. `PATCH /api/internal/attempts/:attemptId/score`

Must atomically increment `ContestAttempt.totalPoints`:

```prisma
await prisma.contestAttempt.update({
  where: { id: attemptId },
  data: { totalPoints: { increment: pointsToAdd } },
});
```

Both endpoints should validate the `Authorization: Bearer <BACKEND_INTERNAL_SECRET>` header.

---

## Dependencies

| Package | Purpose |
|---|---|
| `bullmq` | Redis-backed job queue (worker API, `UnrecoverableError`) |
| `ioredis` | Redis client required by BullMQ |
| `axios` | HTTP client for Judge0 and backend API calls |
| `zod` | Runtime job payload validation |
| `pino` | Structured JSON logger |
| `pino-pretty` | Human-readable log output in development |
| `typescript` | (dev) TypeScript compiler |
| `@types/node` | (dev) Node.js type definitions |
| `tsx` | (dev) TypeScript execution + watch mode for development |
