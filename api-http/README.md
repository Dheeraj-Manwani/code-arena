# Contest Platform - Backend API

Express.js backend API with TypeScript, Prisma ORM, and PostgreSQL database.

## Tech Stack

- **Express.js 5** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Zod** - Schema validation
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Resend** - Email service

## Project Structure

```
src/
├── controller/       # Request handlers (route handlers)
├── service/          # Business logic layer
├── repository/       # Database access layer
├── schema/           # Zod validation schemas
├── routes/           # API route definitions
├── middleware/       # Express middleware (auth, error handling)
├── errors/           # Custom error classes
├── util/             # Utility functions
└── types/            # TypeScript type definitions
```

## Architecture

The backend follows a layered architecture:

1. **Routes** → Define API endpoints
2. **Controller** → Handle HTTP requests/responses
3. **Service** → Business logic and orchestration
4. **Repository** → Database operations
5. **Schema** → Request/response validation

## Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/contest_platform"
JWT_SECRET="your-secret-key-here"
RESEND_API_KEY="your-resend-api-key"
PORT=3000
ALLOWED_HOSTS="http://localhost:5173"
```

### 2. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database
pnpm run seed
```

### 3. Development

```bash
# Install dependencies
pnpm install

# Start development server with hot reload
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start
```

## API Structure

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Contest Endpoints
- `GET /api/contests` - List contests (paginated, searchable)
- `POST /api/contests` - Create contest (with question linking)
- `GET /api/contests/:id` - Get contest details
- `PATCH /api/contests/:id` - Update contest
- `POST /api/contests/:id/link/mcq` - Link MCQ to contest
- `POST /api/contests/:id/link/dsa` - Link DSA problem to contest
- `PATCH /api/contests/:id/reorder` - Reorder questions

### Question Endpoints
- `GET /api/problems/mcq` - List MCQ questions
- `POST /api/problems/mcq` - Create MCQ question
- `GET /api/problems/dsa` - List DSA problems
- `POST /api/problems/dsa` - Create DSA problem
- `GET /api/problems/:id` - Get problem details
- `PATCH /api/problems/mcq/:id` - Update MCQ
- `PATCH /api/problems/dsa/:id` - Update DSA problem

### Submission Endpoints
- `POST /api/contests/:id/mcq/:questionId/submit` - Submit MCQ answer
- `POST /api/problems/:problemId/submit` - Submit DSA solution

### Leaderboard
- `GET /api/contests/:id/leaderboard` - Get contest leaderboard

## Key Features

### Contest Creation
- Questions are linked during creation in a single transaction
- Parallel question linking using `Promise.all`
- Type-specific validation:
  - **Practice contests**: Require `maxDurationMs` (minimum 1 minute)
  - **Competitive contests**: Require `startTime` and `endTime`

### Authentication
- JWT-based authentication
- Role-based access control (Creator/Contestee)
- OTP email verification
- Password reset functionality

### Validation
- Zod schemas for request validation
- Type-safe error handling
- Consistent error response format

### Error Handling
- Custom error classes
- Centralized error handler middleware
- Consistent error response structure:
  ```json
  {
    "success": false,
    "data": null,
    "error": "ERROR_CODE"
  }
  ```

## Database Schema

Key models:
- `User` - User accounts with roles
- `Contest` - Contest information
- `ContestQuestion` - Links questions to contests
- `McqQuestion` - Multiple choice questions
- `DsaProblem` - DSA coding problems
- `ContestAttempt` - User contest attempts
- `McqSubmission` / `DsaSubmission` - User submissions

See `prisma/schema.prisma` for complete schema definition.

## Testing

Test suite is located in `contest-test/` directory. See `contest-test/README.md` for test documentation.

```bash
cd contest-test
npm test
```

## Code Execution

DSA problem submissions are executed using a code executor utility. The executor:
- Runs code in isolated environment
- Enforces time and memory limits
- Validates against test cases
- Returns execution status and results

## Security

- Password hashing with bcrypt
- JWT token authentication
- Role-based authorization
- Input validation with Zod
- SQL injection prevention (Prisma)
- CORS configuration
- Hidden test case protection

## Response Format

All API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

**Error:**
```json
{
  "success": false,
  "data": null,
  "error": "ERROR_CODE"
}
```

## Error Codes

- `INVALID_REQUEST` - Validation error
- `EMAIL_ALREADY_EXISTS` - Duplicate email
- `UNAUTHORIZED` - Missing/invalid token
- `INVALID_CREDENTIALS` - Wrong email/password
- `FORBIDDEN` - Insufficient permissions
- `CONTEST_NOT_FOUND` - Contest doesn't exist
- `QUESTION_NOT_FOUND` - Question doesn't exist
- `PROBLEM_NOT_FOUND` - Problem doesn't exist
- `CONTEST_NOT_ACTIVE` - Contest not in active time window
- `ALREADY_SUBMITTED` - MCQ already answered

## Development Notes

- Uses TypeScript for type safety
- Prisma migrations for database schema
- Environment-based configuration
- Structured error handling
- Consistent API response format
- Parallel operations where applicable for performance
