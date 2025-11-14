import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  migrateToIndexedDB,
  isIndexedDBAvailable,
  resetMigrationStatus,
} from '../dataMigration'
import { indexedDB, STORE_NAMES } from '../indexedDB'
import type { Note, WaitlistEntry } from '../../types'

// Mock indexedDB utility
vi.mock('../indexedDB', () => ({
  indexedDB: {
    init: vi.fn(),
    put: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    delete: vi.fn(),
  },
  STORE_NAMES: {
    NOTES: 'notes',
    WAITLIST: 'waitlist',
    METADATA: 'metadata',
  },
}))

describe('Data Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetMigrationStatus()
  })

  describe('migrateToIndexedDB', () => {
    it('should migrate notes from localStorage to IndexedDB', async () => {
      // Setup test data in localStorage
      const notes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note 1',
          content: 'Content 1',
          tags: ['test'],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'note-2',
          title: 'Test Note 2',
          content: 'Content 2',
          tags: [],
          createdAt: '2025-01-02T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
        },
      ]
      localStorage.setItem('paperlyte_notes', JSON.stringify(notes))

      vi.mocked(indexedDB.init).mockResolvedValue()
      vi.mocked(indexedDB.put).mockResolvedValue('note-1')

      const result = await migrateToIndexedDB()

      expect(result.success).toBe(true)
      expect(result.notesCount).toBe(2)
      expect(result.errors).toBe(0)
      expect(indexedDB.put).toHaveBeenCalledTimes(2)
      expect(indexedDB.put).toHaveBeenCalledWith(STORE_NAMES.NOTES, notes[0])
      expect(indexedDB.put).toHaveBeenCalledWith(STORE_NAMES.NOTES, notes[1])
    })

    it('should migrate waitlist entries from localStorage to IndexedDB', async () => {
      const entries: WaitlistEntry[] = [
        {
          id: 'entry-1',
          email: 'test1@example.com',
          name: 'Test User 1',
          interest: 'personal',
          referralSource: 'search',
          joinedAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'entry-2',
          email: 'test2@example.com',
          name: 'Test User 2',
          interest: 'business',
          referralSource: 'social',
          joinedAt: '2025-01-02T00:00:00.000Z',
        },
      ]
      localStorage.setItem('paperlyte_waitlist', JSON.stringify(entries))

      vi.mocked(indexedDB.init).mockResolvedValue()
      vi.mocked(indexedDB.put).mockResolvedValue('entry-1')

      const result = await migrateToIndexedDB()

      expect(result.success).toBe(true)
      expect(result.waitlistCount).toBe(2)
      expect(indexedDB.put).toHaveBeenCalledWith(
        STORE_NAMES.WAITLIST,
        entries[0]
      )
      expect(indexedDB.put).toHaveBeenCalledWith(
        STORE_NAMES.WAITLIST,
        entries[1]
      )
    })

    it('should migrate sync metadata', async () => {
      const syncMetadata = { lastSync: '2025-01-01T00:00:00.000Z' }
      const syncConflicts = [{ id: 'conflict-1', type: 'edit' }]
      const cloudNotes = ['note-1', 'note-2']

      localStorage.setItem(
        'paperlyte_sync_metadata',
        JSON.stringify(syncMetadata)
      )
      localStorage.setItem(
        'paperlyte_sync_conflicts',
        JSON.stringify(syncConflicts)
      )
      localStorage.setItem(
        'paperlyte_sync_cloud_notes',
        JSON.stringify(cloudNotes)
      )

      vi.mocked(indexedDB.init).mockResolvedValue()
      vi.mocked(indexedDB.put).mockResolvedValue('key')

      await migrateToIndexedDB()

      expect(indexedDB.put).toHaveBeenCalledWith(STORE_NAMES.METADATA, {
        key: 'sync_metadata',
        value: syncMetadata,
      })
      expect(indexedDB.put).toHaveBeenCalledWith(STORE_NAMES.METADATA, {
        key: 'sync_conflicts',
        value: syncConflicts,
      })
      expect(indexedDB.put).toHaveBeenCalledWith(STORE_NAMES.METADATA, {
        key: 'cloud_notes',
        value: cloudNotes,
      })
    })

    it('should handle empty localStorage gracefully', async () => {
      vi.mocked(indexedDB.init).mockResolvedValue()

      const result = await migrateToIndexedDB()

      expect(result.success).toBe(true)
      expect(result.notesCount).toBe(0)
      expect(result.waitlistCount).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should track errors during migration', async () => {
      const notes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note 1',
          content: 'Content 1',
          tags: [],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'note-2',
          title: 'Test Note 2',
          content: 'Content 2',
          tags: [],
          createdAt: '2025-01-02T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
        },
      ]
      localStorage.setItem('paperlyte_notes', JSON.stringify(notes))

      vi.mocked(indexedDB.init).mockResolvedValue()
      vi.mocked(indexedDB.put)
        .mockResolvedValueOnce('note-1')
        .mockRejectedValueOnce(new Error('IndexedDB error'))

      const result = await migrateToIndexedDB()

      expect(result.success).toBe(false)
      expect(result.notesCount).toBe(1)
      expect(result.errors).toBe(1)
    })

    it('should skip migration if already completed', async () => {
      // Set migration as completed
      localStorage.setItem(
        'paperlyte_migration_status',
        JSON.stringify({
          completed: true,
          version: '1.0',
          timestamp: '2025-01-01T00:00:00.000Z',
        })
      )

      // Add data to localStorage
      const notes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Content',
          tags: [],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ]
      localStorage.setItem('paperlyte_notes', JSON.stringify(notes))

      const result = await migrateToIndexedDB()

      expect(result.success).toBe(true)
      expect(result.notesCount).toBe(0) // No migration performed
      expect(indexedDB.init).not.toHaveBeenCalled()
      expect(indexedDB.put).not.toHaveBeenCalled()
    })

    it('should handle IndexedDB initialization failure', async () => {
      vi.mocked(indexedDB.init).mockRejectedValue(
        new Error('IndexedDB not available')
      )

      const result = await migrateToIndexedDB()

      expect(result.success).toBe(false)
      expect(result.errors).toBe(1)
    })

    it('should handle corrupted localStorage data', async () => {
      // Set corrupted JSON data
      localStorage.setItem('paperlyte_notes', 'invalid json')

      vi.mocked(indexedDB.init).mockResolvedValue()

      const result = await migrateToIndexedDB()

      // Should complete without crashing, with 0 notes migrated
      expect(result.success).toBe(true)
      expect(result.notesCount).toBe(0)
    })

    it('should save migration status after successful migration', async () => {
      const notes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Content',
          tags: [],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ]
      localStorage.setItem('paperlyte_notes', JSON.stringify(notes))

      vi.mocked(indexedDB.init).mockResolvedValue()
      vi.mocked(indexedDB.put).mockResolvedValue('note-1')

      await migrateToIndexedDB()

      const status = localStorage.getItem('paperlyte_migration_status')
      expect(status).toBeTruthy()

      const parsedStatus = JSON.parse(status!)
      expect(parsedStatus.completed).toBe(true)
      expect(parsedStatus.version).toBe('1.0')
      expect(parsedStatus.timestamp).toBeTruthy()
    })

    it('should save error status after failed migration', async () => {
      vi.mocked(indexedDB.init).mockRejectedValue(new Error('IndexedDB error'))

      await migrateToIndexedDB()

      const status = localStorage.getItem('paperlyte_migration_status')
      expect(status).toBeTruthy()

      const parsedStatus = JSON.parse(status!)
      expect(parsedStatus.completed).toBe(false)
      expect(parsedStatus.error).toBe('IndexedDB error')
    })
  })

  describe('isIndexedDBAvailable', () => {
    it('should return true when IndexedDB is available', () => {
      expect(isIndexedDBAvailable()).toBe(true)
    })

    it('should return false when IndexedDB is not available', () => {
      const originalIndexedDB = global.indexedDB
      // @ts-expect-error - Testing undefined scenario
      global.indexedDB = undefined

      expect(isIndexedDBAvailable()).toBe(false)

      // Restore
      global.indexedDB = originalIndexedDB
    })
  })

  describe('resetMigrationStatus', () => {
    it('should remove migration status from localStorage', () => {
      localStorage.setItem(
        'paperlyte_migration_status',
        JSON.stringify({ completed: true })
      )

      resetMigrationStatus()

      expect(localStorage.getItem('paperlyte_migration_status')).toBeNull()
    })

    it('should handle errors gracefully', () => {
      // Mock localStorage.removeItem to throw
      const originalRemoveItem = Storage.prototype.removeItem
      Storage.prototype.removeItem = vi.fn(() => {
        throw new Error('Storage error')
      })

      // Should not throw
      expect(() => resetMigrationStatus()).not.toThrow()

      // Restore
      Storage.prototype.removeItem = originalRemoveItem
    })
  })
})
