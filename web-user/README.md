# web-user

Participant-facing frontend for **Code Arena**: browse contests, attempt DSA/MCQ questions, run code against test cases, and view leaderboards.

## Tech stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 4** + **tw-animate**
- **React Query** (TanStack) – API state & mutations
- **Zustand** – auth state
- **React Router 7** – routing
- **Shadcn UI** – UI components
- **Zod** – schema validation
- **Axios** – HTTP client


## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment

Create a `.env` file in `web-user/`:

```env
VITE_API_URL=http://localhost:3000
```

Point `VITE_API_URL` to your `api-http` base URL (no trailing slash).

### 3. Run

```bash
pnpm dev
```

App runs at **http://localhost:5173** (or the next free port).

## Scripts

| Command       | Description                    |
|---------------|--------------------------------|
| `pnpm dev`    | Start dev server (HMR)         |
| `pnpm build`  | Type-check + production build  |
| `pnpm preview`| Serve production build locally|
| `pnpm lint`   | Run ESLint                     |

## Project structure

```
src/
├── api/           # API client (contest, auth, leaderboard, submission, …)
├── components/    # Shared & feature components
│   ├── auth/      # OTP, auth forms
│   ├── common/    # Navbar, badges, timer, empty state, …
│   ├── contest/   # Contest page, DSA/MCQ, test cases, results
│   ├── dashboard/ # Contest cards, filters
│   └── ui/        # Radix-based UI primitives
├── hooks/         # React hooks
├── lib/           # Axios, queryClient, utils, error messages
├── mappers/       # API → UI mappers
├── pages/         # Route-level pages
├── queries/       # React Query hooks (auth, contest, leaderboard, …)
├── schema/        # Zod schemas & types
├── stores/        # Zustand (e.g. auth)
├── App.tsx
├── main.tsx
├── routes.tsx
└── index.css
```
