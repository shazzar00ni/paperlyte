import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dataService } from '../../services/dataService'
import type { Note } from '../../types'

describe('DataService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Notes Operations', () => {
    const mockNote: Note = {
      id: 'test-id-123',
      title: 'Test Note',
      content: 'This is a test note content',
      tags: ['test', 'vitest'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    it('should return empty array when no notes exist', async () => {
      const notes = await dataService.getNotes()
      expect(notes).toEqual([])
    })

    it('should save and retrieve notes', async () => {
      const success = await dataService.saveNote(mockNote)
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0]).toEqual(mockNote)
    })

    it('should update existing note', async () => {
      // Save initial note
      await dataService.saveNote(mockNote)

      // Update the note
      const updatedNote = {
        ...mockNote,
        title: 'Updated Title',
        content: 'Updated content',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      const success = await dataService.saveNote(updatedNote)
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('Updated Title')
      expect(notes[0].content).toBe('Updated content')
    })

    it('should add new notes to the beginning of the list', async () => {
      const note1 = { ...mockNote, id: 'note-1', title: 'First Note' }
      const note2 = { ...mockNote, id: 'note-2', title: 'Second Note' }

      await dataService.saveNote(note1)
      await dataService.saveNote(note2)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(2)
      expect(notes[0].id).toBe('note-2') // Most recent first
      expect(notes[1].id).toBe('note-1')
    })

    it('should delete notes by id', async () => {
      // Save multiple notes
      const note1 = { ...mockNote, id: 'note-1' }
      const note2 = { ...mockNote, id: 'note-2' }

      await dataService.saveNote(note1)
      await dataService.saveNote(note2)

      // Delete one note
      const success = await dataService.deleteNote('note-1')
      expect(success).toBe(true)

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].id).toBe('note-2')
    })

    it('should handle storage errors gracefully', async () => {
      // Mock localStorage to throw an error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const success = await dataService.saveNote(mockNote)
      expect(success).toBe(false)
    })
  })

  describe('Waitlist Operations', () => {
    const mockWaitlistEntry = {
      email: 'test@example.com',
      name: 'Test User',
      interest: 'professional' as const,
    }

    it('should add new waitlist entry', async () => {
      const result = await dataService.addToWaitlist(mockWaitlistEntry)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      const entries = await dataService.getWaitlistEntries()
      expect(entries).toHaveLength(1)
      expect(entries[0].email).toBe('test@example.com')
      expect(entries[0].name).toBe('Test User')
      expect(entries[0].id).toBe('test-uuid-123')
    })

    it('should prevent duplicate email entries', async () => {
      // Add first entry
      await dataService.addToWaitlist(mockWaitlistEntry)

      // Try to add duplicate
      const result = await dataService.addToWaitlist(mockWaitlistEntry)

      expect(result.success).toBe(false)
      expect(result.error).toBe("You're already on the waitlist!")

      const entries = await dataService.getWaitlistEntries()
      expect(entries).toHaveLength(1)
    })

    it('should return empty array when no waitlist entries exist', async () => {
      const entries = await dataService.getWaitlistEntries()
      expect(entries).toEqual([])
    })

    it('should handle waitlist storage errors', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      const result = await dataService.addToWaitlist(mockWaitlistEntry)
      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  describe('Data Management', () => {
    it('should export all data', async () => {
      const mockNote: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const mockWaitlistEntry = {
        email: 'test@example.com',
        name: 'Test User',
        interest: 'student' as const,
      }

      await dataService.saveNote(mockNote)
      await dataService.addToWaitlist(mockWaitlistEntry)

      const exportedData = await dataService.exportData()

      expect(exportedData.notes).toHaveLength(1)
      expect(exportedData.waitlist).toHaveLength(1)
      expect(exportedData.notes[0].id).toBe('note-1')
      expect(exportedData.waitlist[0].email).toBe('test@example.com')
    })

    it('should clear all data', async () => {
      // Add some data first
      const mockNote: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      await dataService.saveNote(mockNote)
      await dataService.addToWaitlist({
        email: 'test@example.com',
        name: 'Test User',
        interest: 'student',
      })

      // Clear all data
      await dataService.clearAllData()

      // Verify data is cleared
      const notes = await dataService.getNotes()
      const waitlist = await dataService.getWaitlistEntries()

      expect(notes).toHaveLength(0)
      expect(waitlist).toHaveLength(0)
    })

    it('should provide storage information', async () => {
      const mockNote: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      await dataService.saveNote(mockNote)

      const storageInfo = await dataService.getStorageInfo()

      expect(storageInfo.notesCount).toBe(1)
      expect(storageInfo.waitlistCount).toBe(0)
      expect(storageInfo.storageUsed).toBeGreaterThan(0)
      expect(storageInfo.storageQuota).toBe(5 * 1024 * 1024) // 5MB
    })
  })
})
