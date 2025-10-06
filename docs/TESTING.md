# Testing Guide

## Overview

Paperlyte uses a comprehensive testing pipeline with multiple test types to ensure code quality, security, and reliability.

## Test Setup Architecture

### Global Test Configuration

All tests use a centralized setup file at `src/test-setup.ts` that provides:

- **React Testing Library Integration**: Automatic cleanup after each test
- **localStorage Mock**: Map-based implementation for reliable data persistence testing
- **crypto.randomUUID Mock**: Consistent UUID generation across tests
- **window.matchMedia Mock**: Support for CSS media query testing
- **PostHog Analytics Mock**: Prevents actual analytics calls during testing
- **Sentry Monitoring Mock**: Captures error tracking calls without sending data

### Automatic Cleanup

Tests automatically clean up after themselves:

```typescript
afterEach(() => {
  cleanup() // React Testing Library cleanup
  localStorage.clear() // Clear test data
  vi.clearAllMocks() // Reset all mocks
})
```

This ensures test isolation and prevents memory leaks.

## Test Types

### 1. Unit Tests

**Framework**: Vitest + React Testing Library  
**Location**: `src/__tests__/`  
**Coverage**: Individual components and utilities

```bash
# Run unit tests
npm run test

# Run with watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

#### Key Features:

- **Component Testing**: React components with user interactions
- **Service Layer Testing**: Data persistence and business logic
- **Utility Testing**: Analytics, monitoring, and helper functions
- **Mock Infrastructure**: Comprehensive mocking for external dependencies

### 2. Integration Tests

**Framework**: Vitest + React Testing Library  
**Location**: `tests/integration/`  
**Coverage**: Feature workflows and component interactions

```bash
# Run integration tests
npm run test:run -- tests/integration
```

#### Test Coverage:

- **Note Management Workflow**: Create, edit, save, delete operations
- **Search and Organization**: Search functionality and filtering
- **Data Persistence**: localStorage and session management
- **Security Integration**: XSS prevention and input sanitization

### 3. End-to-End (E2E) Tests

**Framework**: Playwright  
**Location**: `tests/e2e/`  
**Coverage**: Complete user journeys across browsers

```bash
# Run E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

#### Test Scenarios:

- **Landing Page**: User interactions and waitlist functionality
- **Note Editor**: Text editing, formatting, and persistence
- **Cross-browser Testing**: Chromium, Firefox, WebKit
- **Mobile Responsiveness**: Different viewport sizes
- **Performance Metrics**: Web Vitals and loading times

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Memory optimization settings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run tests in a single fork to reduce memory usage
      },
    },
    // Test execution settings
    testTimeout: 10000, // 10 seconds per test
    hookTimeout: 10000, // 10 seconds for hooks
    teardownTimeout: 10000, // 10 seconds for teardown
    // Isolate tests to prevent memory leaks
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})
```

### Memory Optimization

All test scripts automatically run with increased Node.js memory allocation:

```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--max-old-space-size=4096' vitest",
    "test:ci": "NODE_OPTIONS='--max-old-space-size=4096' vitest run --reporter=verbose",
    "test:coverage": "NODE_OPTIONS='--max-old-space-size=4096' vitest run --coverage"
  }
}
```

This ensures tests have 4GB of heap space available, preventing "JavaScript heap out of memory" errors.

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
    { name: 'Mobile Chrome', use: devices['Pixel 5'] },
    { name: 'Mobile Safari', use: devices['iPhone 12'] },
  ],
})
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('should handle user interactions', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<MyComponent onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalled()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should complete user workflow', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /get started/i }).click()

  await expect(page).toHaveURL('/dashboard')
})
```

## Security Testing

### XSS Prevention Tests

```typescript
it('should sanitize malicious input', () => {
  const maliciousInput = '<script>alert("xss")</script>'
  const sanitized = sanitizeContent(maliciousInput)

  expect(sanitized).not.toContain('<script>')
})
```

### Input Validation Tests

```typescript
it('should validate email format', async () => {
  const user = userEvent.setup()

  await user.type(emailInput, 'invalid-email')
  await user.click(submitButton)

  expect(screen.getByText(/invalid email/i)).toBeVisible()
})
```

## CI/CD Integration

### GitHub Actions Workflows

#### Main CI Pipeline (`.github/workflows/ci.yml`)

- Linting and formatting
- Type checking
- Unit tests
- Integration tests
- E2E tests
- Security audit
- Build verification

#### Comprehensive Test Suite (`.github/workflows/test.yml`)

- Cross-platform testing (Ubuntu, Windows, macOS)
- Multiple Node.js versions (18, 20)
- Browser matrix testing (Chromium, Firefox, WebKit)
- Coverage reporting
- Performance testing with Lighthouse

### Coverage Requirements

- **Minimum Coverage**: 80% for all metrics
- **Critical Paths**: 90%+ coverage required
- **Security Functions**: 100% coverage required

### PR Checks

All pull requests must pass:

- [ ] Unit tests (all passing)
- [ ] Integration tests (all passing)
- [ ] E2E tests (all passing)
- [ ] Coverage thresholds (≥80%)
- [ ] Security tests (all passing)
- [ ] Linting and formatting
- [ ] Type checking
- [ ] Build verification
- [ ] Commit message format (Conventional Commits)

