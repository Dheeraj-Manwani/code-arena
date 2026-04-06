# API-HTTP and Database Field Reference

This document explains how the `api-http` backend is organized and what every database field is used for.

---

## 1) What `api-http` does

`api-http` is an Express + TypeScript API service for a coding contest platform. It handles:

- Authentication and session token refresh
- Contest creation, publishing, and question linking
- MCQ and DSA problem management
- Contest attempts, draft answers, and final submissions
- Leaderboard, dashboard feed, profile, and creator stats
- DSA code execution (`/api/run`)

Core stack:

- `Express 5`, `TypeScript`
- `Prisma` with `PostgreSQL`
- `Zod` for input validation
- `JWT` auth and role checks

---

## 2) Runtime and route map

Server entrypoint: `src/index.ts`

- Health check: `GET /health`
- Mounted route groups:
  - `/api/auth`
  - `/api/contests`
  - `/api/problems`
  - `/api/stats`
  - `/api/profile`
  - `/api/run`
  - `/api` (dashboard + submission routes)

### Auth routes (`/api/auth`)

- `POST /refresh`
- `POST /signup`
- `POST /login`
- `POST /verify`
- `POST /logout`
- `POST /forgot-password`
- `POST /reset-password`

### Contest routes (`/api/contests`)

- `GET /`
- `GET /:contestId`
- `POST /`
- `PATCH /:contestId`
- `POST /:contestId/mcq`
- `POST /:contestId/dsa`
- `POST /:contestId/link/mcq`
- `POST /:contestId/link/dsa`
- `DELETE /:contestId/link/mcq/:questionId`
- `DELETE /:contestId/link/dsa/:problemId`
- `PATCH /:contestId/reorder`
- `GET /:contestId/leaderboard`

### Problem routes (`/api/problems`)

- `GET /mcq`
- `GET /dsa`
- `POST /mcq`
- `POST /dsa`
- `GET /mcq/:questionId`
- `GET /dsa/:problemId`
- `PATCH /mcq/:questionId`
- `PATCH /dsa/:problemId`
- `GET /:problemId` (contest-facing problem fetch)

### Submission and attempt routes (`/api`)

- `POST /contests/:contestId/attempt`
- `GET /contests/:contestId/attempt/:attemptId`
- `POST /contests/:contestId/attempt/:attemptId/mcq/:questionId/submit`
- `POST /contests/:contestId/attempt/:attemptId/dsa/:problemId/submit`
- `PUT /contests/:contestId/attempt/:attemptId/draft/mcq/:questionId`
- `PUT /contests/:contestId/attempt/:attemptId/draft/dsa/:problemId`
- `POST /contests/:contestId/attempt/:attemptId/submit`

### Other routes

- Dashboard feed: `GET /api/dashboard-feed`
- Creator stats: `GET /api/stats`
- Profile: `GET /api/profile`
- Code run: `POST /api/run`

---

## 3) Environment variables used by `api-http`

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `DIRECT_URL`: Direct DB URL used by Prisma migration/introspection workflows.
- `PORT`: HTTP server port (defaults to `3000`).
- `ALLOWED_HOSTS`: Comma-separated CORS origins.
- `ACCESS_TOKEN_SECRET`: JWT signing key for access tokens.
- `REFRESH_TOKEN_SECRET`: JWT signing key for refresh tokens.
- `RESEND_API_KEY`: API key for sending OTP/reset emails.
- `NODE_ENV`: Affects behavior like secure cookies and Prisma client caching.

---

## 4) Database enums

### `Role`

- `creator`: User who can create contests/problems.
- `contestee`: User who participates in contests.

### `SubmissionStatus`

- `pending`: Submission queued/in evaluation path.
- `accepted`: All checks passed.
- `wrong_answer`: Output mismatch on one or more tests.
- `time_limit_exceeded`: Runtime exceeded configured limit.
- `runtime_error`: Program crashed/error during execution.

### `ContestType`

- `practice`: Self-paced contest mode.
- `competitive`: Scheduled contest mode.

### `Difficulty`

- `easy`, `medium`, `hard`: DSA problem difficulty labels.

### `ContestStatus`

- `draft`: Not live yet, editable.
- `published`: Visible/active according to schedule.
- `cancelled`: Contest invalidated/closed.

### `AttemptStatus`

- `in_progress`: Active attempt session.
- `submitted`: Finalized by user.
- `timed_out`: Auto-ended by deadline.
- `abandoned`: User left without final submit.

---

## 5) Full DB field dictionary (all models)

Source of truth: `prisma/schema.prisma`

