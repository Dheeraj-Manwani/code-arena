# Contest Platform - Admin Dashboard

React-based admin dashboard for managing contests, questions, and user submissions.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **React Router v7** for routing
- **TanStack Query** for server state management
- **Zustand** for client state
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Zod** for schema validation
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Motion** for animations

## Project Structure

```
src/
├── api/              # API client functions
├── components/       # Reusable React components
│   ├── auth/         # Authentication components
│   ├── contests/     # Contest-related components
│   ├── questions/     # Question form components
│   ├── layout/       # Layout components
│   └── ui/           # Base UI components
├── pages/            # Page components
├── queries/          # React Query hooks
├── schema/           # Zod schemas and TypeScript types
├── lib/              # Utilities and configurations
├── stores/           # Zustand stores
└── routes.tsx        # Route configuration
```

## Features

### Contest Management
- Create contests with type-specific requirements:
  - **Practice**: Requires max duration (minimum 1 minute)
  - **Competitive**: Requires start and end time
- Import or create questions during contest creation
- Drag-and-drop question ordering
- Real-time validation and error handling

### Question Management
- Create MCQ questions and DSA problems
- Search and import from question bank
- Question bank with pagination and search
- Form validation with helpful error messages

### User Interface
- Responsive design
- Loading states and disabled fields during submissions
- Error boundaries for graceful error handling
- Toast notifications for user feedback
- Accessible components with keyboard navigation

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Run linter
pnpm run lint
```

## Key Components

### Error Handling
- `ErrorBoundary.tsx` - Catches React component errors
- Route-level error handling for navigation errors
- User-friendly error messages with development details

### Forms
- `McqForm` - MCQ question creation form
- `DsaForm` - DSA problem creation form
- `CreateContest` - Contest creation with question management
- `EditContestModal` - Contest editing modal

### Utilities
- `utils.ts` - Helper functions (e.g., `convertHHmmToMilliseconds`)
- `axios.ts` - API client configuration
- `queryClient.ts` - React Query configuration

## Environment Configuration

The frontend connects to the backend API. Configure the API URL in `src/lib/axios.ts` or via environment variables.

## State Management

- **Server State**: TanStack Query handles all API data
- **Client State**: Zustand for authentication state
- **Form State**: React useState for form inputs

## Validation

- Zod schemas for form validation
- Type-specific validation for contest types
- Real-time validation feedback
- Backend schema validation matches frontend

## Styling

- Tailwind CSS with custom theme
- Responsive design with mobile support
- Dark mode support (if configured)
- Custom animations using Motion library
