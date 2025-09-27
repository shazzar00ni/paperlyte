import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  trackUserAction, 
  trackFeatureUsage, 
  trackEvent,
  analytics
} from '../../utils/analytics'

describe('Analytics Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trackUserAction', () => {
    it('should call analytics track method', () => {
      const trackSpy = vi.spyOn(analytics, 'track')
      
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
      const trackFeatureSpy = vi.spyOn(analytics, 'trackFeature')
      
      trackFeatureUsage('note_editor', 'create')
      
      expect(trackFeatureSpy).toHaveBeenCalledWith('note_editor', 'create', undefined)
    })

    it('should pass through metadata', () => {
      const trackFeatureSpy = vi.spyOn(analytics, 'trackFeature')
      
      trackFeatureUsage('search', 'query', { query_length: 10 })
      
      expect(trackFeatureSpy).toHaveBeenCalledWith('search', 'query', { query_length: 10 })
    })
  })

  describe('trackEvent', () => {
    it('should call analytics track method', () => {
      const trackSpy = vi.spyOn(analytics, 'track')
      
      trackEvent('custom_event', { custom_prop: 'value' })
      
      expect(trackSpy).toHaveBeenCalledWith('custom_event', { custom_prop: 'value' })
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