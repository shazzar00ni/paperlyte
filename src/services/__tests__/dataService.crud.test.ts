/**
 * Tests for enhanced CRUD operations in dataService
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '../../types'
import { dataService } from '../dataService'

// Mock dependencies
vi.mock('../../utils/monitoring', () => ({
  monitoring: {
    addBreadcrumb: vi.fn(),
    logError: vi.fn(),
  },
}))

vi.mock('../../utils/indexedDB', () => ({
  indexedDB: {
    init: vi.fn(),
    getAll: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(),
    getStorageEstimate: vi.fn(),
  },
  STORE_NAMES: {
    NOTES: 'notes',
    WAITLIST: 'waitlist',
    SYNC_METADATA: 'sync_metadata',
    CONFLICTS: 'conflicts',
  },
}))

vi.mock('../../utils/dataMigration', () => ({
  migrateToIndexedDB: vi.fn().mockResolvedValue({
    success: true,
    notesCount: 0,
    waitlistCount: 0,
    errors: 0,
  }),
  isIndexedDBAvailable: vi.fn().mockReturnValue(false), // Use localStorage for tests
}))

describe('DataService Enhanced CRUD Operations', () => {
  beforeEach(() => {
    // Clear all localStorage including any paperlyte_ prefixed keys
    localStorage.clear()
    // Extra cleanup to ensure no lingering state - collect keys first to avoid index shifts
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('paperlyte_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    vi.clearAllMocks()
  })

  describe('Word Count Tracking', () => {
    it('should calculate and store word count when saving a note', async () => {
      const note: Note = {
        id: 'note-1',
        title: 'Test Note',
        content: 'This is a test note with eight words.',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const success = await dataService.saveNote(note)
      expect(success).toBe(true)

      const savedNote = await dataService.getNote('note-1')
      expect(savedNote).not.toBeNull()
      expect(savedNote?.wordCount).toBe(8)
    })

    it('should handle empty content word count', async () => {
      const note: Note = {
        id: 'note-2',
        title: 'Empty Note',
        content: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      const savedNote = await dataService.getNote('note-2')
      expect(savedNote?.wordCount).toBe(0)
    })
  })

  describe('Note Versioning', () => {
    it('should initialize version to 1 for new notes', async () => {
      const note: Note = {
        id: 'note-version-1',
        title: 'New Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      const savedNote = await dataService.getNote('note-version-1')
      expect(savedNote?.version).toBe(1)
    })

    it('should increment version on updates', async () => {
      const note: Note = {
        id: 'note-version-2',
        title: 'Versioned Note',
        content: 'Original content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Save initial version
      await dataService.saveNote(note)
      let savedNote = await dataService.getNote('note-version-2')
      expect(savedNote?.version).toBe(1)

      // Update the note
      const updatedNote: Note = {
        ...note,
        content: 'Updated content',
        updatedAt: new Date().toISOString(),
      }
      await dataService.saveNote(updatedNote)
      savedNote = await dataService.getNote('note-version-2')
      expect(savedNote?.version).toBe(2)

      // Update again
      const updatedNote2: Note = {
        ...updatedNote,
        content: 'Updated again',
        updatedAt: new Date().toISOString(),
      }
      await dataService.saveNote(updatedNote2)
      savedNote = await dataService.getNote('note-version-2')
      expect(savedNote?.version).toBe(3)
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize title by removing HTML tags', async () => {
      const note: Note = {
        id: 'note-sanitize-1',
        title: '<script>alert("xss")</script>Clean Title',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      const savedNote = await dataService.getNote('note-sanitize-1')
      expect(savedNote?.title).not.toContain('<script>')
      expect(savedNote?.title).toBe('Clean Title')
    })

    it('should sanitize content by removing script tags', async () => {
      const note: Note = {
        id: 'note-sanitize-2',
        title: 'Test',
        content: '<script>alert("xss")</script>Safe content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      const savedNote = await dataService.getNote('note-sanitize-2')
      expect(savedNote?.content).not.toContain('<script>')
    })

    it('should reject notes with empty titles', async () => {
      const note: Note = {
        id: 'note-invalid-1',
        title: '',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await expect(dataService.saveNote(note)).rejects.toThrow(
        'Note title is required'
      )
    })

    it('should reject notes with titles exceeding 255 characters', async () => {
      const note: Note = {
        id: 'note-invalid-2',
        title: 'a'.repeat(300),
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await expect(dataService.saveNote(note)).rejects.toThrow(
        'Note title must be 255 characters or less'
      )
    })
  })

  describe('Soft Delete', () => {
    it('should soft delete a note by setting deletedAt timestamp', async () => {
      const note: Note = {
        id: 'note-delete-1',
        title: 'To Delete',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      const success = await dataService.deleteNote('note-delete-1')
      expect(success).toBe(true)

      const deletedNote = await dataService.getNote('note-delete-1')
      expect(deletedNote).not.toBeNull()
      expect(deletedNote?.deletedAt).not.toBeNull()
    })

    it('should exclude soft-deleted notes from getNotes', async () => {
      const note1: Note = {
        id: 'note-list-1',
        title: 'Active Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const note2: Note = {
        id: 'note-list-2',
        title: 'Deleted Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note1)
      await dataService.saveNote(note2)
      await dataService.deleteNote('note-list-2')

      const notes = await dataService.getNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].id).toBe('note-list-1')
    })
  })

  describe('Restore Deleted Notes', () => {
    it('should restore a soft-deleted note', async () => {
      const note: Note = {
        id: 'note-restore-1',
        title: 'Restorable Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      await dataService.deleteNote('note-restore-1')

      const restored = await dataService.restoreNote('note-restore-1')
      expect(restored).toBe(true)

      const restoredNote = await dataService.getNote('note-restore-1')
      expect(restoredNote).not.toBeNull()
      expect(restoredNote?.deletedAt).toBeNull()

      // Should appear in getNotes again
      const notes = await dataService.getNotes()
      expect(notes.some(n => n.id === 'note-restore-1')).toBe(true)
    })

    it('should not restore a note beyond 30-day retention', async () => {
      const note: Note = {
        id: 'note-restore-2',
        title: 'Old Deleted Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      await dataService.deleteNote('note-restore-2')

      // Manually set deletedAt to 31 days ago
      const oldNote = await dataService.getNote('note-restore-2')
      if (oldNote) {
        const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
        oldNote.deletedAt = thirtyOneDaysAgo.toISOString()
        // Direct localStorage manipulation for testing
        const notes = JSON.parse(
          localStorage.getItem('paperlyte_notes') || '[]'
        )
        const index = notes.findIndex((n: Note) => n.id === 'note-restore-2')
        if (index >= 0) {
          notes[index] = oldNote
          localStorage.setItem('paperlyte_notes', JSON.stringify(notes))
        }
      }

      const restored = await dataService.restoreNote('note-restore-2')
      expect(restored).toBe(false)
    })
  })

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 25 test notes
      for (let i = 1; i <= 25; i++) {
        const note: Note = {
          id: `note-page-${i}`,
          title: `Note ${i}`,
          content: `Content ${i}`,
          tags: [],
          createdAt: new Date(Date.now() - (25 - i) * 1000).toISOString(), // Staggered timestamps
          updatedAt: new Date(Date.now() - (25 - i) * 1000).toISOString(),
        }
        await dataService.saveNote(note)
      }
    })

    it('should return paginated results with correct metadata', async () => {
      const result = await dataService.getNotesWithPagination({
        page: 1,
        limit: 10,
      })

      expect(result.data).toHaveLength(10)
      expect(result.total).toBe(25)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.totalPages).toBe(3)
      expect(result.hasMore).toBe(true)
    })

    it('should return second page correctly', async () => {
      const result = await dataService.getNotesWithPagination({
        page: 2,
        limit: 10,
      })

      expect(result.data).toHaveLength(10)
      expect(result.page).toBe(2)
      expect(result.hasMore).toBe(true)
    })

    it('should return last page with remaining items', async () => {
      const result = await dataService.getNotesWithPagination({
        page: 3,
        limit: 10,
      })

      expect(result.data).toHaveLength(5)
      expect(result.page).toBe(3)
      expect(result.hasMore).toBe(false)
    })

    it('should sort by title ascending', async () => {
      const result = await dataService.getNotesWithPagination({
        page: 1,
        limit: 5,
        sortBy: 'title',
        sortOrder: 'asc',
      })

      expect(result.data[0].title).toBe('Note 1')
      expect(result.data[1].title).toBe('Note 10')
    })

    it('should exclude deleted notes by default', async () => {
      // Delete some notes
      await dataService.deleteNote('note-page-1')
      await dataService.deleteNote('note-page-2')

      const result = await dataService.getNotesWithPagination({
        page: 1,
        limit: 10,
      })

      expect(result.total).toBe(23)
      expect(result.data.every(n => !n.deletedAt)).toBe(true)
    })

    it('should include deleted notes when requested', async () => {
      await dataService.deleteNote('note-page-1')
      await dataService.deleteNote('note-page-2')

      const result = await dataService.getNotesWithPagination({
        page: 1,
        limit: 10,
        includeDeleted: true,
      })

      expect(result.total).toBe(25)
    })
  })

  describe('Get Single Note', () => {
    it('should retrieve a specific note by ID', async () => {
      const note: Note = {
        id: 'specific-note-1',
        title: 'Specific Note',
        content: 'Specific content',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      const retrieved = await dataService.getNote('specific-note-1')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe('specific-note-1')
      expect(retrieved?.title).toBe('Specific Note')
      expect(retrieved?.tags).toEqual(['test'])
    })

    it('should return null for non-existent note', async () => {
      const retrieved = await dataService.getNote('non-existent')
      expect(retrieved).toBeNull()
    })
  })

  describe('Cleanup Deleted Notes', () => {
    it('should permanently delete notes older than 30 days', async () => {
      const note: Note = {
        id: 'old-deleted-note',
        title: 'Old Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      await dataService.deleteNote('old-deleted-note')

      // Manually set deletedAt to 31 days ago
      const notes = JSON.parse(localStorage.getItem('paperlyte_notes') || '[]')
      const index = notes.findIndex((n: Note) => n.id === 'old-deleted-note')
      if (index >= 0) {
        const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
        notes[index].deletedAt = thirtyOneDaysAgo.toISOString()
        localStorage.setItem('paperlyte_notes', JSON.stringify(notes))
      }

      const cleanedCount = await dataService.cleanupDeletedNotes()
      expect(cleanedCount).toBe(1)

      // Note should be completely gone
      const deletedNote = await dataService.getNote('old-deleted-note')
      expect(deletedNote).toBeNull()
    })

    it('should not delete notes within 30-day retention', async () => {
      const note: Note = {
        id: 'recent-deleted-note',
        title: 'Recent Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await dataService.saveNote(note)
      await dataService.deleteNote('recent-deleted-note')

      const cleanedCount = await dataService.cleanupDeletedNotes()
      expect(cleanedCount).toBe(0)

      // Note should still exist
      const stillExists = await dataService.getNote('recent-deleted-note')
      expect(stillExists).not.toBeNull()
    })
  })
})
