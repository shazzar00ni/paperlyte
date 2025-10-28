import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { beforeEach, vi } from 'vitest'

// Mock global crypto for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => {
      // Generate a more realistic UUID for each call
      return `${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`
    }),
    subtle: {
      digest: vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
        // Mock SHA-256 digest - return a consistent hash for testing
        const text = new TextDecoder().decode(data)
        const hash = text
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const hashArray = new Uint8Array(32).fill(hash % 256)
        return hashArray.buffer
      }),
    },
  },
})

// Mock localStorage with functional implementation
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] || null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }

  get length(): number {
    return Object.keys(this.store).length
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store)
    return keys[index] || null
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new LocalStorageMock(),
  writable: true,
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

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})
