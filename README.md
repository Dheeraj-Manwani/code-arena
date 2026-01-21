# Code Arena (Platform to host and attempt coding Contests) 

A full-stack contest platform application with admin dashboard for creating and managing coding contests, MCQ questions, and DSA problems.

## Project Structure

```
contest-platform-assignment/
├── api-http/              # Backend API (Express + TypeScript + Prisma)
│   ├── src/
│   │   ├── controller/    # Request handlers
│   │   ├── service/       # Business logic
│   │   ├── repository/    # Database operations
│   │   ├── schema/        # Zod validation schemas
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth & error handling
│   │   └── util/          # Utility functions
│   ├── prisma/            # Database schema & migrations
│   └── package.json
│
└── web-admin/             # Frontend Admin Dashboard (React + TypeScript + Vite)
    ├── src/
    │   ├── api/           # API client functions
    │   ├── components/    # React components
    │   ├── pages/         # Page components
    │   ├── queries/       # React Query hooks
    │   ├── schema/        # TypeScript types & Zod schemas
    │   ├── lib/           # Utilities & configurations
    │   └── stores/        # Zustand state management
    └── package.json
```

## Features

### Contest Management
- Create and manage contests (Practice & Competitive)
- **Practice Contests**: Require max duration (minimum 1 minute)
- **Competitive Contests**: Require start and end time
- Drag-and-drop question ordering
- Import existing questions or create new ones
- Real-time contest status management

### Question Management
- **MCQ Questions**: Multiple choice questions with options
- **DSA Problems**: Coding problems with test cases
- Question bank with search functionality
- Question creation with validation
- Max duration support (minimum 1 minute)

### User Features
- Authentication (Signup, Login, OTP verification)
- Role-based access (Creator/Contestee)
- Contest attempts and submissions
- Leaderboard tracking

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm (recommended) or npm

## Setup Instructions

### 1. Database Setup

1. Create a PostgreSQL database
2. Copy `.env.example` to `.env` in `api-http/` directory (if exists) or create one with:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/contest_platform"
   JWT_SECRET="your-secret-key"
   RESEND_API_KEY="your-resend-api-key"
   PORT=3000
   ALLOWED_HOSTS="http://localhost:5173"
   ```

### 2. Backend Setup (api-http)

```bash
cd api-http

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
pnpm run seed

# Start development server
pnpm run dev
```

The API will run on `http://localhost:3000`

### 3. Frontend Setup (web-admin)

```bash
cd web-admin

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The frontend will run on `http://localhost:5173`

## Available Scripts

### Backend (api-http)

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run seed` - Seed the database with sample data

### Frontend (web-admin)

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Contests
- `GET /api/contests` - Get all contests (with pagination, search, filters)
- `POST /api/contests` - Create contest (includes question linking)
- `GET /api/contests/:id` - Get contest by ID
- `PATCH /api/contests/:id` - Update contest
- `POST /api/contests/:id/link/mcq` - Link MCQ to contest
- `POST /api/contests/:id/link/dsa` - Link DSA problem to contest
- `PATCH /api/contests/:id/reorder` - Reorder contest questions

### Questions
- `GET /api/problems/mcq` - Get MCQ questions (with search)
- `POST /api/problems/mcq` - Create MCQ question
- `GET /api/problems/dsa` - Get DSA problems (with search)
- `POST /api/problems/dsa` - Create DSA problem
- `PATCH /api/problems/mcq/:id` - Update MCQ question
- `PATCH /api/problems/dsa/:id` - Update DSA problem

## Key Implementation Details

### Contest Creation
- Questions are linked during contest creation in a single API call
- All question linking operations run in parallel using `Promise.all`
- Practice contests require `maxDurationMs` (minimum 1 minute)
- Competitive contests require `startTime` and `endTime`

### Error Handling
- Comprehensive error boundaries for client-side errors
- Route-level error handling for React Router errors
- User-friendly error messages with development details

### Form Validation
- Zod schemas for both frontend and backend validation
- Type-specific validation (practice vs competitive contests)
- Real-time validation feedback

### State Management
- React Query for server state
- Zustand for client state (authentication)
- Optimistic updates where applicable

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
RESEND_API_KEY=your-resend-api-key
PORT=3000
ALLOWED_HOSTS=http://localhost:5173
```

### Frontend
The frontend uses environment variables for API URL (configured in `src/lib/axios.ts`)

## Database Schema

Key models:
- `User` - User accounts with roles
- `Contest` - Contest information
- `ContestQuestion` - Links questions to contests with ordering
- `McqQuestion` - Multiple choice questions
- `DsaProblem` - DSA coding problems
- `ContestAttempt` - User contest attempts
- `McqSubmission` / `DsaSubmission` - User submissions

See `api-http/prisma/schema.prisma` for complete schema.

## Development Notes

- The project uses TypeScript for type safety
- Prisma is used for database ORM
- React Query handles all API state management
- Tailwind CSS for styling
- Radix UI for accessible components
- React Router v7 for routing
- Error boundaries catch and display errors gracefully
