# Code Arena — Complete Project Reference

This document covers everything implemented across all services in the Code Arena monorepo as of the current state of the codebase.

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Repository Structure](#2-repository-structure)
- [3. Tech Stack](#3-tech-stack)
- [4. api-http (Backend)](#4-api-http-backend)
  - [4.1 Architecture](#41-architecture)
  - [4.2 Database Schema (Prisma)](#42-database-schema-prisma)
  - [4.3 API Endpoints](#43-api-endpoints)
  - [4.4 Authentication Flow](#44-authentication-flow)
  - [4.5 Middleware](#45-middleware)
  - [4.6 Validation Schemas](#46-validation-schemas)
  - [4.7 Error Handling](#47-error-handling)
  - [4.8 Boilerplate Generation](#48-boilerplate-generation)
  - [4.9 Code Execution (Current State)](#49-code-execution-current-state)
  - [4.10 Environment Variables](#410-environment-variables)
- [5. web-user (Frontend)](#5-web-user-frontend)
  - [5.1 Architecture](#51-architecture)
  - [5.2 Routing](#52-routing)
  - [5.3 Pages](#53-pages)
  - [5.4 Components](#54-components)
  - [5.5 State Management](#55-state-management)
  - [5.6 API Integration](#56-api-integration)
  - [5.7 Auth Flow (Frontend)](#57-auth-flow-frontend)
  - [5.8 Schemas](#58-schemas)
  - [5.9 Styling](#59-styling)
- [6. judge-worker (Submission Processor)](#6-judge-worker-submission-processor)
  - [6.1 Architecture](#61-architecture)
  - [6.2 Job Lifecycle](#62-job-lifecycle)
  - [6.3 File-by-File Reference](#63-file-by-file-reference)
  - [6.4 Stdout Parsing & Verdict Derivation](#64-stdout-parsing--verdict-derivation)
  - [6.5 Retry & Failure Strategy](#65-retry--failure-strategy)
  - [6.6 Environment Variables](#66-environment-variables)
- [7. Cross-Service Communication](#7-cross-service-communication)
- [8. What Is Not Yet Implemented](#8-what-is-not-yet-implemented)

---

## 1. Overview

Code Arena is a full-stack competitive coding platform where:

- **Creators** design contests containing MCQ and DSA questions
- **Contestees** attempt those contests in timed or practice modes
- Submissions are judged via Judge0 (RapidAPI) through a background worker
- Results feed into per-contest leaderboards

The platform is split into independent services that communicate through HTTP APIs and a Redis-backed job queue.

---

## 2. Repository Structure

```
code-arena/
├── api-http/           # Express backend (REST API + Prisma + PostgreSQL)
├── web-user/           # React frontend for contestees (Vite + TanStack Query)
├── judge-worker/       # BullMQ worker for DSA code judging via Judge0
├── realtime-gateway    # websocket service responsible for notification and realtime leaderboard using redis sorted set (to be implemented)
├── docs/               # Documentation
│   ├── API_HTTP_DB_REFERENCE.md
│   ├── JUDGE_WORKER.md
│   └── PROJECT_REFERENCE.md  (this file)
└── README.md           # Root-level project overview
```

There is no root-level workspace configuration (no `pnpm-workspace.yaml`, `turbo.json`, or `docker-compose.yml`). Each service has its own `package.json` and is managed independently.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Node.js, Express 5, TypeScript, Prisma 5.7, PostgreSQL |
| **Frontend** | React 19, Vite 7, TypeScript, TanStack React Query 5 |
| **State Management** | Zustand (client), React Query (server) |
| **Styling** | Tailwind CSS 4, Radix UI primitives, shadcn/ui components |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Worker** | Node.js, BullMQ, ioredis |
| **Code Execution** | Judge0 CE via RapidAPI |
| **Validation** | Zod (shared schemas across services) |
| **Auth** | JWT (access + refresh tokens), bcrypt, email OTP via Resend |
| **Logging** | Pino (judge-worker) |

---

## 4. api-http (Backend)

### 4.1 Architecture

The backend follows a layered architecture:

```
Routes → Controllers → Services → Repositories → Prisma (PostgreSQL)
```

| Layer | Responsibility |
|---|---|
| **Routes** (`src/routes/`) | Map HTTP methods to controller functions, apply middleware |
| **Controllers** (`src/controllers/`) | Parse/validate request input (Zod), call services, return standardized response |
| **Services** (`src/services/`) | Business logic — contest phase rules, submission scoring, auth flows |
| **Repositories** (`src/repositories/`) | Direct Prisma queries, zero business logic |
| **Lib** (`src/lib/db.ts`) | Prisma client singleton |

All responses use `sendSuccess(res, data)` / `sendError(res, code, message, statusCode)` from `src/util/response.ts`, producing the shape `{ success, data, error }`.

**Entry point:** `src/index.ts` — mounts CORS, morgan, cookie-parser, body-parser, all route groups, and the global error handler.

#### Source Files

```
api-http/src/
├── index.ts                              # Express app setup + route mounting
├── lib/
│   └── db.ts                             # Prisma singleton
├── controllers/
│   ├── auth.controller.ts
│   ├── contest.controller.ts
│   ├── dashboard.controller.ts
│   ├── leaderboard.controller.ts
│   ├── problem.controller.ts
│   ├── profile.controller.ts
│   ├── run.controller.ts
│   ├── stats.controller.ts
│   └── submission.controller.ts
├── routes/
│   ├── auth.routes.ts
│   ├── contest.routes.ts
│   ├── dashboard.routes.ts
│   ├── leaderboard.routes.ts
│   ├── problem.routes.ts
│   ├── profile.routes.ts
│   ├── run.routes.ts
│   ├── stats.routes.ts
│   └── submission.routes.ts
├── services/
│   ├── auth.service.ts
│   ├── contest.service.ts
│   ├── leaderboard.service.ts
│   ├── problem.service.ts
│   ├── profile.service.ts
│   ├── run.service.ts                    # Empty — not yet implemented
│   ├── stats.service.ts
│   └── submission.service.ts
├── repositories/
│   ├── attempt.repository.ts
│   ├── contest.repository.ts
│   ├── otp.repository.ts
│   ├── problem.repository.ts
│   ├── profile.repository.ts
│   ├── stats.repository.ts
│   ├── submission.repository.ts
│   └── user.repository.ts
├── middleware/
│   ├── auth.ts                           # JWT auth + role guards
│   └── error-handler.ts                  # Global error handler
├── schema/
│   ├── auth.schema.ts
│   ├── contest.schema.ts
│   ├── error.schema.ts
│   ├── language.schema.ts
│   ├── leaderboard.schema.ts
│   ├── problem.schema.ts
│   ├── profile.schema.ts
│   ├── submission.schema.ts
│   └── user.schema.ts
├── errors/
│   ├── app-error.ts                      # Base AppError class
│   ├── auth.errors.ts
│   ├── contest.errors.ts
│   ├── problem.errors.ts
│   └── submission.errors.ts
├── util/
│   ├── response.ts                       # sendSuccess / sendError helpers
│   ├── otp.ts                            # OTP generation + Resend email
│   ├── mappers.ts                        # DB→API shape transformers
│   ├── codeExecutor.ts                   # Stub — always returns "accepted"
│   └── boilerplate/
│       ├── types.ts                      # Boilerplate type definitions
│       ├── index.ts                      # Entrypoint for boilerplate utilities
│       ├── userBoilerplate.ts            # Editor boilerplate for users
│       ├── judgeBoilerplate.ts           # Full harness for Judge0
│       └── runJudgeBoilerplate.ts        # Dev helper — logs harness from submission ID
└── types/
    └── express.d.ts                      # req.userId / req.userRole augmentation
```

---

### 4.2 Database Schema (Prisma)

**Enums:**

| Enum | Values |
|---|---|
| `Role` | `creator`, `contestee` |
| `SubmissionStatus` | `pending`, `accepted`, `wrong_answer`, `time_limit_exceeded`, `runtime_error` |
| `ContestType` | `practice`, `competitive` |
| `Difficulty` | `easy`, `medium`, `hard` |
| `ContestStatus` | `draft`, `published`, `active`, `completed`, `cancelled` |
| `AttemptStatus` | `in_progress`, `submitted`, `timed_out` |

**Models:**

| Model | Purpose | Key Fields |
|---|---|---|
| `User` | Platform user | `id`, `email`, `username`, `password`, `role`, `isVerified`, `avatarUrl` |
| `Contest` | A coding contest | `id`, `title`, `description`, `type`, `status`, `startTime`, `endTime`, `duration`, `creatorId` |
| `ContestQuestion` | Join table: Contest ↔ Question | `id`, `contestId`, `mcqQuestionId?`, `dsaProblemId?`, `order`, `points` |
| `McqQuestion` | Multiple choice question | `id`, `question`, `options` (JSON), `correctOption`, `explanation`, `difficulty`, `creatorId` |
| `DsaProblem` | DSA coding problem | `id`, `title`, `description`, `difficulty`, `points`, `signature` (JSON), `creatorId` |
| `TestCase` | Test case for DSA problem | `id`, `dsaProblemId`, `input` (JSON), `expectedOutput`, `isHidden`, `order` |
| `ContestAttempt` | A user's attempt at a contest | `id`, `userId`, `contestId`, `status`, `startedAt`, `deadline`, `totalPoints`, `currentProblemId?` |
| `McqSubmission` | MCQ answer submission | `id`, `attemptId`, `questionId`, `selectedOption`, `isCorrect`, `pointsEarned` |
| `DsaSubmission` | DSA code submission | `id`, `attemptId`, `problemId`, `language`, `code`, `status`, `pointsEarned`, `testCasesPassed`, `totalTestCases`, `executionTime` |
| `DraftAnswer` | Auto-saved draft | `id`, `attemptId`, `problemId`, `type`, `mcqAnswer?`, `dsaCode?`, `language?` |
| `ContestLeaderboard` | Leaderboard row | `id`, `contestId`, `userId`, `totalPoints`, `rank` — **exists in schema but not used in code** |
| `EmailOtp` | Email OTP for verification | `id`, `email`, `hashedOtp`, `expiresAt`, `isUsed` |

**Key relationships:**
- `User` 1→N `Contest` (creator)
- `User` 1→N `ContestAttempt`
- `Contest` 1→N `ContestQuestion` → optional `McqQuestion` or `DsaProblem`
- `ContestAttempt` 1→N `McqSubmission`, `DsaSubmission`, `DraftAnswer`
- `DsaProblem` 1→N `TestCase`

**Unique constraints:**
- `McqSubmission`: `@@unique([attemptId, questionId])` — one submission per MCQ per attempt
- `DsaSubmission`: `@@unique([attemptId, problemId])` — one submission per DSA per attempt
- `DraftAnswer`: `@@unique([attemptId, problemId])` — one draft per problem per attempt

---

### 4.3 API Endpoints

#### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Returns `"ok"` |

#### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register user or resend OTP if unverified |
| POST | `/api/auth/verify` | No | Verify OTP, issue tokens, set refresh cookie |
| POST | `/api/auth/login` | No | Login with email + password, issue tokens |
| POST | `/api/auth/refresh` | Cookie | Refresh access token using httpOnly cookie |
| POST | `/api/auth/logout` | No | Clear refresh cookie |
| POST | `/api/auth/forgot-password` | No | Send OTP for password reset |
| POST | `/api/auth/reset-password` | No | Verify OTP + set new password |

#### Contests (`/api/contests`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/contests` | JWT | Paginated contest list (creators see all, contestees see filtered) |
| GET | `/api/contests/:contestId` | JWT | Contest detail (`?includeQuestions=true` for full data) |
| POST | `/api/contests` | JWT + Creator | Create a new contest |
| PATCH | `/api/contests/:contestId` | JWT + Creator | Update contest metadata and optionally relink questions |
| POST | `/api/contests/:contestId/mcq` | JWT + Creator | Create and add an MCQ to the contest |
| POST | `/api/contests/:contestId/dsa` | JWT + Creator | Create and add a DSA problem to the contest |
| POST | `/api/contests/:contestId/link/mcq` | JWT + Creator | Link an existing MCQ to the contest |
| POST | `/api/contests/:contestId/link/dsa` | JWT + Creator | Link an existing DSA to the contest |
| DELETE | `/api/contests/:contestId/link/mcq/:questionId` | JWT + Creator | Unlink an MCQ from the contest |
| DELETE | `/api/contests/:contestId/link/dsa/:problemId` | JWT + Creator | Unlink a DSA from the contest |
| PATCH | `/api/contests/:contestId/reorder` | JWT + Creator | Reorder questions within the contest |

#### Leaderboard

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/contests/:contestId/leaderboard` | JWT | Computed leaderboard from MCQ + DSA submissions (DSA uses max points per user per problem) |

#### Problems (`/api/problems`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/problems/mcq` | JWT + Creator | List all MCQ questions created by the user |
| GET | `/api/problems/dsa` | JWT + Creator | List all DSA problems created by the user |
| POST | `/api/problems/mcq` | JWT + Creator | Create a standalone MCQ question |
| POST | `/api/problems/dsa` | JWT + Creator | Create a standalone DSA problem |
| GET | `/api/problems/mcq/:questionId` | JWT + Creator | Get a specific MCQ by ID |
| GET | `/api/problems/dsa/:problemId` | JWT + Creator | Get a specific DSA problem + derived boilerplate |
| PATCH | `/api/problems/mcq/:questionId` | JWT + Creator | Update an MCQ |
| PATCH | `/api/problems/dsa/:problemId` | JWT + Creator | Update a DSA problem |
| GET | `/api/problems/:problemId` | JWT | Contestee-facing: get DSA problem (requires contest link) |

#### Submissions & Attempts (`/api`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/contests/:contestId/attempt` | JWT | Create or retrieve an existing attempt for the contest |
| GET | `/api/contests/:contestId/attempt/:attemptId` | JWT | Get attempt details + contest data + saved drafts |
| POST | `/api/contests/:contestId/attempt/:attemptId/submit` | JWT | Finalize the attempt (mark as submitted) |
| POST | `/api/contests/:cId/attempt/:aId/mcq/:qId/submit` | JWT | Submit MCQ answer (qId = ContestQuestion ID) |
| POST | `/api/contests/:cId/attempt/:aId/dsa/:pId/submit` | JWT | Submit DSA code (pId = ContestQuestion ID) |
| PUT | `/api/contests/:cId/attempt/:aId/draft/mcq/:qId` | JWT | Save MCQ draft answer |
| PUT | `/api/contests/:cId/attempt/:aId/draft/dsa/:pId` | JWT | Save DSA draft code |

#### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard-feed` | JWT | Featured contest + latest competitive + practice contests |

#### Stats & Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/stats` | JWT + Creator | Aggregate creator statistics (contest/problem/submission counts) |
| GET | `/api/profile` | JWT | User profile + stats + recent attempt history |

#### Run Code

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/run` | JWT | Run code — **service is empty, not yet implemented** |

---

### 4.4 Authentication Flow

```
                     ┌──────────┐
          signup     │          │     verify OTP
    ┌───────────────▶│ Unverified├──────────────┐
    │                │  User     │              │
    │                └──────────┘              ▼
┌───────┐                              ┌──────────┐
│Browser│  login (verified users)      │ Verified │
│       │◀─────────────────────────────│   User   │
└───┬───┘     access token (30m)       └──────────┘
    │         + refresh cookie (7d)
    │
    │   POST /api/auth/refresh (cookie)
    ├──────────────────────────────────▶ New access token
    │
    │   Authorization: Bearer <access>
    └──────────────────────────────────▶ Protected routes
```

- **Access token**: 30 minutes, sent via `Authorization: Bearer` header
- **Refresh token**: 7 days, stored in an httpOnly cookie on path `/api/auth/refresh`
- **OTP**: SHA-256 hashed, 5-minute expiry, sent via Resend email service
- **Password**: bcrypt hashed in the database
- The backend throws at startup if `ACCESS_TOKEN_SECRET` or `REFRESH_TOKEN_SECRET` is missing

---

### 4.5 Middleware

| Middleware | File | Purpose |
|---|---|---|
| `authenticateToken` | `middleware/auth.ts` | Verifies JWT access token from `Authorization` header, loads `req.userId` and `req.userRole` from the database |
| `requireCreator` | `middleware/auth.ts` | Rejects non-creator users (403) |
| `requireContestee` | `middleware/auth.ts` | Rejects non-contestee users (403) |
| `errorHandler` | `middleware/error-handler.ts` | Global error handler: Zod → 400, Prisma P2002 → 400, AppError → custom code, else → 500 |

**Global middleware stack** (in order):
1. CORS — origins from `ALLOWED_HOSTS` or `localhost:5173`, credentials enabled
2. Morgan — `"dev"` format request logging
3. cookie-parser
4. body-parser — JSON + URL-encoded with size limits
5. Route handlers
6. Error handler (catch-all)

---

### 4.6 Validation Schemas

All input validation uses Zod schemas defined in `src/schema/`:

| File | Covers |
|---|---|
| `auth.schema.ts` | Signup (with optional role, default contestee), login, OTP verify, forgot/reset password |
| `contest.schema.ts` | Create/update contests with practice vs competitive rules, list query params |
| `problem.schema.ts` | MCQ/DSA CRUD, boilerplate signatures, test cases, difficulty |
| `submission.schema.ts` | MCQ/DSA submit payloads, attempt status, `RunCodeSchema` (defined but unused) |
| `language.schema.ts` | Language enum (`cpp`, `java`, `js`, `python`), Judge0 language ID map, language configs |
| `user.schema.ts` | `SessionUserSchema`, `RoleEnum` |
| `error.schema.ts` | `ApiErrorCode` enum for standardized error responses |
| `profile.schema.ts` | Profile response shape |
| `leaderboard.schema.ts` | Leaderboard entry shapes for API and UI |

---

### 4.7 Error Handling

Custom error hierarchy:

```
AppError (base)
├── AuthError          — authentication/authorization failures
├── ContestError       — contest-specific business rule violations
├── ProblemError       — problem CRUD errors
└── SubmissionError    — submission/attempt errors
```

Each error carries an `ApiErrorCode` string and an HTTP status code. The global error handler maps these to the standardized response shape.

---

### 4.8 Boilerplate Generation

The `src/util/boilerplate/` module generates code for DSA problems:

| File | Purpose |
|---|---|
| `types.ts` | Type definitions for boilerplate parameters and signatures |
| `userBoilerplate.ts` | Generates the editor stub shown to users (function signature only) |
| `judgeBoilerplate.ts` | Generates the full Judge0 harness (user function + test runner + `__CASE__`/`__OUTPUT__`/`__ERROR__` marker output) |
| `runJudgeBoilerplate.ts` | Dev helper script — fetches a submission from DB and logs the generated harness |

The harness embeds all test cases and expected outputs. It prints structured markers to stdout that the `judge-worker` parses to determine per-test results.

---

### 4.9 Code Execution (Current State)

- `src/util/codeExecutor.ts` — **stub**: always returns `status: "accepted"` with `testCasesPassed: 4` regardless of input
- `src/services/run.service.ts` — **empty**: `POST /api/run` returns no meaningful data
- DSA submission path (`submission.service.submitDsa`) calls the stub executor and saves results directly
- The real execution path will route through `judge-worker` via BullMQ (not yet wired)

---

### 4.10 Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Prisma) |
| `DIRECT_URL` | Direct DB URL for Prisma migrations |
| `PORT` | Server port (default 3000) |
| `NODE_ENV` | Environment mode |
| `ALLOWED_HOSTS` | Comma-separated CORS origins |
| `ACCESS_TOKEN_SECRET` | JWT signing secret for access tokens |
| `REFRESH_TOKEN_SECRET` | JWT signing secret for refresh tokens |
| `RESEND_API_KEY` | Resend.com API key for OTP emails |
| `GEMINI_API_KEY` | Google Gemini API key (present in .env, usage not confirmed in source) |
| `AWS_ACCESS_KEY_ID` | AWS credentials (present in .env) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials (present in .env) |
| `AWS_REGION` | AWS region |
| `S3_BUCKET_NAME` | S3 bucket for file storage |
| `CLOUDFRONT_URL` | CDN URL for served assets |

---

## 5. web-user (Frontend)

### 5.1 Architecture

A React 19 SPA built with Vite. Not Next.js — purely client-side routing via React Router v7.

```
Pages → Components → Hooks/Queries → API Layer → api-http
                         ↕
                    Zustand Stores
```

#### Source Files

```
web-user/src/
├── main.tsx                           # ReactDOM root
├── App.tsx                            # Router + providers
├── routes.tsx                         # All route definitions
├── index.css                          # Tailwind + custom theme
├── api/                               # Axios call wrappers
│   ├── auth.ts, contest.ts, dashboard.ts, leaderboard.ts,
│   ├── profile.ts, run.ts, stats.ts, submission.ts
├── components/
│   ├── common/                        # Shared UI (navbar, dialogs, timer, badges)
│   ├── contest/                       # Contest attempt UI (MCQ, DSA, test cases, results)
│   ├── dashboard/                     # Contest cards, filters, featured contest
│   ├── auth/                          # OTP verification
│   └── ui/                            # shadcn/Radix primitives
├── hooks/
│   └── use-mobile.tsx                 # Responsive breakpoint hook
├── lib/
│   ├── axios.ts                       # Axios instance + interceptors
│   ├── queryClient.ts                 # TanStack Query config
│   ├── utils.ts                       # cn() utility
│   ├── animations.ts                  # Motion animation presets
│   └── error-messages.ts              # API error code → user message map
├── mappers/
│   └── contest.mapper.ts             # API → UI data transformations
├── pages/                             # Route-level page components
├── queries/                           # TanStack Query hooks (queries + mutations)
├── schema/                            # Zod schemas (shared with backend)
└── stores/
    ├── auth.store.ts                  # Auth state (Zustand)
    └── contestAttempt.store.ts        # Contest attempt state (Zustand + localStorage)
```

---

### 5.2 Routing

| Route | Guard | Page Component |
|---|---|---|
| `/login` | `AuthRoute` | `Login` |
| `/signup` | `AuthRoute` | `Signup` |
| `/forgot-password` | `AuthRoute` | `ForgotPassword` |
| `/` | `ProtectedRoute` | Redirect → `/dashboard` |
| `/dashboard` | `ProtectedRoute` | `Dashboard` |
| `/contests` | `ProtectedRoute` | `Contests` |
| `/contest/:id/details` | `ProtectedRoute` | `ContestDetails` |
| `/contest/:contestId/attempt/:attemptId` | `ProtectedRoute` | `ContestPage` (full-screen, no navbar) |
| `/contest/:contestId/attempt/:attemptId/leaderboard` | `ProtectedRoute` | `ContestLeaderboardPage` |
| `/my-contests` | `ProtectedRoute` | `MyContests` |
| `/leaderboard/:contestId?` | `ProtectedRoute` | `Leaderboard` |
| `/profile` | `ProtectedRoute` | `Profile` |
| `/results/:attemptId` | `ProtectedRoute` | `ContestResultsPage` |
| `*` | None | `NotFound` |

- `AuthRoute`: redirects authenticated users to `/dashboard`
- `ProtectedRoute`: redirects unauthenticated users to `/login`, renders `AppNavbar` for non-contest routes

---

### 5.3 Pages

| Page | Description |
|---|---|
| `Login` | Email + password login form with animated UI |
| `Signup` | Registration form → OTP verification flow |
| `ForgotPassword` | Email → OTP → new password flow |
| `Dashboard` | Featured contest banner + latest competitive + practice contest grids |
| `Contests` | Filterable list of all published contests |
| `ContestDetails` | Contest info page with "Enter Contest" dialog |
| `ContestPage` | Full-screen contest attempt: question navigation, MCQ/DSA views, code editor, test panel, timer, submit dialog |
| `ContestLeaderboardPage` | Leaderboard during active contest attempt |
| `MyContests` | User's past attempts — **not yet populated** (empty `attempts` array + TODO) |
| `Leaderboard` | Standalone leaderboard page per contest |
| `Profile` | User profile with stats and recent attempt history |
| `ContestResultsPage` | Post-attempt results — **placeholder** |
| `NotFound` | 404 page |

---

### 5.4 Components

#### Common

| Component | Purpose |
|---|---|
| `AppNavbar` | Top navigation with logo and contextual links based on route |
| `AppBreadcrumb` | Breadcrumb navigation |
| `ContestSubmitDialog` | Confirmation dialog for early contest submission |
| `CountdownTimer` | Live countdown to contest deadline |
| `EmptyState` | Placeholder for empty data lists |
| `EnterContestDialog` | Dialog to start a contest attempt |
| `StatusBadge` | Color-coded badge for contest/submission status |
| `BorderTrail` | Animated border decoration |

#### Contest

| Component | Purpose |
|---|---|
| `ContestPage` | Orchestrator: loads attempt, syncs Zustand store, manages question navigation, handles submit/draft/leave |
| `ContestHeader` | Timer, progress indicator, leaderboard toggle |
| `MCQQuestion` | Multiple choice question with option selection |
| `DSAQuestion` | Monaco code editor + language selector + run code button |
| `TestCasePanel` | Test case input/output display with tabs for each case |
| `ContestNavigationFooter` | Question prev/next navigation — **currently commented out** |
| `ContestLeaderboardPanel` | In-contest leaderboard — **uses mock animated data**, not connected to API |
| `ResultsPage` | Reusable results display component |

#### Auth

| Component | Purpose |
|---|---|
| `OtpVerification` | 6-digit OTP input with resend functionality |

#### Infrastructure

| Component | Purpose |
|---|---|
| `AppInitializer` | Blocks UI until auth initialization completes |
| `ProtectedRoute` | Auth guard + navbar layout wrapper |
| `AuthRoute` | Redirect-if-authenticated guard |
| `ErrorBoundary` | React error boundary with fallback UI |
| `RouteErrorBoundary` | Route-level error boundary (404 vs other) |
| `Loader` | Loading spinner |

---

### 5.5 State Management

#### Zustand — `auth.store.ts`

| Field | Type | Purpose |
|---|---|---|
| `user` | `SessionUser \| null` | Current authenticated user |
| `accessToken` | `string \| null` | JWT access token (in-memory only) |
| `isAuthenticated` | `boolean` | Auth status flag |
| `isLoading` | `boolean` | True during initial auth check |

Actions: `setAuth`, `setUnauthenticated`, `logout`

#### Zustand — `contestAttempt.store.ts` (persisted to localStorage)

| Field | Type | Purpose |
|---|---|---|
| `contestId` | `number \| null` | Active contest ID |
| `attemptId` | `number \| null` | Active attempt ID |
| `currentQuestionIndex` | `number` | Currently viewed question |
| `mcqAnswer` | `number \| null` | Selected MCQ option |
| `dsaCode` | `Record<Language, string>` | Code per language |
| `submittedQuestionIds` | `Set<number>` | Already submitted questions |

#### Server State — TanStack React Query

All API data is managed as query/mutation hooks in `src/queries/`:
- `auth.queries.ts` / `auth.mutations.ts` — login, signup, verify, refresh
- `contest.queries.ts` / `contest.mutations.ts` — contest list, detail, attempt creation
- `dashboard.queries.ts` — dashboard feed
- `leaderboard.queries.ts` — leaderboard data
- `profile.queries.ts` — user profile
- `submission.mutations.ts` — MCQ/DSA submit, draft save

Query client defaults: no retry, no refetch on window focus.

---

### 5.6 API Integration

**Axios instance** (`src/lib/axios.ts`):
- Base URL from `import.meta.env.VITE_API_URL`
- `withCredentials: true` (sends cookies for refresh)
- Request interceptor: attaches `Authorization: Bearer <accessToken>` from Zustand
- Response interceptor: maps API error codes to user-friendly messages via `error-messages.ts`, shows toast notifications

**API modules** (`src/api/`):
- `auth.ts` — signup, login, verify, refresh, logout, forgot/reset password
- `contest.ts` — CRUD, list, detail, attempt management
- `dashboard.ts` — dashboard feed
- `leaderboard.ts` — leaderboard data
- `profile.ts` — user profile
- `run.ts` — `POST /api/run` with code payload
- `submission.ts` — MCQ/DSA submit + draft save
- `stats.ts` — mostly commented/placeholder

---

### 5.7 Auth Flow (Frontend)

1. **App startup**: `AppInitializer` calls `POST /api/auth/refresh` via `useAuthInitQuery`
   - Success → `setAuth(user, accessToken)` — user is logged in
   - Failure → `setUnauthenticated` — redirect to login
2. **Login**: `POST /api/auth/login` → `setAuth`
3. **Signup**: `POST /api/auth/signup` → OTP step → `POST /api/auth/verify` → `setAuth`
4. **Forgot password**: `POST /api/auth/forgot-password` → OTP → `POST /api/auth/reset-password`
5. **Logout**: `POST /api/auth/logout` → `logout()` in Zustand (clears in-memory token)

Tokens are never stored in localStorage — access token lives in Zustand (memory), refresh token in an httpOnly cookie.

---

### 5.8 Schemas

The frontend has its own `src/schema/` folder with Zod schemas that mirror the backend:

| File | Purpose |
|---|---|
| `auth.schema.ts` | Signup, login, OTP, forgot/reset password validation |
| `contest.schema.ts` | Contest types, status, create/update forms |
| `problem.schema.ts` | MCQ/DSA types, test cases, boilerplate signatures |
| `submission.schema.ts` | Submit payloads, attempt status, contest attempt interface |
| `language.schema.ts` | Language enum, Monaco/Judge0 IDs, boilerplate config |
| `user.schema.ts` | Session user type |
| `error.schema.ts` | API error code enum |
| `leaderboard.schema.ts` | Leaderboard entry types |
| `profile.schema.ts` | Profile response types |

---

### 5.9 Styling

- **Tailwind CSS 4** via Vite plugin (`@tailwindcss/vite`)
- **Theme**: Dark-first design with HSL CSS variables, shadcn "new-york" style, custom `arena-*` tokens
- **Fonts**: Inter (body) + JetBrains Mono (code)
- **UI Library**: Radix UI primitives wrapped as shadcn-style components (button, card, dialog, input, select, tabs, tooltip, badge, avatar, skeleton, progress, resizable panels)
- **Animations**: Motion library for page transitions, `tw-animate-css` for CSS animations
- **Layout**: Allotment for resizable split panes (code editor + test panel)

---

## 6. judge-worker (Submission Processor)

### 6.1 Architecture

```
┌─────────────┐       ┌───────────┐       ┌──────────────┐       ┌──────────────┐
│   api-http  │ push  │   Redis   │  pop  │ judge-worker │ POST  │   Judge0     │
│  (producer) │──────▶│  (BullMQ) │──────▶│  (consumer)  │──────▶│  (RapidAPI)  │
│             │       │           │       │              │◀──────│              │
│             │◀──────│           │       │              │ poll  │              │
└─────────────┘ PATCH └───────────┘       └──────────────┘       └──────────────┘
```

The worker is a standalone Node.js process. It never serves HTTP — it only consumes from Redis and makes outbound HTTP calls.

#### Source Files

```
judge-worker/src/
├── index.ts                    # Entry point — Redis verify, start worker, shutdown
├── worker.ts                   # BullMQ Worker setup + event listeners
├── processor.ts                # Core job pipeline
├── judge/
│   ├── client.ts               # Axios instance for Judge0 RapidAPI
│   ├── submit.ts               # POST submission to Judge0
│   ├── poll.ts                 # Poll for terminal status
│   └── parse.ts                # Stdout parser + verdict derivation
├── backend/
│   ├── client.ts               # Axios instance for api-http
│   ├── updateSubmission.ts     # PATCH submission verdict
│   └── updateAttemptScore.ts   # PATCH attempt score
├── queue/
│   ├── connection.ts           # Shared ioredis instance
│   └── constants.ts            # Queue name, poll config, language map
├── errors/
│   └── index.ts                # Custom error classes
├── logger/
│   └── index.ts                # Pino logger
├── shutdown/
│   └── graceful.ts             # SIGTERM/SIGINT handler
└── schema/
    ├── job.schema.ts            # JudgeJob + Zod validation + UpdateSubmissionPayload
    ├── judge0.schema.ts         # Judge0 API types + ParseResult
    └── (shared schemas...)      # Copied from frontend/backend for contract alignment
```

---

### 6.2 Job Lifecycle

```
 1. api-http enqueues job on "judge" queue
 2. Worker pops job → validates with Zod
     ↓ (invalid → UnrecoverableError, no retry)
 3. POST /submissions to Judge0 → receive token
     ↓ (unsupported language → UnrecoverableError)
 4. Poll GET /submissions/:token every 1.5s (up to 20x = 30s)
     ↓ (timeout → PollTimeoutError → BullMQ retry)
 5. Judge0 returns terminal status
 6. Derive verdict from status ID + stdout parsing
 7. Compute points (accepted → full points, else → 0)
 8. PATCH /api/internal/submissions/dsa/:id → store verdict
 9. If points > 0: PATCH /api/internal/attempts/:id/score → add points
10. Job complete
```

**Job payload shape** (validated by Zod):

```typescript
interface JudgeJob {
  jobId: string;              // UUID idempotency key
  dsaSubmissionId: number;    // PK of DsaSubmission row
  attemptId: number;          // FK to ContestAttempt
  userId: number;
  problemId: number;
  contestId: number;
  language: "cpp" | "python" | "javascript" | "java";
  sourceCode: string;         // Complete harness from api-http
  totalTestCases: number;
  totalPoints: number;
}
```

---

### 6.3 File-by-File Reference

| File | Purpose |
|---|---|
| `index.ts` | Verifies Redis with `ping()`, creates worker, registers graceful shutdown, logs startup info |
| `worker.ts` | Instantiates BullMQ `Worker` on `"judge"` queue with concurrency (default 4) and rate limiter (10 jobs/sec). Logs completed/failed/error/stalled events |
| `processor.ts` | Core pipeline: parse → submit → poll → derive → update. Creates child logger per job. Catches ZodError as UnrecoverableError. All other errors bubble to BullMQ |
| `judge/client.ts` | Axios instance for Judge0 RapidAPI with `X-RapidAPI-Host`, `X-RapidAPI-Key` headers, 10s timeout |
| `judge/submit.ts` | `submitToJudge0()` — maps language to ID, POSTs to `/submissions?base64_encoded=false&wait=false`, returns token |
| `judge/poll.ts` | `pollForVerdict()` — loops up to 20 times with 1.5s sleep, returns response when status is terminal (>= 3) |
| `judge/parse.ts` | `parseStdout()` — walks `__CASE__`/`__OUTPUT__`/`__ERROR__` markers, stops on first failure. `deriveVerdict()` — maps Judge0 status to final verdict |
| `backend/client.ts` | Axios instance for api-http with `Bearer` auth, 8s timeout, 5xx response interceptor |
| `backend/updateSubmission.ts` | PATCHes `DsaSubmission` with verdict. 3 retries on network errors, 1s delay |
| `backend/updateAttemptScore.ts` | PATCHes `ContestAttempt` to increment score. Same retry logic |
| `queue/connection.ts` | ioredis instance with `maxRetriesPerRequest: null` and `enableReadyCheck: false` (BullMQ requirements) |
| `queue/constants.ts` | Queue name (`"judge"`), poll config, language → Judge0 ID map, terminal status set |
| `errors/index.ts` | Re-exports `UnrecoverableError` from bullmq. Defines `JudgeApiError`, `PollTimeoutError`, `BackendApiError` |
| `logger/index.ts` | Pino logger — JSON in production, pretty in development. `childLogger()` for per-job context |
| `shutdown/graceful.ts` | On SIGTERM/SIGINT: drain worker, close Redis, exit. 30s hard-kill timeout |
| `schema/job.schema.ts` | `JudgeJob` interface, Zod schema, `parseJob()`, `UpdateSubmissionPayload` |
| `schema/judge0.schema.ts` | `Judge0SubmitRequest`, `Judge0SubmitResponse`, `Judge0StatusResponse`, `ParseResult` |

---

### 6.4 Stdout Parsing & Verdict Derivation

**Stdout markers** (produced by api-http's harness):

```
__CASE__0
__OUTPUT__result_here
__CASE__1
__ERROR__exception message
```

**Parse algorithm** (stop on first failure):
1. Walk lines in order
2. `__CASE__<i>` → track current case
3. `__OUTPUT__<result>` → test passed, increment count
4. `__ERROR__<msg>` → stop, verdict = `runtime_error`
5. After all lines: all passed = `accepted`, partial = `wrong_answer`, none = `runtime_error`

**Verdict derivation from Judge0 status:**

| Judge0 Status ID | Verdict | Parse stdout? |
|---|---|---|
| 5 | `time_limit_exceeded` | No |
| 6 | `runtime_error` (compilation) | No |
| 7–14 | `runtime_error` (signals) | No |
| 4 | `wrong_answer` | No |
| 3 + empty stdout | `runtime_error` | No |
| 3 + stdout | Result of `parseStdout()` | Yes |

**Points:** `accepted` → `totalPoints`, everything else → `0`

**Execution time:** `Math.round(parseFloat(time) * 1000)` milliseconds, or `null`

---

### 6.5 Retry & Failure Strategy

**BullMQ-level retries** (configured by producer):
- Up to 3 attempts with exponential backoff (2s, 4s, 8s)
- Last 500 completed jobs retained for audit
- All failed jobs retained for inspection

**Internal backend retries:**
- Both `updateSubmission` and `updateAttemptScore` retry 3 times on network errors (1s delay)
- Non-network errors (4xx, 5xx) are thrown immediately

**Non-retryable errors:**
- `UnrecoverableError` — invalid job payload or unsupported language → moves to failed, no retry

**Rate limiting:**
- Worker limiter: max 10 jobs started per second (respects RapidAPI rate limits)

---

### 6.6 Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `REDIS_HOST` | No | `localhost` | Redis hostname |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | _(empty)_ | Redis password |
| `WORKER_CONCURRENCY` | No | `4` | Parallel job slots |
| `NODE_ENV` | No | `development` | Log format (JSON vs pretty) |
| `JUDGE0_API_URL` | Yes | — | `https://judge029.p.rapidapi.com` |
| `JUDGE0_RAPIDAPI_HOST` | Yes | — | `judge029.p.rapidapi.com` |
| `JUDGE0_RAPIDAPI_KEY` | Yes | — | RapidAPI key (never commit) |
| `BACKEND_API_URL` | Yes | — | api-http URL (e.g. `http://localhost:3000`) |
| `BACKEND_INTERNAL_SECRET` | Yes | — | Shared secret for service auth |

---

## 7. Cross-Service Communication

```
┌──────────┐  HTTP (REST)  ┌──────────┐  BullMQ (Redis)  ┌──────────────┐
│ web-user │──────────────▶│ api-http │─────────────────▶│ judge-worker │
│ (React)  │◀──────────────│ (Express)│◀─────────────────│   (BullMQ)   │
└──────────┘               └──────────┘                  └──────┬───────┘
                                                                │
                                                         HTTP   │
                                                                ▼
                                                         ┌──────────┐
                                                         │  Judge0  │
                                                         │(RapidAPI)│
                                                         └──────────┘
```

| From | To | Protocol | Auth | Purpose |
|---|---|---|---|---|
| `web-user` | `api-http` | REST (Axios) | JWT Bearer token + refresh cookie | All user-facing operations |
| `api-http` | Redis | BullMQ queue | Redis password | Enqueue DSA submission jobs |
| `judge-worker` | Redis | BullMQ worker | Redis password | Consume DSA submission jobs |
| `judge-worker` | Judge0 | REST (Axios) | `X-RapidAPI-Key` header | Submit code + poll results |
| `judge-worker` | `api-http` | REST (Axios) | `Bearer BACKEND_INTERNAL_SECRET` | PATCH submission verdict + attempt score |

**Shared contracts:**
- Zod schemas are duplicated across services (`web-user/src/schema/`, `judge-worker/src/schema/`) for type safety
- The `JudgeJob` payload shape is the contract between `api-http` (producer) and `judge-worker` (consumer)
- `__CASE__`/`__OUTPUT__`/`__ERROR__` stdout markers are the contract between `api-http` (harness generator) and `judge-worker` (parser)

---

## 8. What Is Not Yet Implemented

| Item | Service | Status |
|---|---|---|
| `POST /api/run` (run code without submitting) | `api-http` | Service is empty |
| `PATCH /api/internal/submissions/dsa/:id` (store verdict) | `api-http` | Route does not exist yet — required by `judge-worker` |
| `PATCH /api/internal/attempts/:id/score` (update score) | `api-http` | Route does not exist yet — required by `judge-worker` |
| BullMQ job enqueue on DSA submit | `api-http` | Not yet wired — `submitDsa` uses stub `codeExecutor` |
| Real code execution | `api-http` | `codeExecutor.ts` is a stub returning hardcoded "accepted" |
| `ContestLeaderboardPanel` (live data) | `web-user` | Uses mock animated data, not connected to leaderboard API |
| `MyContests` page | `web-user` | Empty attempts array with TODO |
| `ContestResultsPage` | `web-user` | Placeholder copy |
| `ContestNavigationFooter` | `web-user` | Commented out in `ContestPage` |
| `stats` queries | `web-user` | Commented/stubbed |
| `ContestLeaderboard` table usage | `api-http` | Model exists in Prisma but leaderboard is computed in memory |
| `docker-compose.yml` | root | No orchestration config for running all services together |
| `web-admin` | — | Referenced in root README but not present in the current workspace |
