import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '../../types'
import { dataService } from '../dataService'

describe('DataService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup after each test as well
    localStorage.clear()
  })

  describe('Notes Operations', () => {
    it('should return empty array when no notes exist', async () => {
      const notes = await dataService.getNotes()
      expect(notes).toEqual([])
    })

    it('should save and retrieve a note', async () => {
      const testNote: Note = {
        id: 'test-id',
        title: 'Test Note',
        content: 'This is a test note content',
        tags: ['test', 'example'],
        createdAt: '2025-09-25T10:00:00.000Z',
        updatedAt: '2025-09-25T10:00:00.000Z',
      }

      const success = await dataService.saveNote(testNote)
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      // Check core properties - saveNote adds version, wordCount, and updates updatedAt
      expect(notes[0].id).toBe(testNote.id)
      expect(notes[0].title).toBe(testNote.title)
      expect(notes[0].content).toBe(testNote.content)
      expect(notes[0].tags).toEqual(testNote.tags)
      expect(notes[0].createdAt).toBe(testNote.createdAt)
      // These are added/modified by saveNote
      expect(notes[0].version).toBe(1)
      expect(notes[0].wordCount).toBe(6) // "This is a test note content" = 6 words
      expect(notes[0].updatedAt).toBeDefined()
    })

    it('should update an existing note', async () => {
      const originalNote: Note = {
        id: 'test-id',
        title: 'Original Title',
        content: 'Original content',
        tags: [],
        createdAt: '2025-09-25T10:00:00.000Z',
        updatedAt: '2025-09-25T10:00:00.000Z',
      }

      await dataService.saveNote(originalNote)

      const updatedNote: Note = {
        ...originalNote,
        title: 'Updated Title',
        content: 'Updated content',
        updatedAt: '2025-09-25T11:00:00.000Z',
      }

      const success = await dataService.saveNote(updatedNote)
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('Updated Title')
      expect(notes[0].content).toBe('Updated content')
    })

    it('should delete a note', async () => {
      const testNote: Note = {
        id: 'test-id',
        title: 'Test Note',
        content: 'This will be deleted',
        tags: [],
        createdAt: '2025-09-25T10:00:00.000Z',
        updatedAt: '2025-09-25T10:00:00.000Z',
      }

      await dataService.saveNote(testNote)

      const success = await dataService.deleteNote('test-id')
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(0)
    })
  })

  describe('Waitlist Operations', () => {
    it('should add entry to waitlist', async () => {
      const entry = {
        email: 'test@example.com',
        name: 'Test User',
        interest: 'professional' as const,
      }

      const result = await dataService.addToWaitlist(entry)
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should prevent duplicate email entries', async () => {
      const entry = {
        email: 'test@example.com',
        name: 'Test User',
        interest: 'professional' as const,
      }

      // Add first entry
      await dataService.addToWaitlist(entry)

      // Try to add duplicate
      const result = await dataService.addToWaitlist(entry)
      expect(result.success).toBe(false)
      expect(result.error).toBe("You're already on the waitlist!")
    })

    it('should retrieve waitlist entries', async () => {
      const entry = {
        email: 'test@example.com',
        name: 'Test User',
        interest: 'student' as const,
      }

      await dataService.addToWaitlist(entry)
      const entries = await dataService.getWaitlistEntries()

      expect(entries).toHaveLength(1)
      expect(entries[0].email).toBe('test@example.com')
      expect(entries[0].name).toBe('Test User')
      expect(entries[0].interest).toBe('student')
      expect(entries[0].id).toBeDefined()
      expect(entries[0].createdAt).toBeDefined()
    })
  })

  describe('Storage Operations', () => {
    it.skip('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw an error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const testNote: Note = {
        id: 'test-id',
        title: 'Test Note',
        content: 'This should fail to save',
        tags: [],
        createdAt: '2025-09-25T10:00:00.000Z',
        updatedAt: '2025-09-25T10:00:00.000Z',
      }

      const success = await dataService.saveNote(testNote)
      expect(success).toBe(false)
    })

    it('should clear all data', async () => {
      // Add some test data
      const testNote: Note = {
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

      await dataService.saveNote(testNote)
      await dataService.addToWaitlist(waitlistEntry)

      // Clear all data
      await dataService.clearAllData()
      // clearAllData returns void, so we just check it completes without throwing

      // Verify data is cleared
      const notes = await dataService.getNotes()
      const entries = await dataService.getWaitlistEntries()

      expect(notes).toHaveLength(0)
      expect(entries).toHaveLength(0)
    })
  })
})
