# Test Infrastructure

This directory contains shared test utilities and infrastructure for the Paperlyte test suite.

## Files

### `../test-setup.ts`

Comprehensive test setup file (located at `src/test-setup.ts`) that provides:
Comprehensive test setup file that provides:

- **React Testing Library Integration**: Automatic cleanup after each test
- **localStorage Mock**: Map-based implementation for reliable testing
- **crypto.randomUUID Mock**: Consistent UUID generation
- **window.matchMedia Mock**: CSS media query support
- **PostHog Analytics Mock**: Prevents actual analytics calls
- **Sentry Monitoring Mock**: Captures error tracking without sending data

This file is **referenced** by the main test setup but is kept here as documentation and potential future utilities.

## Usage

The test setup is automatically applied to all tests via `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

## Adding Test Utilities

When creating shared test utilities:

1. **Create utility files** in this directory
2. **Export utilities** for use in test files
3. **Document usage** in this README

### Example Test Utility

```typescript
// src/test/utils/testHelpers.ts
export function createMockNote(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Test Note',
    content: 'Test content',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
```

### Using in Tests

```typescript
import { createMockNote } from '@/test/utils/testHelpers'

it('should save note', async () => {
  const note = createMockNote({ title: 'My Note' })
  await dataService.saveNote(note)
  // ... assertions
})
```

## Test Patterns

### Component Testing Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup specific to this test suite
    localStorage.clear()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument()
    })
  })
})
```

### Service Testing Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { dataService } from '@/services/dataService'

describe('DataService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should persist data', async () => {
    const testData = { id: '1', value: 'test' }
    await dataService.save(testData)

    const retrieved = await dataService.get('1')
    expect(retrieved).toEqual(testData)
  })
})
```

## Memory Optimization

All tests run with optimized memory settings:

- **4GB heap space** via `NODE_OPTIONS='--max-old-space-size=4096'`
- **Single fork mode** to reduce memory usage
- **Test isolation** to prevent memory leaks
- **Automatic cleanup** after each test

See [docs/TESTING.md](../../docs/TESTING.md) for detailed troubleshooting.

## Best Practices

1. **Always clean up**: Use `beforeEach` to clear localStorage and mocks
2. **Use async properly**: Always await async operations
3. **Mock external dependencies**: Don't make real API calls or analytics tracking
4. **Test user behavior**: Use Testing Library's user-centric queries
5. **Keep tests focused**: One assertion per test when possible
6. **Use descriptive names**: Test names should describe the behavior being tested

## Related Documentation

- [Main Testing Guide](../../docs/TESTING.md)
- [Development Workflow](../../docs/development-workflow.md)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
