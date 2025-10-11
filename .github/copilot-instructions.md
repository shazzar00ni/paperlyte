# Paperlyte Copilot Instructions

## Project Overview

Paperlyte is a privacy-focused note-taking application built with React 18, TypeScript, and Vite. This is currently an MVP using localStorage for data persistence, with plans to migrate to a full API backend in Q4 2025.

## Prime Directive

**CRITICAL**: Use `multi_replace_string_in_file` for multiple independent edits - this is MORE EFFICIENT than sequential edits. Only use single-file editing for complex, dependent changes that require careful sequencing. Always explain what you're doing while coding.

## LARGE FILE & COMPLEX CHANGE PROTOCOL

### MANDATORY PLANNING PHASE

When working with large files (>300 lines) or complex changes:

1. ALWAYS start by creating a detailed plan BEFORE making any edits
2. Your plan MUST include:
   - All functions/sections that need modification
   - The order in which changes should be applied
   - Dependencies between changes
   - Estimated number of separate edits required

3. Format your plan as:

## PROPOSED EDIT PLAN

Working with: [filename]
Total planned edits: [number]

### MAKING EDITS

- Focus on one conceptual change at a time
- Show clear "before" and "after" snippets when proposing changes
- Include concise explanations of what changed and why
- Always check if the edit maintains the project's coding style

### Edit sequence:

1. [First specific change] - Purpose: [why]
2. [Second specific change] - Purpose: [why]
3. Do you approve this plan? I'll proceed with Edit [number] after your confirmation.
4. WAIT for explicit user confirmation before making ANY edits when user ok edit [number]

### EXECUTION PHASE

- After each individual edit, clearly indicate progress:
  "✅ Completed edit [#] of [total]. Ready for next edit?"
- If you discover additional needed changes during editing:
- STOP and update the plan
- Get approval before continuing

### REFACTORING GUIDANCE

When refactoring large files:

- Break work into logical, independently functional chunks
- Ensure each intermediate state maintains functionality
- Consider temporary duplication as a valid interim step
- Always indicate the refactoring pattern being applied

### RATE LIMIT AVOIDANCE

- For very large files, suggest splitting changes across multiple sessions
- Prioritize changes that are logically complete units
- Always provide clear stopping points

## Paperlyte-Specific Patterns

### Current Application State (MVP)

- **Single Page Application**: Currently runs as landing page only (`LandingPage.tsx`) - note editor exists but not routed
- **No Authentication**: User management exists in types but not implemented yet
- **localStorage Persistence**: All data stored locally with service abstraction for future API migration
- **Simulated Cloud Sync**: `syncEngine.ts` provides sync simulation using localStorage as "cloud" storage
- **Waitlist Collection**: Primary user interaction is waitlist signup via modal

### Architecture Principles

- **Data Service Layer**: Use `src/services/dataService.ts` for ALL persistence operations. It abstracts localStorage (current) from future API calls
- **Sync Engine**: `src/services/syncEngine.ts` handles cloud sync simulation - designed for future real-time sync
- **Monitoring First**: Always wrap operations with `monitoring.addBreadcrumb()` and `monitoring.logError()` from `src/utils/monitoring.ts`
- **Analytics Tracking**: Use `trackFeatureUsage()`, `trackNoteEvent()`, `trackWaitlistEvent()` from `src/utils/analytics.ts` for user interactions
- **Type Safety**: All data models in `src/types/index.ts` - use `Note`, `WaitlistEntry`, `User`, `SyncConflict` interfaces consistently

### Component Conventions

- **Error Boundaries**: Wrap all pages in `ErrorBoundary` component with custom fallback UI
- **Async State**: Use loading states for all data operations (see `NoteEditor.tsx` pattern with `isLoading`, `isDeleting`, `saveSuccess`)
- **Event Tracking**: Track page views with `trackFeatureUsage()` in component `useEffect`
- **Modal Pattern**: Use `ModalProps` interface for all modal components (`WaitlistModal`, `ConfirmationModal`)

### Build & Development

- **Commands**: `npm run dev` (Vite dev server port 3000), `npm run build` (TypeScript + Vite), `npm run ci` (full pipeline)
- **Testing**: `npm run test` (Vitest), `npm run test:coverage`, `npm run test:ui` (Vitest UI)
- **Linting**: `npm run lint` (ESLint), `npm run format` (Prettier), automated via husky pre-commit
- **Environment**: Uses Vite env vars (`VITE_POSTHOG_API_KEY`, `VITE_SENTRY_DSN`) defined in `vite.config.ts`
- **Styling**: Tailwind CSS 4.x with custom utilities in `src/styles/index.css`
- **Testing**: Vitest with jsdom, `@testing-library/react` for component testing
- **CI/CD**: GitHub Actions with workflows for lint, test, security, performance audits
- **Git Hooks**: Husky with commitlint for conventional commits, lint-staged for pre-commit checks

### Data Migration Strategy

When adding features, consider the Q4 2025 API migration:

