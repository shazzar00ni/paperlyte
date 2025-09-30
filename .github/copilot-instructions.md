# Paperlyte Copilot Instructions

## Project Overview
Paperlyte is a privacy-focused note-taking application built with React 18, TypeScript, and Vite. This is currently an MVP using localStorage for data persistence, with plans to migrate to a full API backend in Q4 2025.

## Prime Directive
Avoid working on more than one file at a time. Multiple simultaneous edits will cause corruption. Be chatting and teach about what you are doing while coding.

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

### Architecture Principles
- **Data Service Layer**: Use `src/services/dataService.ts` for all persistence operations. It abstracts localStorage (current) from future API calls
- **Monitoring First**: Always wrap operations with `monitoring.addBreadcrumb()` and `monitoring.logError()` from `src/utils/monitoring.ts`
- **Analytics Tracking**: Use `trackFeatureUsage()` and `trackNoteEvent()` from `src/utils/analytics.ts` for user interactions
- **Type Safety**: All data models are in `src/types/index.ts` - use `Note`, `WaitlistEntry`, `User` interfaces consistently

### Component Conventions
- **Error Boundaries**: Wrap all pages in `ErrorBoundary` component with custom fallback UI
- **Async State**: Use loading states for all data operations (see `NoteEditor.tsx` pattern)
- **Event Tracking**: Track page views with `trackFeatureUsage()` in component `useEffect`

### Build & Development
- **Commands**: `npm run dev` (Vite dev server), `npm run build` (TypeScript + Vite build)
- **Environment**: Uses Vite env vars (`VITE_POSTHOG_API_KEY`, `VITE_SENTRY_DSN`) defined in `vite.config.ts`
- **Styling**: Tailwind CSS with custom component classes in `src/styles/index.css` (`.btn`, `.card`, etc.)

### Data Migration Strategy
When adding features, consider the Q4 2025 API migration:
- Keep `dataService` methods generic (return promises)
- Don't directly use localStorage in components
- Design for eventual real-time sync and conflict resolution
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
    action: 'save_note'
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
- `src/utils/analytics.ts`: PostHog integration for user tracking
- `src/utils/monitoring.ts`: Sentry integration for error reporting
- `src/types/index.ts`: All TypeScript interfaces and types

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
