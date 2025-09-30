# Environment Setup Guide

This guide helps you set up Paperlyte for local development.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/shazzar00ni/paperlyte.git
   cd paperlyte
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (see [Environment Variables](#environment-variables) below).

4. **Start development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## Environment Variables

### Required for Analytics & Monitoring

Copy `.env.example` to `.env` and configure:

```bash
# Analytics Configuration (Optional for development)
VITE_POSTHOG_API_KEY=your_posthog_api_key_here
VITE_POSTHOG_HOST=https://app.posthog.com

# Error Monitoring Configuration (Optional for development)
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_SENTRY_DEV_ENABLED=false

# App Configuration
VITE_APP_VERSION=0.1.0
VITE_API_BASE_URL=https://api.paperlyte.com/v1

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Development vs Production

- **Development**: Analytics and error reporting are optional. The app works fully with localStorage.
- **Production**: Configure PostHog and Sentry for proper observability.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality checks
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm test` - Run test suite (Vitest)

## Project Structure

```
paperlyte/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route-level page components  
│   ├── services/        # Data service abstraction layer
│   ├── styles/          # Tailwind CSS with custom component classes
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Analytics and monitoring utilities
│   └── test/            # Test setup and utilities
├── simple-scribbles/    # Documentation and planning
├── docs/                # Additional project documentation
└── [config files]       # Vite, Tailwind, TypeScript configs
```

## Key Architecture Decisions

### Data Storage Strategy
- **Current**: localStorage for MVP phase
- **Future**: API-based storage with sync (Q4 2025)
- **Pattern**: Always use `dataService` abstraction layer

### Analytics & Monitoring
- **PostHog** for user analytics and feature tracking
- **Sentry** for error monitoring and performance
- **Pattern**: Every user interaction and error is tracked

### Component Patterns
- Functional components with hooks
- Error boundaries for resilient UI
- Loading states for all async operations
- Analytics tracking in all components

## Development Workflow

1. **Feature Development**
   - Create feature branch from `main`
   - Add tests for new functionality
   - Use TypeScript strictly (no `any` types)
   - Follow analytics tracking patterns

2. **Code Quality**
   - Run `npm run lint` before committing
   - All components should have proper TypeScript types
   - Use the `dataService` for any persistence needs
   - Add error handling with monitoring

3. **Testing**
   - Write unit tests for services and utilities
   - Add component tests for user interactions
   - Test error scenarios and edge cases

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
- Run `npm run lint` to see detailed errors
- Check that all imports have proper file extensions
- Ensure all components have proper TypeScript interfaces

**Environment variables not working**
- Vite only exposes variables starting with `VITE_`
- Restart dev server after changing `.env`
- Check browser devtools for runtime values

**Tests failing to run**
- Currently experiencing memory issues with Vitest
- Basic test setup is configured in `src/test/setup.ts`
- Issue tracked for resolution

### Getting Help

- Check existing issues in the GitHub repository
- Review the [Contributing Guide](CONTRIBUTING.md)
- Refer to architecture documentation in `simple-scribbles/`

## Next Steps

Once your environment is set up:

1. **Explore the codebase** - Start with `src/App.tsx` and `src/pages/LandingPage.tsx`
2. **Try the editor** - Visit `/editor` to see the note-taking interface
3. **Check the roadmap** - Review `simple-scribbles/roadmap.md` for upcoming features
4. **Contribute** - See open issues and pick up tasks that interest you
