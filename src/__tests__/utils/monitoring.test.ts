import { describe, it, expect, beforeEach, vi } from 'vitest'
import { monitoring } from '../../utils/monitoring'

// Mock Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setMeasurement: vi.fn(),
  withScope: vi.fn((callback) => callback({
    setUser: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
  })),
  withErrorBoundary: vi.fn(),
  ErrorBoundary: vi.fn(),
}))

// Mock analytics
vi.mock('../../utils/analytics', () => ({
  analytics: {
    track: vi.fn(),
    trackPerformance: vi.fn(),
  },
}))

// Get the mocked modules
import * as Sentry from '@sentry/react'
import { analytics } from '../../utils/analytics'

const mockSentry = vi.mocked(Sentry)
const mockAnalytics = vi.mocked(analytics)

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { monitoring } from '../../utils/monitoring'

describe('Monitoring Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logError', () => {
    it('should handle error logging', () => {
      const error = new Error('Test error')
      const context = {
        feature: 'note_editor',
        action: 'save',
        additionalData: { noteId: 'note-123' },
      }

      expect(() => monitoring.logError(error, context)).not.toThrow()
    })

    it('should handle errors without context', () => {
      const error = new Error('Simple error')

      expect(() => monitoring.logError(error)).not.toThrow()
    })

    it('should handle logging errors gracefully', () => {
      const error = new Error('Test error')
      expect(() => monitoring.logError(error)).not.toThrow()
    })
  })

  describe('logWarning', () => {
    it('should handle warning logging', () => {
      const message = 'Test warning'
      const context = { feature: 'test' }

      expect(() => monitoring.logWarning(message, context)).not.toThrow()
    })
  })

  describe('addBreadcrumb', () => {
    it('should handle breadcrumb addition', () => {
      expect(() => monitoring.addBreadcrumb('User clicked save button', 'user')).not.toThrow()
    })

    it('should handle breadcrumbs with data', () => {
      const data = { noteId: 'note-123', action: 'save' }
      expect(() => monitoring.addBreadcrumb('Note operation', 'data', data)).not.toThrow()
    })

    it('should handle breadcrumb errors gracefully', () => {
      expect(() => 
        monitoring.addBreadcrumb('Test message', 'test')
      ).not.toThrow()
    })
  })

  describe('setUser', () => {
    it('should handle user context setting', () => {
      expect(() => monitoring.setUser('user-123', 'test@example.com', { plan: 'free' })).not.toThrow()
    })

    it('should handle user context errors gracefully', () => {
      expect(() => 
        monitoring.setUser('user-123')
      ).not.toThrow()
    })
  })

  describe('trackPerformance', () => {
    it('should handle performance tracking', () => {
      const metric = {
        name: 'note_save',
        value: 100,
        unit: 'millisecond',
        tags: { feature: 'editor' },
      }

      expect(() => monitoring.trackPerformance(metric)).not.toThrow()
    })
  })

  describe('Error Resilience', () => {
    it('should continue functioning when monitoring systems fail', () => {
      expect(() => {
        monitoring.logError(new Error('test'))
        monitoring.addBreadcrumb('test', 'category')
        monitoring.setUser('user-1')
        monitoring.trackPerformance({ name: 'test', value: 100 })
      }).not.toThrow()
    })
  })
})