- Keep `dataService` methods generic (return promises)
- Don't directly use localStorage in components
- Design for eventual real-time sync and conflict resolution

## Routing Architecture (Future Implementation)

### Planned Route Structure

```typescript
// Future App.tsx with routing
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import NoteEditor from './pages/NoteEditor'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<NoteEditor />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### Route Protection Pattern

```typescript
// Future authentication wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" />
}
```

## General Requirements

Use modern technologies as described below for all code suggestions. Prioritize clean, maintainable code with appropriate comments.

### Accessibility

- Ensure compliance with **WCAG 2.1** AA level minimum, AAA whenever feasible.
- Always suggest:
- Labels for form fields.
- Proper **ARIA** roles and attributes.
- Adequate color contrast.
- Alternative texts (`alt`, `aria-label`) for media elements.
- Semantic HTML for clear structure.
- Tools like **Lighthouse** for audits.

## Browser Compatibility

- Prioritize feature detection (`if ('fetch' in window)` etc.).
- Support latest two stable releases of major browsers:
- Firefox, Chrome, Edge, Safari (macOS/iOS)
- Emphasize progressive enhancement with polyfills or bundlers (e.g., **Babel**, **Vite**) as needed.

## React/TypeScript Requirements

- **Target Version**: React 18 with TypeScript 5.2+
- **Patterns to Follow**:
  - Functional components with hooks (no class components)
  - Custom hooks for shared logic (see analytics/monitoring utilities)
  - Proper dependency arrays in `useEffect`
  - Type props with interfaces from `src/types/index.ts`
- **State Management**:
  - Local state with `useState` for component state
  - No Redux/Zustand - keep state simple for MVP
- **Async Operations**:
  - Always use `async/await` with try/catch blocks
  - Include loading states and error handling
  - Use `dataService` methods for persistence

## HTML/CSS Requirements

- **HTML**:
- Use HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<search>`, etc.)
- Include appropriate ARIA attributes for accessibility
- Ensure valid markup that passes W3C validation
- Use responsive design practices
- Optimize images using modern formats (`WebP`, `AVIF`)
- Include `loading="lazy"` on images where applicable
- Generate `srcset` and `sizes` attributes for responsive images when relevant
- Prioritize SEO-friendly elements (`<title>`, `<meta description>`, Open Graph tags)
- **CSS**:
- Use modern CSS features including:
- CSS Grid and Flexbox for layouts
- CSS Custom Properties (variables)
- CSS animations and transitions
- Media queries for responsive design
- Logical properties (`margin-inline`, `padding-block`, etc.)
- Modern selectors (`:is()`, `:where()`, `:has()`)
- Follow BEM or similar methodology for class naming
- Use CSS nesting where appropriate
- Include dark mode support with `prefers-color-scheme`
- Prioritize modern, performant fonts and variable fonts for smaller file sizes
- Use modern units (`rem`, `vh`, `vw`) instead of traditional pixels (`px`) for better responsiveness

### Code Examples & Patterns

**Error Handling Pattern:**

```typescript
try {
  const result = await dataService.saveNote(note)
  if (result) {
    // Success path
  }
} catch (error) {
  monitoring.logError(error as Error, {
    feature: 'note_editor',
    action: 'save_note',
  })
}
```

**Component Analytics Pattern:**

```typescript
useEffect(() => {
  trackFeatureUsage('note_editor', 'view')
  monitoring.addBreadcrumb('Note editor loaded', 'navigation')
}, [])
```

**Data Service Usage:**

```typescript
// Always use dataService for persistence operations
const notes = await dataService.getNotes()
const success = await dataService.saveNote(updatedNote)
```

**Keyboard Shortcuts Pattern:**

```typescript
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'

// In component
useKeyboardShortcut(['cmd+s', 'ctrl+s'], saveNote)
useKeyboardShortcut(['cmd+k', 'ctrl+k'], () => searchInputRef.current?.focus())
```

**API Migration Pattern (Q4 2025):**

```typescript
// Current localStorage implementation (dataService.ts)
async saveNote(note: Note): Promise<boolean> {
  return new Promise(resolve => {
    setTimeout(() => {
      const notes = this.getFromStorage<Note>('notes')
      const existingIndex = notes.findIndex(n => n.id === note.id)
      // localStorage logic...
      resolve(success)
    }, 0)
  })
}

// Future API implementation (same interface)
async saveNote(note: Note): Promise<boolean> {
  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    })
    return response.ok
  } catch (error) {
    monitoring.logError(error as Error, { feature: 'api', action: 'save_note' })
    return false
  }
}
```

## JavaScript Requirements

