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

// Mock crypto API (used in note creation and authentication)
beforeEach(() => {
  const cryptoMock = {
    randomUUID: vi.fn(
      () => 'mock-uuid-' + Math.random().toString(36).substring(2, 9)
    ),
    subtle: {
      digest: vi.fn(async (algorithm: string, data: BufferSource) => {
        // Simple hash simulation for testing
        const text = new TextDecoder().decode(data as Uint8Array)
        let hash = 0
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i)
          hash = (hash << 5) - hash + char
          hash = hash & hash // Convert to 32bit integer
        }
        const hashArray = new Array(32).fill(0).map((_, i) => {
          return (Math.abs(hash) + i) % 256
        })
        return new Uint8Array(hashArray).buffer
      }),
    },
  }
  vi.stubGlobal('crypto', cryptoMock)
})
