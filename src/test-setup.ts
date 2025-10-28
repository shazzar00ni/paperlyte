import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { beforeEach, vi } from 'vitest'

// Mock global crypto for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => {
      // Generate RFC 4122 UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }),
    subtle: {
      digest: vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
        // Mock SHA-256 digest - deterministic but high-entropy for testing
        const text = new TextDecoder().decode(data)

        // Generate a numeric seed from the input string
        let seed = 0
        for (let i = 0; i < text.length; i++) {
          seed = (seed * 31 + text.charCodeAt(i)) | 0 // Use |0 to keep as 32-bit int
        }

        // Simple PRNG (Linear Congruential Generator) to generate varied bytes
        const hashArray = new Uint8Array(32)
        let state = Math.abs(seed) || 1 // Ensure non-zero seed

        for (let i = 0; i < 32; i++) {
          // LCG formula: state = (a * state + c) % m
          // Using common constants: a=1664525, c=1013904223, m=2^32
          state = (state * 1664525 + 1013904223) >>> 0
          hashArray[i] = (state >>> 24) & 0xff // Take high byte for better distribution
        }

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
