import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dataService } from '../dataService'
import type { FeedbackEntry, InterviewRequest } from '../../types'

describe('DataService - Feedback and Interview Operations', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Feedback Operations', () => {
    const mockFeedbackEntry = {
      type: 'feature' as const,
      message: 'This is a test feedback message',
      email: 'test@example.com',
      name: 'Test User',
      userAgent: 'Mozilla/5.0',
      url: 'http://localhost',
    }

    describe('addFeedback', () => {
      it('should add feedback entry successfully', async () => {
        const result = await dataService.addFeedback(mockFeedbackEntry)

        expect(result.success).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should auto-generate id and createdAt', async () => {
        await dataService.addFeedback(mockFeedbackEntry)

        const entries = await dataService.getFeedbackEntries()
        expect(entries).toHaveLength(1)
        expect(entries[0].id).toBeDefined()
        expect(entries[0].createdAt).toBeDefined()
      })

      it('should set status to "new" by default', async () => {
        await dataService.addFeedback(mockFeedbackEntry)

        const entries = await dataService.getFeedbackEntries()
        expect(entries[0].status).toBe('new')
      })

      it('should handle optional fields (email, name)', async () => {
        const minimalFeedback = {
          type: 'bug' as const,
          message: 'Bug report without contact info',
        }

        const result = await dataService.addFeedback(minimalFeedback)
        expect(result.success).toBe(true)

        const entries = await dataService.getFeedbackEntries()
        expect(entries[0].email).toBeUndefined()
        expect(entries[0].name).toBeUndefined()
      })

      it('should handle all feedback types', async () => {
        const types: Array<'bug' | 'feature' | 'improvement' | 'other'> = [
          'bug',
          'feature',
          'improvement',
          'other',
        ]

        for (const type of types) {
          await dataService.addFeedback({
            type,
            message: `Test ${type} feedback`,
          })
        }

        const entries = await dataService.getFeedbackEntries()
        expect(entries).toHaveLength(4)
        expect(entries.map(e => e.type)).toEqual(
          expect.arrayContaining(types)
        )
      })

      it('should store userAgent and url when provided', async () => {
        await dataService.addFeedback(mockFeedbackEntry)

        const entries = await dataService.getFeedbackEntries()
        expect(entries[0].userAgent).toBe('Mozilla/5.0')
        expect(entries[0].url).toBe('http://localhost')
      })

      it('should handle empty message gracefully', async () => {
        const result = await dataService.addFeedback({
          type: 'other',
          message: '',
        })

        // Should still succeed at storage level (validation happens in component)
        expect(result.success).toBe(true)
      })

      it('should handle very long messages', async () => {
        const longMessage = 'a'.repeat(10000)
        const result = await dataService.addFeedback({
          type: 'feature',
          message: longMessage,
        })

        expect(result.success).toBe(true)

        const entries = await dataService.getFeedbackEntries()
        expect(entries[0].message).toHaveLength(10000)
      })

      it('should handle special characters in message', async () => {
        const specialMessage = '<script>alert("test")</script> & special chars: é, ñ, 中文'
        const result = await dataService.addFeedback({
          type: 'bug',
          message: specialMessage,
        })

        expect(result.success).toBe(true)

        const entries = await dataService.getFeedbackEntries()
        expect(entries[0].message).toBe(specialMessage)
      })
    })

    describe('getFeedbackEntries', () => {
      it('should return empty array when no feedback exists', async () => {
        const entries = await dataService.getFeedbackEntries()
        expect(entries).toEqual([])
      })

      it('should retrieve all feedback entries', async () => {
        await dataService.addFeedback(mockFeedbackEntry)
        await dataService.addFeedback({
          type: 'bug',
          message: 'Bug report',
        })

        const entries = await dataService.getFeedbackEntries()
        expect(entries).toHaveLength(2)
      })

      it('should return entries sorted by createdAt descending', async () => {
        // Add entries with slight delays to ensure different timestamps
        await dataService.addFeedback({
          type: 'feature',
          message: 'First feedback',
        })

        await new Promise(resolve => setTimeout(resolve, 10))

        await dataService.addFeedback({
          type: 'bug',
          message: 'Second feedback',
        })

        const entries = await dataService.getFeedbackEntries()
        expect(entries[0].message).toBe('Second feedback')
        expect(entries[1].message).toBe('First feedback')
      })

      it('should include all feedback properties', async () => {
        await dataService.addFeedback(mockFeedbackEntry)

        const entries = await dataService.getFeedbackEntries()
        const entry = entries[0]

        expect(entry).toHaveProperty('id')
        expect(entry).toHaveProperty('type')
        expect(entry).toHaveProperty('message')
        expect(entry).toHaveProperty('email')
        expect(entry).toHaveProperty('name')
        expect(entry).toHaveProperty('userAgent')
        expect(entry).toHaveProperty('url')
        expect(entry).toHaveProperty('createdAt')
        expect(entry).toHaveProperty('status')
      })
    })
  })

  describe('Interview Scheduling Operations', () => {
    const mockInterviewRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      availability: 'morning' as const,
      preferredDays: ['Monday', 'Wednesday', 'Friday'],
      timezone: 'America/New_York',
      topics: ['Product feedback', 'Feature requests'],
      additionalNotes: 'Prefer early morning meetings',
    }

    describe('scheduleInterview', () => {
      it('should schedule interview successfully', async () => {
        const result = await dataService.scheduleInterview(mockInterviewRequest)

        expect(result.success).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should auto-generate id and createdAt', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const requests = await dataService.getInterviewRequests()
        expect(requests).toHaveLength(1)
        expect(requests[0].id).toBeDefined()
        expect(requests[0].createdAt).toBeDefined()
      })

      it('should set status to "pending" by default', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const requests = await dataService.getInterviewRequests()
        expect(requests[0].status).toBe('pending')
      })

      it('should prevent duplicate emails', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const result = await dataService.scheduleInterview(mockInterviewRequest)

        expect(result.success).toBe(false)
        expect(result.error).toBe('You already have a pending interview request!')
      })

      it('should detect duplicate emails case-insensitively', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const duplicateRequest = {
          ...mockInterviewRequest,
          email: 'JOHN@EXAMPLE.COM',
        }

        const result = await dataService.scheduleInterview(duplicateRequest)

        expect(result.success).toBe(false)
        expect(result.error).toBe('You already have a pending interview request!')
      })

      it('should handle all availability options', async () => {
        const availabilities: Array<'morning' | 'afternoon' | 'evening' | 'flexible'> = [
          'morning',
          'afternoon',
          'evening',
          'flexible',
        ]

        for (const [index, availability] of availabilities.entries()) {
          await dataService.scheduleInterview({
            ...mockInterviewRequest,
            email: `user${index}@example.com`,
            availability,
          })
        }

        const requests = await dataService.getInterviewRequests()
        expect(requests).toHaveLength(4)
        expect(requests.map(r => r.availability)).toEqual(
          expect.arrayContaining(availabilities)
        )
      })

      it('should store multiple preferred days', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const requests = await dataService.getInterviewRequests()
        expect(requests[0].preferredDays).toEqual(['Monday', 'Wednesday', 'Friday'])
      })

      it('should store multiple topics', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const requests = await dataService.getInterviewRequests()
        expect(requests[0].topics).toEqual(['Product feedback', 'Feature requests'])
      })

      it('should handle optional additionalNotes', async () => {
        const requestWithoutNotes = {
          ...mockInterviewRequest,
          email: 'different@example.com',
        }
        delete (requestWithoutNotes as any).additionalNotes

        const result = await dataService.scheduleInterview(requestWithoutNotes)
        expect(result.success).toBe(true)

        const requests = await dataService.getInterviewRequests()
        const request = requests.find(r => r.email === 'different@example.com')
        expect(request?.additionalNotes).toBeUndefined()
      })

      it('should preserve timezone information', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const requests = await dataService.getInterviewRequests()
        expect(requests[0].timezone).toBe('America/New_York')
      })

      it('should handle single day selection', async () => {
        const singleDayRequest = {
          ...mockInterviewRequest,
          preferredDays: ['Tuesday'],
        }

        await dataService.scheduleInterview(singleDayRequest)

        const requests = await dataService.getInterviewRequests()
        expect(requests[0].preferredDays).toEqual(['Tuesday'])
      })

      it('should handle single topic selection', async () => {
        const singleTopicRequest = {
          ...mockInterviewRequest,
          topics: ['Pain points'],
        }

        await dataService.scheduleInterview(singleTopicRequest)

        const requests = await dataService.getInterviewRequests()
        expect(requests[0].topics).toEqual(['Pain points'])
      })
    })

    describe('getInterviewRequests', () => {
      it('should return empty array when no requests exist', async () => {
        const requests = await dataService.getInterviewRequests()
        expect(requests).toEqual([])
      })

      it('should retrieve all interview requests', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)
        await dataService.scheduleInterview({
          ...mockInterviewRequest,
          email: 'jane@example.com',
        })

        const requests = await dataService.getInterviewRequests()
        expect(requests).toHaveLength(2)
      })

      it('should return requests sorted by createdAt descending', async () => {
        await dataService.scheduleInterview({
          ...mockInterviewRequest,
          email: 'first@example.com',
        })

        await new Promise(resolve => setTimeout(resolve, 10))

        await dataService.scheduleInterview({
          ...mockInterviewRequest,
          email: 'second@example.com',
        })

        const requests = await dataService.getInterviewRequests()
        expect(requests[0].email).toBe('second@example.com')
        expect(requests[1].email).toBe('first@example.com')
      })

      it('should include all request properties', async () => {
        await dataService.scheduleInterview(mockInterviewRequest)

        const requests = await dataService.getInterviewRequests()
        const request = requests[0]

        expect(request).toHaveProperty('id')
        expect(request).toHaveProperty('name')
        expect(request).toHaveProperty('email')
        expect(request).toHaveProperty('availability')
        expect(request).toHaveProperty('preferredDays')
        expect(request).toHaveProperty('timezone')
        expect(request).toHaveProperty('topics')
        expect(request).toHaveProperty('createdAt')
        expect(request).toHaveProperty('status')
      })
    })
  })

  describe('Data Export', () => {
    it('should export feedback and interview data', async () => {
      await dataService.addFeedback({
        type: 'feature',
        message: 'Test feedback',
      })

      await dataService.scheduleInterview({
        name: 'Test User',
        email: 'test@example.com',
        availability: 'flexible',
        preferredDays: ['Monday'],
        timezone: 'UTC',
        topics: ['Product feedback'],
      })

      const exportedData = await dataService.exportData()

      expect(exportedData).toHaveProperty('feedback')
      expect(exportedData).toHaveProperty('interviews')
      expect(exportedData.feedback).toHaveLength(1)
      expect(exportedData.interviews).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle storage errors in addFeedback', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const result = await dataService.addFeedback({
        type: 'bug',
        message: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')

      vi.restoreAllMocks()
    })

    it('should handle storage errors in scheduleInterview', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const result = await dataService.scheduleInterview({
        name: 'Test',
        email: 'test@example.com',
        availability: 'flexible',
        preferredDays: ['Monday'],
        timezone: 'UTC',
        topics: ['Test'],
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')

      vi.restoreAllMocks()
    })
  })
})