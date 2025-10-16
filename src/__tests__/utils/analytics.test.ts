import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  analytics,
  trackEvent,
  trackFeatureUsage,
  trackUserAction,
} from '../../utils/analytics'

// Mock PostHog
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
  },
}))

describe('Analytics Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Initialize analytics for testing
    analytics.init()
  })

  describe('trackUserAction', () => {
    it('should call analytics track method', () => {
      const trackSpy = vi.spyOn(analytics, 'track').mockImplementation(() => {})

      trackUserAction('landing_page_view')

      expect(trackSpy).toHaveBeenCalledWith('user_landing_page_view', undefined)
    })

    it('should handle errors gracefully', () => {
      vi.spyOn(analytics, 'track').mockImplementation(() => {
        throw new Error('Analytics error')
      })

      expect(() => trackUserAction('test_action')).not.toThrow()
    })
  })

  describe('trackFeatureUsage', () => {
    it('should call analytics trackFeature method', () => {
      const trackFeatureSpy = vi
        .spyOn(analytics, 'trackFeature')
        .mockImplementation(() => {})

      trackFeatureUsage('note_editor', 'create')

      expect(trackFeatureSpy).toHaveBeenCalledWith(
        'note_editor',
        'create',
        undefined
      )
    })

    it('should pass through metadata', () => {
      const trackFeatureSpy = vi
        .spyOn(analytics, 'trackFeature')
        .mockImplementation(() => {})

      trackFeatureUsage('search', 'query', { query_length: 10 })

      expect(trackFeatureSpy).toHaveBeenCalledWith('search', 'query', {
        query_length: 10,
      })
    })
  })

  describe('trackEvent', () => {
    it('should call analytics track method', () => {
      const trackSpy = vi.spyOn(analytics, 'track').mockImplementation(() => {})

      trackEvent('custom_event', { custom_prop: 'value' })

      expect(trackSpy).toHaveBeenCalledWith('custom_event', {
        custom_prop: 'value',
      })
    })
  })

  describe('Error Handling', () => {
    it('should continue functioning when analytics fails', () => {
      vi.spyOn(analytics, 'track').mockImplementation(() => {
        throw new Error('Analytics unavailable')
      })

      expect(() => {
        trackUserAction('test')
        trackFeatureUsage('test', 'action')
        trackEvent('test_event')
      }).not.toThrow()
    })
  })
})