## `User` (`users`)

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK, auto-increment) | Unique user identifier across all relations. |
| `name` | `String` | Display name for profile and leaderboards. |
| `email` | `String` (unique) | Login identity and OTP/password reset target. |
| `password` | `String` | Hashed password used for credential auth. |
| `isVerified` | `Boolean` (default `false`) | Marks whether email/account verification is complete. |
| `imageUrl` | `String?` | Optional profile avatar URL. |
| `role` | `Role` (default `contestee`) | Authorization scope (`creator` vs `contestee`). |
| `createdAt` | `DateTime` | Account creation timestamp. |
| `updatedAt` | `DateTime` | Auto-updated timestamp for last profile/auth change. |

Relations: contests created, authored questions/problems, attempts, submissions, leaderboard entries.  
Index: `role`.

## `Contest` (`contests`)

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | Contest identifier. |
| `title` | `String` | Contest name shown in listings and detail pages. |
| `description` | `String` | Instructions/context of the contest. |
| `startTime` | `DateTime?` | Scheduled start for competitive mode. |
| `endTime` | `DateTime?` | Scheduled end for competitive mode. |
| `maxDurationMs` | `Int?` | Allowed attempt duration (especially for practice mode). |
| `type` | `ContestType` (default `competitive`) | Governs timing behavior and validation rules. |
| `status` | `ContestStatus` (default `draft`) | Publishing lifecycle state. |
| `createdAt` | `DateTime` | Contest creation time. |
| `updatedAt` | `DateTime` | Last metadata/link update time. |
| `creatorId` | `Int` (FK -> `User.id`) | Owner/author of contest. |

Relations: ordered contest questions, attempts, submissions, leaderboard rows.  
Indexes: `creatorId`, `(startTime, endTime)`.

## `ContestAttempt`

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | Attempt session id. |
| `userId` | `Int` (FK -> `User.id`) | Participant taking the attempt. |
| `contestId` | `Int` (FK -> `Contest.id`) | Contest being attempted. |
| `currentProblemId` | `Int?` | Optional pointer to current active problem in UI flow. |
| `startedAt` | `DateTime` | Attempt start timestamp. |
| `deadlineAt` | `DateTime` | Exact attempt cutoff timestamp. |
| `submittedAt` | `DateTime?` | Final submission timestamp. |
| `durationMs` | `Int?` | Final elapsed attempt duration after submit/timeout. |
| `totalPoints` | `Int` (default `0`) | Running/final score for this attempt. |
| `status` | `AttemptStatus` (default `in_progress`) | Attempt lifecycle status. |

Relations: MCQ/DSA submissions attached to the same attempt.  
Indexes: `userId`, `contestId`.

## `McqQuestion` (`mcq_questions`)

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | MCQ question id. |
| `questionText` | `String` | Main question prompt. |
| `options` | `Json` | Option list and labels as flexible JSON payload. |
| `correctOptionIndex` | `Int` | Correct answer option index. |
| `points` | `Int` (default `1`) | Score awarded if answered correctly. |
| `maxDurationMs` | `Int?` | Optional per-question time cap. |
| `createdAt` | `DateTime` | Question creation time. |
| `updatedAt` | `DateTime` | Last edit timestamp. |
| `creatorId` | `Int` (FK -> `User.id`) | Author/creator id. |

Relations: contest links and user MCQ submissions.

## `DsaProblem` (`dsa_problems`)

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | DSA problem id. |
| `title` | `String` | Problem title. |
| `description` | `String` | Full problem statement. |
| `tags` | `String[]` | Topic tags for filtering/discovery. |
| `points` | `Int` (default `100`) | Score for accepted solution. |
| `timeLimit` | `Int` (default `2000`) | Execution time limit used in judging. |
| `memoryLimit` | `Int` (default `256`) | Memory limit used in judging. |
| `difficulty` | `Difficulty?` | Optional complexity level. |
| `maxDurationMs` | `Int?` | Optional per-problem solve-time cap. |
| `signature` | `Json` | Function signature/contract for boilerplate + validator. |
| `inputFormat` | `String?` | Human-readable input format guidance. |
| `outputFormat` | `String?` | Human-readable output format guidance. |
| `constraints` | `String[]` | Explicit constraints shown to users. |
| `createdAt` | `DateTime` | Problem creation timestamp. |
| `updatedAt` | `DateTime` | Last edit timestamp. |
| `creatorId` | `Int` (FK -> `User.id`) | Author id. |

Relations: test cases, contest links, and DSA submissions.

## `ContestQuestion`

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | Link row id between contest and a question. |
| `contestId` | `Int` (FK -> `Contest.id`) | Parent contest id. |
| `order` | `Int` | Question order/position inside contest. |
| `mcqId` | `Int?` (FK -> `McqQuestion.id`) | Filled when linked item is MCQ. |
| `dsaId` | `Int?` (FK -> `DsaProblem.id`) | Filled when linked item is DSA problem. |

