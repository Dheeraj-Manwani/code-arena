# Load test & hardening runbook (Economy Service — Phase 6)

Goal: confirm the single process stays responsive under a realistic contest and
find the right values for the tuning knobs.

## Prerequisites
- The server running against a real Postgres + Judge0 (`pnpm dev` or `pnpm build && pnpm start`).
- [k6](https://k6.io) installed.
- A valid access JWT for an authenticated user (log in via the app / API and copy
  the access token) to exercise `/api/run` and the WebSocket handshake.

## Run
```bash
BASE_URL=http://localhost:3000 \
WS_URL=ws://localhost:3000 \
TOKEN="<access JWT>" \
CONTEST_ID=1 \
k6 run api-http/scripts/loadtest.k6.js
```
Omit `TOKEN` to run only the unauthenticated `/health` baseline.

## What it exercises
- **REST baseline** (`/health`) — proves HTTP stays fast (`p95 < 300ms`) while judging runs.
- **`/api/run`** — the synchronous, Judge0-bound path. Stresses the run-concurrency
  cap (`RUN_MAX_CONCURRENCY`) and the judge token bucket (`JUDGE_RATE_MAX`). Under
  overload, `429` (rate limited) and `504` (timeout) are **expected backpressure**,
  not faults — the test only flags other 5xx.
- **WebSocket** — 100 held-open connections doing the AUTH handshake, so the
  heartbeat/room bookkeeping runs under real concurrency.

## Tuning knobs (env on the server)
| Var | Default | Effect |
|---|---|---|
| `WORKER_CONCURRENCY` | 4 | Parallel DSA judgings in the in-process pool. |
| `JUDGE_RATE_MAX` | 10 | Judge0 calls allowed per window (respect your RapidAPI limit). |
| `JUDGE_RATE_WINDOW_MS` | 1000 | Token-bucket window. |
| `RUN_MAX_CONCURRENCY` | 8 | Concurrent `/api/run` executions. |
| `RUN_TIMEOUT_MS` | 35000 | Per-run timeout. |

Judging is **IO-bound** (mostly awaiting Judge0), so concurrency can be well above
CPU count; the real ceiling is usually your Judge0/RapidAPI quota — keep
`JUDGE_RATE_MAX` at or below it.

## What to look for / exit criteria
- `/health` `p95` stays within target while runs/judgings are in flight (event
  loop isn't starved).
- Judge0 calls never exceed `JUDGE_RATE_MAX` per window.
- **Crash-recovery:** kill the process mid-load, restart, and confirm the boot
  reconciler (`jobs/reconcile.ts`) re-judges any submissions left `pending` — no
  lost verdicts.

## Extending to the submit flow
`/api/run` is the easiest high-load path (no lifecycle setup). To load-test the
full DSA **submit** pipeline, script: create attempt → `POST .../dsa/:id/submit`
→ observe the WS `SUBMISSION_RESULT`. That needs per-VU contest/attempt setup, so
it's left as a follow-up scenario.
