// Economy Service — Phase 6 load test (k6).
//
// Exercises the single-process backend under concurrent load: the REST baseline,
// the Judge0-bound /api/run path (which stresses the run-concurrency cap + the
// judge token bucket), and a WebSocket connect + AUTH handshake.
//
// Run (k6 installed separately — https://k6.io):
//   BASE_URL=http://localhost:3000 \
//   WS_URL=ws://localhost:3000 \
//   TOKEN="<a valid access JWT>" \
//   k6 run api-http/scripts/loadtest.k6.js
//
// Without TOKEN it only runs the unauthenticated /health baseline.
// Tune the server via WORKER_CONCURRENCY / JUDGE_RATE_MAX / RUN_MAX_CONCURRENCY
// and re-run to find the ceiling (see loadtest.README.md).

import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const WS_URL = __ENV.WS_URL || "";
const TOKEN = __ENV.TOKEN || "";
const CONTEST_ID = Number(__ENV.CONTEST_ID || "1");

const runErrors = new Rate("run_errors");
const runLatency = new Trend("run_latency_ms", true);

export const options = {
  scenarios: {
    // Ramp REST + run load: 0 → 200 VUs over 1m, hold 2m, ramp down.
    api: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 200 },
        { duration: "2m", target: 200 },
        { duration: "30s", target: 0 },
      ],
      exec: "apiLoad",
    },
    // A steady pool of WebSocket connections held open through the test.
    sockets: {
      executor: "constant-vus",
      vus: WS_URL && TOKEN ? 100 : 0,
      duration: "3m30s",
      exec: "wsLoad",
    },
  },
  thresholds: {
    // Health stays fast even while judging runs (judging is IO-bound on Judge0).
    "http_req_duration{endpoint:health}": ["p(95)<300"],
    run_errors: ["rate<0.02"],
  },
};

export function apiLoad() {
  // Baseline REST latency.
  const health = http.get(`${BASE_URL}/health`, { tags: { endpoint: "health" } });
  check(health, { "health 200": (r) => r.status === 200 });

  // Judge0-bound path — only when authenticated.
  if (TOKEN) {
    const payload = JSON.stringify({
      code: 'print("hello")',
      language: "python",
    });
    const res = http.post(`${BASE_URL}/api/run`, payload, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      tags: { endpoint: "run" },
      timeout: "40s",
    });
    runLatency.add(res.timings.duration);
    // 200 ok; 429 (rate limited) and 504 (timeout under overload) are expected
    // backpressure, not server faults — only 5xx≠504 counts as an error.
    const ok = res.status === 200 || res.status === 429 || res.status === 504;
    runErrors.add(!ok);
    check(res, { "run not a hard error": () => ok });
  }

  sleep(1);
}

export function wsLoad() {
  if (!WS_URL || !TOKEN) return;
  const res = ws.connect(WS_URL, {}, (socket) => {
    socket.on("open", () => {
      socket.send(JSON.stringify({ type: "AUTH", token: TOKEN, contestId: CONTEST_ID }));
    });
    socket.on("message", () => {
      /* CONNECTED / LEADERBOARD_UPDATE / SUBMISSION_RESULT frames */
    });
    // Hold the connection so the server accumulates real concurrent sockets.
    socket.setTimeout(() => socket.close(), 30_000);
  });
  check(res, { "ws connected (101)": (r) => r && r.status === 101 });
}