- **Minimum Compatibility**: ECMAScript 2020 (ES11) or higher
- **Features to Use**:
- Arrow functions
- Template literals
- Destructuring assignment
- Spread/rest operators
- Async/await for asynchronous code
- Classes with proper inheritance when OOP is needed
- Object shorthand notation
- Optional chaining (`?.`)
- Nullish coalescing (`??`)
- Dynamic imports
- BigInt for large integers
- `Promise.allSettled()`
- `String.prototype.matchAll()`
- `globalThis` object
- Private class fields and methods
- Export \* as namespace syntax
- Array methods (`map`, `filter`, `reduce`, `flatMap`, etc.)
- **Avoid**:
- `var` keyword (use `const` and `let`)
- jQuery or any external libraries
- Callback-based asynchronous patterns when promises can be used
- Internet Explorer compatibility
- Legacy module formats (use ES modules)
- Limit use of `eval()` due to security risks
- **Performance Considerations:**
- Recommend code splitting and dynamic imports for lazy loading
  **Error Handling**:
- Use `try-catch` blocks **consistently** for asynchronous and API calls, and handle promise rejections explicitly.
- Differentiate among:
- **Network errors** (e.g., timeouts, server errors, rate-limiting)
- **Functional/business logic errors** (logical missteps, invalid user input, validation failures)
- **Runtime exceptions** (unexpected errors such as null references)
- Provide **user-friendly** error messages (e.g., "Something went wrong. Please try again shortly.") and log more technical details to dev/ops (e.g., via a logging service).
- Consider a central error handler function or global event (e.g., `window.addEventListener('unhandledrejection')`) to consolidate reporting.
- Carefully handle and validate JSON responses, incorrect HTTP status codes, etc.

## Paperlyte Project Structure

```
paperlyte/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route-level page components
│   ├── services/        # Data service abstraction layer
│   ├── styles/          # Tailwind CSS with custom component classes
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Analytics and monitoring utilities
├── simple-scribbles/    # Documentation and planning
├── docs/                # Additional project documentation
└── [config files]       # Vite, Tailwind, TypeScript configs
```

### Key File Responsibilities

- `src/App.tsx`: Router setup, error boundary, analytics/monitoring initialization
- `src/services/dataService.ts`: Persistence abstraction (currently localStorage)
- `src/services/syncEngine.ts`: Cloud synchronization and conflict resolution engine
- `src/utils/analytics.ts`: PostHog integration for user tracking
- `src/utils/monitoring.ts`: Sentry integration for error reporting
- `src/types/index.ts`: All TypeScript interfaces and types
- `src/hooks/useKeyboardShortcut.ts`: Custom hook for keyboard navigation
- `vite.config.ts`: Build configuration with path aliases and CSP headers

## Testing Patterns

### Component Testing with Vitest + Testing Library

```typescript
// Component test pattern (see WaitlistModal.test.tsx)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock services and utilities
vi.mock('../../services/dataService', () => ({
  dataService: { addToWaitlist: vi.fn() }
}))
vi.mock('../../utils/analytics', () => ({
  trackUserAction: vi.fn()
}))

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<ComponentName isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Service Testing Pattern

```typescript
// Service test pattern (see dataService.test.ts)
describe('DataService', () => {
  beforeEach(() => {
    localStorage.clear() // Clear localStorage before each test
    vi.clearAllMocks()
  })

  it('should save and retrieve data', async () => {
    const testData = { id: 'test', title: 'Test' }
    const success = await dataService.saveNote(testData)
    expect(success).toBe(true)

    const retrieved = await dataService.getNotes()
    expect(retrieved[0]).toEqual(testData)
  })
})
```

## Deployment Configuration

### Netlify Configuration (`netlify.toml`)

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18
- **Environment Variables**: Set in Netlify dashboard (VITE_POSTHOG_API_KEY, VITE_SENTRY_DSN)
- **Security Headers**: X-Frame-Options, CSP, XSS Protection
- **SPA Redirect**: `/*` → `/index.html` (status 200)

### Vercel Configuration (`vercel.json`)

- **Framework**: Vite auto-detection
- **Build/Dev Commands**: Standard npm scripts
- **Security Headers**: Same as Netlify configuration
- **Environment Variables**: VITE_APP_VERSION set in config

### Key Deployment Considerations

- Both platforms configured for **SPA routing** with fallback to index.html
- **Consistent security headers** across deployments
- **Environment variables** managed through platform dashboards
- **Build optimization** with manual vendor chunk splitting in `vite.config.ts`

## Documentation Requirements

- Include JSDoc comments for JavaScript/TypeScript.
- Document complex functions with clear examples.
- Maintain concise Markdown documentation.
- Minimum docblock info: `param`, `return`, `throws`, `author`

## Data Persistence (Current: localStorage)

- Use `dataService` methods exclusively for data operations
- Current storage keys: `paperlyte_notes`, `paperlyte_waitlist_entries`
- All data operations return promises for future API compatibility
- Future: Will migrate to encrypted cloud storage with sync capabilities

## Security Considerations

- Sanitize all user inputs thoroughly.
- Parameterize database queries.
- Enforce strong Content Security Policies (CSP).
- Use CSRF protection where applicable.
- Ensure secure cookies (`HttpOnly`, `Secure`, `SameSite=Strict`).
- Limit privileges and enforce role-based access control.
- Implement detailed internal logging and monitoring.
