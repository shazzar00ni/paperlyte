import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia for CSS media queries
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

// Setup localStorage mock with actual Map-based implementation
class LocalStorageMock {
  private store: Map<string, string>

  constructor() {
    this.store = new Map()
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] || null
  }
}

// Set up localStorage globally before any tests run
global.localStorage = new LocalStorageMock() as Storage

// Mock crypto.randomUUID (used in note creation)
let mockUuidCounter = 1;
beforeEach(() => {
  const cryptoMock = {
    randomUUID: vi.fn(
      () => 'mock-uuid-' + (mockUuidCounter++)
    ),
  }
  vi.stubGlobal('crypto', cryptoMock)
})

// Mock PostHog analytics globally
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    people: {
      set: vi.fn(),
    },
  },
}))

// Mock Sentry monitoring globally
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setMeasurement: vi.fn(),
  withScope: vi.fn(callback =>
    callback({
      setUser: vi.fn(),
      setTag: vi.fn(),
      setContext: vi.fn(),
    })
  ),
  withErrorBoundary: vi.fn(),
  ErrorBoundary: vi.fn(),
}))

// Clear localStorage and reset mocks before each test
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
