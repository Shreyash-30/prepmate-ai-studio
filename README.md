# PrepMate AI Studio

An AI-powered interview preparation platform designed to help developers practice coding problems, revise concepts, take mock interviews, and track their progress toward technical interview readiness.

## Features

- **Dashboard** - Real-time progress tracking with performance metrics and heatmaps
- **Practice** - Curated coding problems by subject, difficulty, and topic
- **Revision** - Structured reviews for targeted learning reinforcement
- **Mock Interview** - Simulated technical interviews with detailed reports
- **Planner** - Daily task management and study scheduling
- **Platform Integrations** - **NEW**: Automatically sync LeetCode & Codeforces accounts
- **User Profiles** - Personalized account and progress settings

### New: Platform Integrations

Connect your coding platform accounts to automatically fetch:
- **LeetCode**: Recent submissions, problem difficulty, acceptance rates
- **Codeforces**: User ratings, submit history, contest performance

This data feeds into the upcoming adaptive learning system for personalized preparation.

## Getting Started

### Prerequisites

- Node.js (v16+) - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm or Bun package manager
- MongoDB (for backend) - [install locally](https://www.mongodb.com/try/download/community) or use Docker

### Frontend-Only Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd prepmate-ai-studio

# Step 3: Install dependencies
npm install
# or with Bun
bun install

# Step 4: Start the development server
npm run dev
# or with Bun
bun run dev
```

Frontend will be available at `http://localhost:5173`.

### Full Setup (Frontend + Backend)

**Terminal 1 - Frontend:**
```sh
# In project root
npm install
npm run dev
# Available at http://localhost:5173
```

**Terminal 2 - Backend:**
```sh
# In backend directory
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
# Available at http://localhost:8000
```

See [backend/README.md](./backend/README.md) for detailed backend setup.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

## Technologies Used

This project is built with:

- **Vite** - Next generation frontend build tool
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Unstyled, accessible components
- **React Router** - Client-side routing
- **React Hook Form** - Efficient form handling
- **Zod** - TypeScript-first schema validation
- **Axios** - HTTP client
- **TanStack React Query** - Server state management
- **Framer Motion** - Animation library
- **Recharts** - Charting library
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

## Project Structure

```
src/
├── components/        # React components
│   ├── layout/       # App layout components (Header, Sidebar)
│   └── ui/           # Reusable UI components
├── pages/            # Page components for routes
├── services/         # API service layer
├── contexts/         # React Context providers
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
└── test/             # Test configuration and examples
```

## API Integration

The frontend connects to a backend API. Set the API base URL via environment variable:

```
VITE_API_BASE_URL=https://your-api-endpoint.com/api
```

By default, it connects to `http://localhost:8000/api`.

## Development

### Code Quality

- **ESLint** - Enforces code quality and consistency
- **TypeScript** - Provides type safety

Run linting:
```sh
npm run lint
```

### Testing

This project uses Vitest for testing. Run tests with:

```sh
npm run test
```

Or in watch mode:

```sh
npm run test:watch
```
