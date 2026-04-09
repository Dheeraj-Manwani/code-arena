# Judge Worker Service

The `judge-worker` is a standalone Node.js + TypeScript microservice that consumes two BullMQ queues on Redis:

1. **`judge`** — DSA **submit** jobs: execute a full test harness, derive a verdict, and PATCH results back to `api-http`.
2. **`judge-run`** — **Run** jobs: execute arbitrary (or harness-wrapped) code once, then **publish** the raw Judge0 result to a Redis channel so `api-http` can complete a waiting HTTP request.

Judge0 is accessed via RapidAPI (same HTTP API as before: submit token, poll until terminal status).

---

## Table of Contents

- [Architecture](#architecture)
- [End-to-end: Submit flow (DSA)](#end-to-end-submit-flow-dsa)
- [End-to-end: Run flow](#end-to-end-run-flow)
- [How submit jobs move through the worker](#how-submit-jobs-move-through-the-worker)
- [How run jobs move through the worker](#how-run-jobs-move-through-the-worker)
- [Project Structure](#project-structure)
- [File-by-File Reference](#file-by-file-reference)
  - [Entry Point](#entry-point--srcindexts)
  - [Worker Setup](#worker-setup--srcworkerts)
  - [Submit Job Processor](#submit-job-processor--srcprocessorts)
  - [Run Job Processor](#run-job-processor--srcrunprocessorts)
  - [Queue Layer](#queue-layer--srcqueue)
  - [Job Schemas](#job-schemas--srcschema)
  - [Error Classes](#error-classes--srcerrorsindexts)
  - [Logger](#logger--srcloggerindexts)
  - [Judge0 Integration](#judge0-integration--srcjudge)
  - [Backend Integration](#backend-integration--srcbackend)
  - [Graceful Shutdown](#graceful-shutdown--srcshutdowngracefults)
- [Stdout Parsing Algorithm](#stdout-parsing-algorithm)
- [Verdict Derivation](#verdict-derivation)
- [Run result payload (Redis pub/sub)](#run-result-payload-redis-pubsub)
- [Retry & Failure Strategy](#retry--failure-strategy)
- [Environment Variables](#environment-variables)
- [Running the Service](#running-the-service)
- [Docker](#docker)
- [api-http contract (internal PATCH)](#api-http-contract-internal-patch)
- [Dependencies](#dependencies)

---

## Architecture

### High level

```
┌────────────────┐     enqueue      ┌───────────┐     consume      ┌──────────────┐     HTTP      ┌──────────────┐
│    api-http    │─────────────────▶│   Redis   │─────────────────▶│ judge-worker │─────────────▶│   Judge0     │
│   (producer)   │                  │  BullMQ   │                  │  (consumer)  │◀─────────────│  (RapidAPI)  │
└────────────────┘                  └───────────┘                  └──────────────┘    poll       └──────────────┘
        │                                 ▲                                │
        │         submit: PATCH verdict   │         run: PUBLISH result    │
        └─────────────────────────────────┴────────────────────────────────┘
                          (HTTP internal API)              (Redis pub/sub on same Redis instance)
```

**Queues**

| Queue name (`BullMQ`) | Job name | Processor | Purpose |
|----------------------|----------|-----------|---------|
| `judge` | `dsa-submission` | `processJob` | Contest DSA submit: verdict + DB updates via `api-http` |
| `judge-run` | `dsa-run` | `processRunJob` | IDE “Run”: return execution output to caller via Redis |

**Redis usage**

| Mechanism | Used by | Role |
|-----------|---------|------|
| BullMQ | `api-http` + `judge-worker` | Reliable job delivery, retries, concurrency |
| Pub/sub | `api-http` (`run.service`) + `judge-worker` (`runProcessor`) | Correlates a single HTTP `/api/run` request with one completed run job |

**Separation of concerns**

| Component | Role |
|-----------|------|
| `api-http` | **Submit:** Creates `DsaSubmission` (`pending`), builds harness via `generateJudgeBoilerplate`, enqueues `judge` queue. **Run:** Validates body, optionally wraps code, subscribes to a unique channel, enqueues `judge-run`. |
| `judge-worker` | **Submit:** Judge0 submit + poll, parse stdout markers, PATCH `api-http`. **Run:** Judge0 submit + poll, `PUBLISH` JSON to `responseChannel`. |
| Redis | Shared broker for BullMQ and for run-result pub/sub (same host/port as `REDIS_*` env). |
| Judge0 | Executes one submission per job; stdin is always empty (`""`). |

The worker **does not** generate submit harnesses — `enqueueJudgeJob` in `api-http` produces `sourceCode` before enqueueing. For **run**, `api-http` may send raw user code or a harness (see [Run flow](#end-to-end-run-flow)).

---

## End-to-end: Submit flow (DSA)

This is the contest “Submit” path for a DSA problem (persistent submission + async judging).

### 1. Client → `api-http`

- Route: contest submission handler (see `api-http` submission routes / `submitDsa` in `submission.service.ts`).
- Body includes at least `code` and `language` (`LanguageEnum`: `cpp`, `java`, `js`, `python`).

### 2. `api-http` — validation and persistence

`submitDsa` (in `api-http/src/service/submission.service.ts`):

1. Loads the attempt and DSA problem (signature, test cases, points, contest state).
2. Ensures contest is active, no duplicate submission for this attempt/problem.
3. Maps problem test cases to `SerializedTestCase[]` (`input`, `expectedOutput`).
4. **`createDsaSubmission`** with `status: "pending"`, `pointsEarned: 0`, `testCasesPassed: 0`, `totalTestCases: testCases.length`.
5. Calls **`enqueueJudgeJob`** (`api-http/src/lib/judgeQueue.ts`), passing `userCode`, `signature`, `testCases`, `language`, ids, and `totalPoints`.

### 3. `api-http` — enqueue (`enqueueJudgeJob`)

Inside `enqueueJudgeJob`:

1. **`generateJudgeBoilerplate(signature, userCode, testCases)`** produces per-language harness strings; the job uses **`sourceCode = allHarnesses[language]`** (only the selected language).
2. Maps API language to judge language: **`js` → `javascript`** (see `LANGUAGE_TO_JUDGE_JOB`).
3. Generates **`jobId`** = `crypto.randomUUID()`.
4. **`judgeQueue.add("dsa-submission", { jobId, dsaSubmissionId, attemptId, userId, problemId, contestId, language: judgeLanguage, sourceCode, totalTestCases, totalPoints }, { jobId })`**.

Default queue options (`api-http/src/lib/queue.ts`): `attempts: 3`, exponential `backoff` from `2000` ms, `removeOnComplete: { count: 500 }`, `removeOnFail: false`.

### 4. `api-http` — response to client

`submitDsa` returns immediately with **`status: "pending"`**, zero points, and test case counts. It also advances `currentProblemId` for the attempt. The client polls or subscribes elsewhere for the final `DsaSubmission` status (outside this doc).

### 5. `judge-worker` — consume `judge` queue

`processJob` (`judge-worker/src/processor.ts`) runs the pipeline in [How submit jobs move through the worker](#how-submit-jobs-move-through-the-worker).

### 6. `api-http` — internal callbacks (expected contract)

On success, the worker calls:

- **`PATCH /api/internal/submissions/dsa/:dsaSubmissionId`** — verdict fields.
- **`PATCH /api/internal/attempts/:attemptId/score`** with `{ pointsToAdd }` **only if** `pointsEarned > 0` (full problem points on `accepted`).

These routes are the **service contract** documented in [api-http contract](#api-http-contract-internal-patch). Wire them in `api-http` if they are not registered yet.

---

## End-to-end: Run flow

This path is for **“Run code”** without creating a `DsaSubmission`: synchronous-from-the-client’s-perspective behavior over an async worker, using **Redis pub/sub** as the callback transport.

### 1. Client → `api-http`

- **Route:** `POST /api/run` (`api-http/src/routes/run.routes.ts`), authenticated.
- **Body** (`RunCodeBodySchema` in `submission.schema.ts`):
  - Required: `code`, `language` (same `LanguageEnum` as submit).
  - Optional: `signature` (`BoilerplateSignature`), `testCases` (`input` / `expectedOutput` strings, **can be empty** in schema — wrapping runs when both signature and non-empty `testCases` are present).

### 2. `api-http` — build `sourceCode` (`run.service.ts`)

`runCode`:

1. Starts with `sourceCode = code`.
2. If **`signature` and `bodyTestCases` exist and `bodyTestCases.length > 0`**, replaces `sourceCode` with **`generateJudgeBoilerplate(...)[language]`** (same harness idea as submit, but in the run service).
3. Creates a dedicated **subscriber** `IORedis` instance (`maxRetriesPerRequest: null`, `enableReadyCheck: false`) — separate from the BullMQ connection but **same Redis server** (`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`).

### 3. `api-http` — subscribe-then-enqueue (race fix)

The service builds a **unique channel name**, e.g. `judge:run:result:<timestamp>:<random>`.

**Critical ordering** (comment in code):

1. Register an `on("message")` handler that, for matching `responseChannel`, `JSON.parse`s the payload and **resolves** the in-flight promise.
2. **`await subscriber.subscribe(responseChannel)`** — must complete **before** the worker can publish, so the message is not missed.
3. **`await enqueueRunJob({ language, sourceCode, responseChannel })`**.

A **35s** timer rejects the promise if no message arrives (`run.service.ts`).

### 4. `api-http` — enqueue (`enqueueRunJob`)

`enqueueRunJob` (`judgeQueue.ts`):

1. **`runId = crypto.randomUUID()`**.
2. Maps language with **`LANGUAGE_TO_JUDGE_JOB`**.
3. **`runQueue.add("dsa-run", { runId, language: judgeLanguage, sourceCode, responseChannel }, { jobId: runId })`**.

### 5. `judge-worker` — `processRunJob`

See [Run Job Processor](#run-job-processor--srcrunprocessorts). In short: Judge0 submit + poll, then **`connection.publish(responseChannel, JSON.stringify(...))`** on the worker’s shared Redis connection.

### 6. `api-http` — handle message

- Parses JSON. If **`ok === false`**, throws **`AppError`** with status **502**, code **`RUN_EXECUTION_FAILED`**, message from `error` or a default.
- If **`ok === true`**, returns **`{ runId, ...result }`** to the client (see [Run result payload](#run-result-payload-redis-pubsub)).
- **`finally`:** clears timeout and **`subscriber.quit()`**.

---

## How submit jobs move through the worker

```
parseJob(job.data)                    // Zod — judge-worker/src/schema/job.schema.ts
    │
    ▼
submitToJudge0(parsedJob)             // POST /submissions → token
    │
    ▼
pollForVerdict(token)                 // GET until terminal status.id in {3..14}
    │
    ▼
deriveVerdict(judgeResponse, totalTestCases)
    │
    ▼
pointsEarned = status === "accepted" ? totalPoints : 0
    │
    ▼
updateSubmission(dsaSubmissionId, payload)
    │
    ▼
if pointsEarned > 0 → updateAttemptScore(attemptId, pointsEarned)
```

**Errors**

- Invalid payload (`ZodError`) → thrown as **`UnrecoverableError`** (from `bullmq`, via `./errors`) → **no BullMQ retry**.
- Judge0 / poll / backend errors → may trigger **BullMQ retries** per job options (see [Retry & Failure Strategy](#retry--failure-strategy)).

---

## How run jobs move through the worker

```
parseRunJob(job.data)                 // Zod — run-job.schema.ts
    │
    ▼
submitRunToJudge0(language, sourceCode)
    │
    ▼
pollForVerdict(token)
    │
    ▼
PUBLISH responseChannel { ok: true, runId, token, status, stdout, stderr, ... }
```

On **any failure** after the job has started:

1. Logs the error.
2. **`PUBLISH`** `{ ok: false, runId, error: message }` so the HTTP layer always gets a reply.
3. Throws **`UnrecoverableError`** from **`bullmq`** (aliased as `BullUnrecoverableError` in code) so **BullMQ does not retry** — retries would republish to a channel the client may have already abandoned after timeout.

---

## Project Structure

```
judge-worker/
├── src/
│   ├── index.ts                    # Redis ping, createWorkers(), graceful shutdown
│   ├── worker.ts                   # Two Workers: QUEUE_NAME + RUN_QUEUE_NAME
│   ├── processor.ts                # Submit pipeline (DSA)
│   ├── runProcessor.ts             # Run pipeline + Redis PUBLISH
│   ├── judge/
│   │   ├── client.ts               # Axios → Judge0 RapidAPI
│   │   ├── submit.ts               # submitToJudge0 + submitRunToJudge0 (shared POST)
│   │   ├── poll.ts                 # Poll loop until terminal status
│   │   └── parse.ts                # parseStdout + deriveVerdict (submit only)
│   ├── backend/
│   │   ├── client.ts               # Axios → api-http internal API
│   │   ├── updateSubmission.ts     # PATCH DsaSubmission verdict
│   │   └── updateAttemptScore.ts   # PATCH attempt score
│   ├── queue/
│   │   ├── connection.ts           # ioredis: BullMQ + PUBLISH for runs
│   │   └── constants.ts            # Queue names, poll tuning, language map
│   ├── schema/
│   │   ├── job.schema.ts           # JudgeJob + Zod + UpdateSubmissionPayload
│   │   ├── run-job.schema.ts       # RunJob + Zod
│   │   └── judge0.schema.ts        # Judge0 DTOs + ParseResult
│   ├── errors/
│   │   └── index.ts                # Re-exports UnrecoverableError; custom errors
│   ├── logger/
│   │   └── index.ts                # Pino
│   └── shutdown/
│       └── graceful.ts             # SIGTERM/SIGINT; closes all workers
├── .env.example
├── Dockerfile
├── tsconfig.json
└── package.json
```

---

## File-by-File Reference

### Entry Point — `src/index.ts`

1. **`connection.ping()`** — fatal exit if Redis is down.
2. **`createWorkers()`** — registers **two** BullMQ workers (submit + run).
3. **`registerGracefulShutdown(workers)`** — closes every worker, then `connection.quit()`.
4. Logs **`queue`**, **`runQueue`**, **`concurrency`**, **`nodeEnv`** (no secrets).

---

### Worker Setup — `src/worker.ts`

**`createWorkers(): Worker[]`**

| Worker | Queue | Processor | Options |
|--------|-------|-----------|---------|
| Submit | `QUEUE_NAME` (`"judge"`) | `processJob` | `concurrency: WORKER_CONCURRENCY`, limiter `max: 10` / `duration: 1000` |
| Run | `RUN_QUEUE_NAME` (`"judge-run"`) | `processRunJob` | Same |

**Events** (both workers): `completed` (duration), `failed`, `error`, `stalled` — all log with `queueName` for disambiguation.

---

### Submit Job Processor — `src/processor.ts`

- **`parseJob`** from `./schema/job.schema`.
- Child logger fields: `jobId`, `dsaSubmissionId`, `attemptId`, `workerId` (BullMQ job id).
- **`deriveVerdict`** returns `{ status, testCasesPassed, executionTime }`.
- **`updateSubmission`** then conditional **`updateAttemptScore`**.

---

### Run Job Processor — `src/runProcessor.ts`

- **`parseRunJob`** from `./schema/run-job.schema`.
- Child logger: `runId`, `workerId`.
- **`executionTime`**: `Math.round(parseFloat(time) * 1000)` when Judge0 `time` is non-null.
- **Success publish** includes: `ok: true`, `runId`, `token`, `status`, `stdout`, `stderr`, `compileOutput` (from `compile_output`), `memory`, `executionTime`.
- **Failure**: publish `ok: false` + `error`, then **`UnrecoverableError`** to disable retries.

Uses **`connection`** from `./queue/connection` for **`publish`** (same Redis client as BullMQ).

---

### Queue Layer — `src/queue/`

#### `connection.ts`

Single **`ioredis`** instance:

- `maxRetriesPerRequest: null`, `enableReadyCheck: false` (required for BullMQ).
- Used by **BullMQ** workers and by **`connection.publish`** in the run processor.

#### `constants.ts`

| Export | Value / meaning |
|--------|------------------|
| `QUEUE_NAME` | `"judge"` |
| `RUN_QUEUE_NAME` | `"judge-run"` |
| `JOB_NAME` | `"dsa-submission"` (mirrors producer; worker listens to queue name) |
| `RUN_JOB_NAME` | `"dsa-run"` |
| `POLL_MAX_ATTEMPTS` | `20` |
| `POLL_INTERVAL_MS` | `1500` (~30s max poll) |
| `WORKER_CONCURRENCY` | `parseInt(process.env.WORKER_CONCURRENCY \|\| "4", 10)` |
| `JUDGE0_LANGUAGE_MAP` | `cpp: 54`, `python: 71`, `javascript: 63`, `java: 62` |
| `JUDGE0_TERMINAL_STATUSES` | `3`–`14` |

---

### Job Schemas — `src/schema/`

#### `job.schema.ts` — submit (`JudgeJob`)

| Field | Type | Meaning |
|-------|------|---------|
| `jobId` | string | UUID from producer (idempotency / tracing) |
| `dsaSubmissionId` | number | Row to PATCH |
| `attemptId` | number | Contest attempt (score increment) |
| `userId`, `problemId`, `contestId` | number | Context / auditing |
| `language` | enum | `cpp` \| `python` \| `javascript` \| `java` |
| `sourceCode` | string | Full harness for selected language |
| `totalTestCases` | number | For stdout parser |
| `totalPoints` | number | Awarded in full on `accepted` |

#### `run-job.schema.ts` — run (`RunJob`)

| Field | Type |
|-------|------|
| `runId` | string (UUID) |
| `language` | same enum as submit |
| `sourceCode` | string |
| `responseChannel` | string — Redis channel for `PUBLISH` |

#### `judge0.schema.ts`

- `Judge0SubmitRequest`, `Judge0SubmitResponse`, `Judge0StatusResponse`, `ParseResult`.

---

### Error Classes — `src/errors/index.ts`

| Class | When | Submit retries? | Run retries? |
|-------|------|-----------------|--------------|
| `UnrecoverableError` (`bullmq`) | Bad Zod payload; run failure after publish | No | No (run uses this after notifying client) |
| `JudgeApiError` | Judge0 non-2xx on submit/poll | Yes | Yes (until run catches and publishes + Unrecoverable) |
| `PollTimeoutError` | 20 polls without terminal status | Yes | Yes |
| `BackendApiError` | `api-http` 5xx (response interceptor) | Yes | N/A (run does not call backend) |

---

### Logger — `src/logger/index.ts`

Pino: JSON in production, pretty in development. **`childLogger(context)`** for per-job fields.

---

### Judge0 Integration — `src/judge/`

#### `submit.ts`

- **`submitSourceToJudge0(language, sourceCode)`** — shared implementation.
- **`submitToJudge0(job)`** — submit job harness.
- **`submitRunToJudge0(language, sourceCode)`** — run job.

POST **`/submissions?base64_encoded=false&wait=false`** with `{ language_id, source_code, stdin: "" }`. Unknown language → **`UnrecoverableError`**.

#### `poll.ts`

GET **`/submissions/:token?base64_encoded=false&fields=token,status,stdout,stderr,time,memory,compile_output`**. Loop until `status.id` ∈ `JUDGE0_TERMINAL_STATUSES`, else sleep `POLL_INTERVAL_MS`. Exhaustion → **`PollTimeoutError`**.

#### `parse.ts`

**Submit only:** **`parseStdout`**, **`deriveVerdict`** — see below. Run jobs **do not** use these; they forward raw Judge0 fields over pub/sub.

---

### Backend Integration — `src/backend/`

Only used by **submit** (`processor.ts`), not by **run**.

#### `client.ts`

Axios: `BACKEND_API_URL`, `Authorization: Bearer BACKEND_INTERNAL_SECRET`, 8s timeout. Interceptor throws **`BackendApiError`** on **5xx**.

#### `updateSubmission.ts` / `updateAttemptScore.ts`

PATCH paths as in [api-http contract](#api-http-contract-internal-patch). **3** attempts, **1s** delay, retry only on network errors (`ECONNREFUSED` / Axios no-response).

---

### Graceful Shutdown — `src/shutdown/graceful.ts`

**`registerGracefulShutdown(workers: Worker[])`**

1. 30s hard kill timer (`unref`).
2. **`Promise.all(workers.map((w) => w.close()))`**
3. **`connection.quit()`**
4. **`process.exit(0)`** (or `1` on hard kill).

---

## Stdout Parsing Algorithm

Used **only** for the **submit** path when Judge0 reports infra-level success (`status.id === 3`) and stdout is non-empty.

Harness prints markers (generated in `api-http` boilerplate):

```
__CASE__<index>
__OUTPUT__<result>     ← test passed path in harness
__ERROR__<message>    ← harness detected failure / exception
```

**`parseStdout`** (`parse.ts`):

- Empty stdout → `runtime_error`, 0 passed.
- Walk lines in order; on **`__ERROR__`** → stop, `runtime_error`.
- On **`__OUTPUT__`** → increment `testCasesPassed` (harness is responsible for comparison; worker trusts markers).
- After lines: if `testCasesPassed >= totalTestCases` → `accepted`; if partial → `wrong_answer`; if zero → `runtime_error`.

Does not throw; always returns a `ParseResult`.

---

## Verdict Derivation

**`deriveVerdict`** (`parse.ts`) maps Judge0 `status.id` + stdout to `{ status, testCasesPassed, executionTime }`:

| `status.id` | Result |
|-------------|--------|
| `5` | `time_limit_exceeded` |
| `6` | `runtime_error` (compile) |
| `7`–`14` | `runtime_error` (runtime / signal / NZEC, etc.) |
| `4` | `wrong_answer` |
| `3` | Empty stdout → `runtime_error`; else use **`parseStdout`** |

**Points:** `accepted` → `job.totalPoints`; else **0**.

**Execution time:** `time` string in seconds → ms, rounded; `null` if missing.

---

## Run result payload (Redis pub/sub)

Message body is a **JSON string** on `responseChannel`.

### Success (`ok: true`)

| Field | Notes |
|-------|--------|
| `ok` | `true` |
| `runId` | UUID from job |
| `token` | Judge0 submission token |
| `status` | Judge0 status object (`id`, `description`) |
| `stdout`, `stderr` | As returned by Judge0 |
| `compileOutput` | From `compile_output` |
| `memory` | Judge0 memory |
| `executionTime` | ms, derived from `time` |

The HTTP layer spreads this into the JSON response (plus its own `runId` normalization).

### Failure (`ok: false`)

| Field | Notes |
|-------|--------|
| `ok` | `false` |
| `runId` | UUID |
| `error` | String message |

---

## Retry & Failure Strategy

### BullMQ (both queues)

Producer defaults in **`api-http/src/lib/queue.ts`**: `attempts: 3`, exponential backoff from **2000 ms**, `removeOnComplete: { count: 500 }`, `removeOnFail: false`.

**Submit** retries make sense for transient Judge0 or `api-http` outages.

**Run** retries are **suppressed** on the failure path after a pub/sub message ( **`UnrecoverableError`** ), so the client does not get duplicate out-of-order messages on a stale channel.

### Internal backend retries (submit only)

`updateSubmission` / `updateAttemptScore`: **3** tries, **1 s** apart, only for network failures without HTTP response.

### Rate limiting

Per-worker limiter: **10** jobs started per **1000 ms** (both queues independently use the same limiter config).

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | No | `localhost` | Redis for BullMQ + pub/sub |
| `REDIS_PORT` | No | `6379` | |
| `REDIS_PASSWORD` | No | _(empty)_ | |
| `WORKER_CONCURRENCY` | No | `4` | Per-queue concurrency (each worker uses this value) |
| `NODE_ENV` | No | `development` | Logging format |
| `JUDGE0_API_URL` | Yes | — | Judge0 RapidAPI base URL |
| `JUDGE0_RAPIDAPI_HOST` | Yes | — | `Host` header |
| `JUDGE0_RAPIDAPI_KEY` | Yes | — | API key |
| `BACKEND_API_URL` | Yes* | — | `api-http` base URL (*required for submit pipeline) |
| `BACKEND_INTERNAL_SECRET` | Yes* | — | Bearer token for internal PATCH (*submit only) |

`api-http` needs matching **`REDIS_*`** and the same queue names (`judge`, `judge-run`).

---

## Running the Service

### Prerequisites

- Node.js 20+
- Redis (reachable from both `api-http` and `judge-worker`)
- Judge0 RapidAPI credentials
- For submit end-to-end: `api-http` running with internal PATCH routes implemented

### Development

```bash
cd judge-worker
npm install
cp .env.example .env
npm run dev
```

### Production

```bash
npm run build
npm start
```

---

## Docker

Multi-stage build: compile in `node:20-alpine`, run `node dist/index.js` as non-root. Pass the same env vars as above; ensure Redis is reachable from the container network.

```bash
docker build -t judge-worker .
docker run --env-file .env judge-worker
```

---

## api-http contract (internal PATCH)

The **submit** worker expects `api-http` to expose authenticated internal routes (Bearer `BACKEND_INTERNAL_SECRET`). Implement or verify these on the backend:

### `PATCH /api/internal/submissions/dsa/:dsaSubmissionId`

Body (JSON):

| Field | Type |
|-------|------|
| `status` | `"accepted" \| "wrong_answer" \| "time_limit_exceeded" \| "runtime_error"` |
| `pointsEarned` | `number` |
| `testCasesPassed` | `number` |
| `totalTestCases` | `number` |
| `executionTime` | `number \| null` |

### `PATCH /api/internal/attempts/:attemptId/score`

Body: `{ "pointsToAdd": number }` — should atomically increment contest attempt total score (e.g. Prisma `increment`).

**Run flow** does not use these endpoints; it only needs Redis + BullMQ alignment with `judge-worker`.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `bullmq` | Workers, queues, `UnrecoverableError` |
| `ioredis` | Redis (BullMQ connection + `publish`) |
| `axios` | Judge0 + `api-http` |
| `zod` | Job payload validation |
| `pino` / `pino-pretty` | Logging |
| `typescript`, `tsx`, `@types/node` | Dev / build |
