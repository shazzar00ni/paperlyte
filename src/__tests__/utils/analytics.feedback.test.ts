import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  trackFeedbackEvent,
  trackInterviewEvent,
  trackFeatureUsage,
} from '../../utils/analytics'

// Mock the analytics module's internal dependencies
vi.mock('../../utils/analytics', async () => {
  const actual = await vi.importActual<typeof import('../../utils/analytics')>(
    '../../utils/analytics'
  )
  return {
    ...actual,
    trackFeatureUsage: vi.fn(),
  }
})

describe('Analytics - Feedback and Interview Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trackFeedbackEvent', () => {
    it('should track feedback view event', () => {
      trackFeedbackEvent('view')

      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'view', undefined)
    })

    it('should track feedback submit event', () => {
      trackFeedbackEvent('submit')

      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'submit', undefined)
    })

    it('should track feedback cancel event', () => {
      trackFeedbackEvent('cancel')

      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'cancel', undefined)
    })

    it('should track feedback event with properties', () => {
      const properties = {
        type: 'bug',
        hasEmail: true,
        messageLength: 150,
      }

      trackFeedbackEvent('submit', properties)

      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'submit', properties)
    })

    it('should handle empty properties object', () => {
      trackFeedbackEvent('view', {})

      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'view', {})
    })

    it('should handle complex property values', () => {
      const properties = {
        type: 'feature',
        hasEmail: false,
        hasName: true,
        messageLength: 500,
        timestamp: new Date().toISOString(),
      }

      trackFeedbackEvent('submit', properties)

      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'submit', properties)
    })
  })

  describe('trackInterviewEvent', () => {
    it('should track interview view event', () => {
      trackInterviewEvent('view')

      expect(trackFeatureUsage).toHaveBeenCalledWith('user_interview', 'view', undefined)
    })

    it('should track interview schedule event', () => {
      trackInterviewEvent('schedule')

      expect(trackFeatureUsage).toHaveBeenCalledWith('user_interview', 'schedule', undefined)
    })

    it('should track interview cancel event', () => {
      trackInterviewEvent('cancel')

      expect(trackFeatureUsage).toHaveBeenCalledWith('user_interview', 'cancel', undefined)
    })

    it('should track interview event with properties', () => {
      const properties = {
        availability: 'morning',
        daysCount: 3,
        topicsCount: 2,
      }

      trackInterviewEvent('schedule', properties)

      expect(trackFeatureUsage).toHaveBeenCalledWith('user_interview', 'schedule', properties)
    })

    it('should handle detailed scheduling properties', () => {
      const properties = {
        availability: 'flexible',
        daysCount: 5,
        topicsCount: 4,
        timezone: 'America/New_York',
        hasNotes: true,
      }

      trackInterviewEvent('schedule', properties)

      expect(trackFeatureUsage).toHaveBeenCalledWith('user_interview', 'schedule', properties)
    })

    it('should handle empty properties object', () => {
      trackInterviewEvent('view', {})

      expect(trackFeatureUsage).toHaveBeenCalledWith('user_interview', 'view', {})
    })
  })

  describe('Event Action Types', () => {
    it('should support all feedback action types', () => {
      const actions: Array<'view' | 'submit' | 'cancel'> = ['view', 'submit', 'cancel']

      actions.forEach(action => {
        trackFeedbackEvent(action)
        expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', action, undefined)
      })

      expect(trackFeatureUsage).toHaveBeenCalledTimes(3)
    })

    it('should support all interview action types', () => {
      const actions: Array<'view' | 'schedule' | 'cancel'> = ['view', 'schedule', 'cancel']

      actions.forEach(action => {
        trackInterviewEvent(action)
        expect(trackFeatureUsage).toHaveBeenCalledWith('user_interview', action, undefined)
      })

      expect(trackFeatureUsage).toHaveBeenCalledTimes(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors in trackFeedbackEvent gracefully', () => {
      vi.mocked(trackFeatureUsage).mockImplementation(() => {
        throw new Error('Analytics error')
      })

      expect(() => trackFeedbackEvent('view')).not.toThrow()
    })

    it('should handle errors in trackInterviewEvent gracefully', () => {
      vi.mocked(trackFeatureUsage).mockImplementation(() => {
        throw new Error('Analytics error')
      })

      expect(() => trackInterviewEvent('schedule')).not.toThrow()
    })
  })

  describe('Property Validation', () => {
    it('should accept undefined properties', () => {
      trackFeedbackEvent('view', undefined)
      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'view', undefined)
    })

    it('should accept null properties', () => {
      trackFeedbackEvent('submit', null as any)
      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'submit', null)
    })

    it('should preserve property types', () => {
      const properties = {
        stringProp: 'value',
        numberProp: 123,
        booleanProp: true,
        arrayProp: [1, 2, 3],
        objectProp: { nested: 'value' },
      }

      trackFeedbackEvent('submit', properties)
      expect(trackFeatureUsage).toHaveBeenCalledWith('feedback', 'submit', properties)
    })
  })
})