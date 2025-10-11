import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dataService } from '../dataService'
import type { Note, WaitlistEntry } from '../../types'

// Mock the monitoring utility to prevent logging during tests
vi.mock('../../utils/monitoring', () => ({
  monitoring: {
    logError: vi.fn(),
  },
}))

describe('DataService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Notes Operations', () => {
    const testNote: Note = {
      id: 'test-id',
      title: 'Test Note',
      content: 'This is a test note content',
      tags: ['test', 'example'],
      createdAt: '2025-09-25T10:00:00.000Z',
      updatedAt: '2025-09-25T10:00:00.000Z',
    }

    it('should return empty array when no notes exist', async () => {
      const notes = await dataService.getNotes()
      expect(notes).toEqual([])
    })

    it('should save and retrieve a note', async () => {
      const success = await dataService.saveNote(testNote)
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0]).toEqual(testNote)
    })

    it('should update an existing note', async () => {
      await dataService.saveNote(testNote)
      const updatedNote = { ...testNote, title: 'Updated Title' }
      const success = await dataService.saveNote(updatedNote)
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('Updated Title')
    })

    it('should delete a note', async () => {
      await dataService.saveNote(testNote)
      const success = await dataService.deleteNote('test-id')
      expect(success).toBe(true)
      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(0)
    })

    it('should return empty array on getNotes error', async () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      const notes = await dataService.getNotes()
      expect(notes).toEqual([])
    })

    it('should return false on saveNote error', async () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      const success = await dataService.saveNote(testNote)
      expect(success).toBe(false)
    })

    it('should return false on deleteNote error', async () => {
      await dataService.saveNote(testNote)
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      const success = await dataService.deleteNote('test-id')
      expect(success).toBe(false)
    })
  })

  describe('Waitlist Operations', () => {
    const waitlistEntry: Omit<WaitlistEntry, 'id' | 'createdAt'> = {
      email: 'test@example.com',
      name: 'Test User',
      interest: 'professional',
    }

    it('should add entry to waitlist', async () => {
      const result = await dataService.addToWaitlist(waitlistEntry)
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should prevent duplicate email entries', async () => {
      await dataService.addToWaitlist(waitlistEntry)
      const result = await dataService.addToWaitlist(waitlistEntry)
      expect(result.success).toBe(false)
      expect(result.error).toBe("You're already on the waitlist!")
    })

    it('should retrieve waitlist entries', async () => {
      await dataService.addToWaitlist(waitlistEntry)
      const entries = await dataService.getWaitlistEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].email).toBe('test@example.com')
    })

    it('should return error object on addToWaitlist error', async () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      const result = await dataService.addToWaitlist(waitlistEntry)
      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })

    it('should return empty array on getWaitlistEntries error', async () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      const entries = await dataService.getWaitlistEntries()
      expect(entries).toEqual([])
    })
  })

  describe('Storage Operations', () => {
    it('should clear all data', async () => {
      await dataService.saveNote({
        id: 'test-id',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        createdAt: '2025-09-25T10:00:00.000Z',
        updatedAt: '2025-09-25T10:00:00.000Z',
      })
      const success = await dataService.clearAllData()
      expect(success).toBe(true)
      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(0)
    })

    it('should return false on clearAllData error', async () => {
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      const success = await dataService.clearAllData()
      expect(success).toBe(false)
    })

    it('should export all data', async () => {
      const note = {
        id: 'test-id',
        title: 'Test Note',
        content: 'Test content',
        tags: [],
        createdAt: '2025-09-25T10:00:00.000Z',
        updatedAt: '2025-09-25T10:00:00.000Z',
      }
      const waitlistEntry = {
        email: 'test@example.com',
        name: 'Test User',
        interest: 'professional' as const,
      }
      await dataService.saveNote(note)
      await dataService.addToWaitlist(waitlistEntry)
      const exportedData = await dataService.exportData()
      expect(exportedData.notes).toHaveLength(1)
      expect(exportedData.waitlist).toHaveLength(1)
    })

    it('should return empty data on exportData error', async () => {
       vi.spyOn(dataService, 'getNotes').mockImplementation(async () => {
        throw new Error('Storage error')
      })
      const exportedData = await dataService.exportData()
      expect(exportedData.notes).toEqual([])
      expect(exportedData.waitlist).toEqual([])
    })

    it('should get storage info', async () => {
        const info = await dataService.getStorageInfo()
        expect(info).not.toBeNull()
        expect(info?.notesCount).toBe(0)
    })

    it('should return null on getStorageInfo error', async () => {
        vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
            throw new Error('Storage error')
        })
        const info = await dataService.getStorageInfo()
        expect(info).toBeNull()
    })
  })
})