Purpose: polymorphic linking table to place mixed question types in one ordered contest timeline.  
Constraints: unique per `(contestId, mcqId)` and `(contestId, dsaId)`; index on `contestId`.

## `TestCase` (`test_cases`)

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | Test case id. |
| `input` | `String` | Input payload given to submitted code. |
| `expectedOutput` | `String` | Expected output used for verdict comparison. |
| `isHidden` | `Boolean` (default `false`) | Whether test is hidden from participant view. |
| `createdAt` | `DateTime` | Test case creation timestamp. |
| `problemId` | `Int` (FK -> `DsaProblem.id`) | Problem this test case belongs to. |

Index: `problemId`.

## `McqSubmission` (`mcq_submissions`)

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | MCQ submission id. |
| `selectedOptionIndex` | `Int` | Option selected by user. |
| `isCorrect` | `Boolean` | Correctness verdict at submission time. |
| `pointsEarned` | `Int` (default `0`) | Score earned for this answer. |
| `submittedAt` | `DateTime` | Answer submission timestamp. |
| `userId` | `Int` (FK -> `User.id`) | Who answered. |
| `questionId` | `Int` (FK -> `McqQuestion.id`) | Which MCQ was answered. |
| `contestId` | `Int` (FK -> `Contest.id`) | Contest context for the answer. |
| `attemptId` | `Int` (FK -> `ContestAttempt.id`) | Attempt session where answer happened. |

Constraint: unique `(attemptId, questionId)` to avoid duplicate final answers in the same attempt.  
Indexes: `questionId`, `contestId`, `attemptId`.

## `DsaSubmission` (`dsa_submissions`)

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | DSA submission id. |
| `code` | `String` | Source code submitted by user. |
| `language` | `String` | Programming language selected. |
| `status` | `SubmissionStatus` | Final verdict from judge pipeline. |
| `pointsEarned` | `Int` (default `0`) | Score awarded for this run/submission. |
| `testCasesPassed` | `Int` (default `0`) | Number of passing tests. |
| `totalTestCases` | `Int` (default `0`) | Total tests evaluated. |
| `executionTime` | `Int?` | Runtime metric returned by executor/judge. |
| `submittedAt` | `DateTime` | Submission timestamp. |
| `userId` | `Int` (FK -> `User.id`) | Submitter id. |
| `problemId` | `Int` (FK -> `DsaProblem.id`) | Problem solved/submitted against. |
| `contestId` | `Int` (FK -> `Contest.id`) | Contest context. |
| `attemptId` | `Int` (FK -> `ContestAttempt.id`) | Attempt session context. |

Constraint: unique `(attemptId, problemId)` for one final submission per problem per attempt.  
Indexes: `problemId`, `contestId`, `attemptId`.

## `ContestLeaderboard`

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | Leaderboard row id. |
| `contestId` | `Int` (FK -> `Contest.id`) | Contest this ranking belongs to. |
| `userId` | `Int` (FK -> `User.id`) | Ranked participant id. |
| `totalPoints` | `Int` | Aggregated score used for ranking. |
| `rank` | `Int` | Position in leaderboard for the contest. |

Constraint: unique `(contestId, userId)`.

## `EmailOtp`

| Field | Type | Use |
|---|---|---|
| `id` | `String` (PK, cuid) | OTP record id. |
| `email` | `String` | Target email for OTP. |
| `otpHash` | `String` | Hashed OTP value (not plain OTP). |
| `expiresAt` | `DateTime` | OTP expiration cutoff. |
| `used` | `Boolean` (default `false`) | One-time-use guard flag. |
| `createdAt` | `DateTime` | OTP creation timestamp. |

Indexes: `(email, used)`, `expiresAt`.

## `DraftAnswer`

| Field | Type | Use |
|---|---|---|
| `id` | `Int` (PK) | Draft row id. |
| `attemptId` | `Int` | Attempt that owns this draft answer. |
| `problemId` | `Int` | Question/problem id for this draft entry. |
| `code` | `String?` | Draft code for DSA problem before final submit. |
| `language` | `String?` | Selected language for draft code. |
| `mcqOption` | `Int?` | Draft selected MCQ option before final submit. |
| `updatedAt` | `DateTime` | Last autosave/manual draft update time. |

Constraint: unique `(attemptId, problemId)` ensures one draft per attempt-question.

---

## 6) Notes for future maintenance

- If `prisma/schema.prisma` changes, update this file in the same PR.
- Keep enum meaning synchronized with validation rules in services/controllers.
- If new routes are added in `src/index.ts`, update the route map section.