### Commit Message Requirements

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to ensure consistent commit messages:

**Format:** `<type>[optional scope]: <description>`

**Valid types:**

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or fixing tests
- `build:` - Build system changes
- `ci:` - CI configuration changes
- `chore:` - Other maintenance tasks

**Examples:**

```
feat: add user authentication
fix: resolve memory leak in editor
docs: update testing guidelines
test: add integration tests for search
```

## Performance Testing

### Lighthouse Metrics

Monitored metrics with thresholds:

- **Performance Score**: ≥80
- **Accessibility Score**: ≥90
- **Best Practices Score**: ≥80
- **SEO Score**: ≥80
- **First Contentful Paint**: ≤2s
- **Largest Contentful Paint**: ≤2.5s
- **Cumulative Layout Shift**: ≤0.1
- **Total Blocking Time**: ≤300ms

### Performance Test Example

```typescript
test('should load within performance budget', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  const loadTime = Date.now() - startTime

  expect(loadTime).toBeLessThan(2000)
})
```

## Debugging Tests

### Unit Tests

```bash
# Debug specific test file
npm run test -- --reporter=verbose src/__tests__/MyComponent.test.tsx

# Debug with browser DevTools
npm run test:ui
```

### E2E Tests

```bash
# Run in headed mode
npx playwright test --headed

# Debug with Playwright Inspector
npm run test:e2e:debug

# Generate trace files
npx playwright test --trace on
```

## Test Data Management

### Mocking Strategy

- **External APIs**: Mocked in test setup
- **localStorage**: Mocked globally
- **Analytics**: Mocked to prevent tracking in tests
- **Monitoring**: Mocked to avoid error reporting

### Test Fixtures

```typescript
// Create reusable test data
export const createMockNote = (overrides = {}): Note => ({
  id: 'test-note-1',
  title: 'Test Note',
  content: 'Test content',
  tags: ['test'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})
```

## Best Practices

### Writing Effective Tests

1. **Test User Behavior**: Focus on what users do, not implementation details
2. **Use Descriptive Names**: Test names should explain what is being tested
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Avoid Implementation Details**: Test the interface, not the internals
5. **Keep Tests Independent**: Each test should run in isolation

### Performance Considerations

1. **Parallel Execution**: Tests run in parallel where possible
2. **Efficient Selectors**: Use accessible selectors over complex CSS
3. **Cleanup**: Properly clean up after tests
4. **Mock Heavy Operations**: Mock expensive operations like API calls

### Security Testing Guidelines

1. **Input Validation**: Test all user inputs for validation
2. **XSS Prevention**: Test content sanitization
3. **Authentication**: Test access controls
4. **Data Exposure**: Ensure sensitive data isn't leaked

## Troubleshooting

### Memory Issues

#### Symptoms

- "JavaScript heap out of memory" errors
- Test process termination
- Inconsistent test execution
- Tests failing randomly

#### Solutions

**1. Increase Node.js Memory Limit**

The project already includes memory optimization in test scripts. If you still encounter issues:

```bash
# Manually set memory limit (8GB)
export NODE_OPTIONS="--max-old-space-size=8192"
npm run test
```

**2. Run Tests in Single Fork Mode**

The vitest config is already optimized to use single fork mode, which reduces memory usage at the cost of speed:

```typescript
pool: 'forks',
poolOptions: {
  forks: {
    singleFork: true, // Prevents parallel execution memory spike
  },
},
```

**3. Isolate Tests**

If specific tests cause memory issues, run them individually:

```bash
npm run test:run -- path/to/specific.test.ts
```

**4. Clear Node Cache**

```bash
npm run clean
rm -rf node_modules/.vite
npm install
```

**5. Monitor Memory Usage**

Check current Node.js memory limit:

```bash
node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024 + ' MB')"
```

### Test Setup Issues

#### localStorage Mock Not Working

The test setup includes a comprehensive localStorage mock. If tests fail due to localStorage issues:

```typescript
// In your test file
beforeEach(() => {
  localStorage.clear() // Automatically available
})
```

#### Crypto Mock Issues

The global crypto mock is set up in `src/test-setup.ts`. If you need a specific UUID:

```typescript
import { vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => 'specific-test-uuid'),
  })
})
```

### Common Issues

**Flaky Tests**: Use `waitFor` and proper async handling
**Timeout Issues**: Increase timeout for slow operations (default is 10s)
**Mock Problems**: Ensure mocks are properly reset between tests (done automatically)
**Browser Issues**: Check Playwright browser installation

### VS Code Vitest Extension

When working with remote repositories, the Vitest extension may show path resolution errors.

**Solution**: Use terminal commands instead:

```bash
npm run test      # Watch mode
npm run test:ci   # Single run
npm run test:ui   # Browser UI
```

See [docs/vscode-troubleshooting.md](./vscode-troubleshooting.md) for detailed solutions.

### Getting Help

- Check test logs in CI for detailed error information
- Use `--reporter=verbose` for more detailed output
- Review Playwright traces for E2E test failures
- Check coverage reports to identify untested code paths
