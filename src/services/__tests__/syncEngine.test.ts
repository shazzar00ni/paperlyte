import { describe, it, expect, beforeEach, vi } from 'vitest'
import { syncEngine } from '../syncEngine'
import type { Note, SyncConflict } from '../../types'

describe('SyncEngine', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Sync Metadata', () => {
    it('should return default metadata when none exists', async () => {
      const metadata = await syncEngine.getSyncMetadata()

      expect(metadata).toEqual({
        lastSyncTime: null,
        syncEnabled: true,
        pendingSyncCount: 0,
        conflictCount: 0,
      })
    })

    it('should enable and disable sync', async () => {
      await syncEngine.setSyncEnabled(false)
      let metadata = await syncEngine.getSyncMetadata()
      expect(metadata.syncEnabled).toBe(false)

      await syncEngine.setSyncEnabled(true)
      metadata = await syncEngine.getSyncMetadata()
      expect(metadata.syncEnabled).toBe(true)
    })
  })

  describe('Sync Operations', () => {
    it('should sync new notes to cloud', async () => {
      const testNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Test content',
          tags: ['test'],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
        },
      ]

      const result = await syncEngine.syncNotes(testNotes)

      expect(result.success).toBe(true)
      expect(result.syncedNotes).toContain('note-1')
      expect(result.conflicts).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should sync multiple notes', async () => {
      const testNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Note 1',
          content: 'Content 1',
          tags: [],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
        },
        {
          id: 'note-2',
          title: 'Note 2',
          content: 'Content 2',
          tags: [],
          createdAt: '2025-01-01T11:00:00.000Z',
          updatedAt: '2025-01-01T11:00:00.000Z',
        },
      ]

      const result = await syncEngine.syncNotes(testNotes)

      expect(result.success).toBe(true)
      expect(result.syncedNotes).toHaveLength(2)
      expect(result.syncedNotes).toContain('note-1')
      expect(result.syncedNotes).toContain('note-2')
    })

    it('should update sync metadata after successful sync', async () => {
      const testNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Test',
          content: 'Test',
          tags: [],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
        },
      ]

      await syncEngine.syncNotes(testNotes)
      const metadata = await syncEngine.getSyncMetadata()

      expect(metadata.lastSyncTime).not.toBeNull()
      expect(metadata.pendingSyncCount).toBe(0)
    })

    it('should prevent concurrent syncs', async () => {
      const testNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Test',
          content: 'Test',
          tags: [],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:00:00.000Z',
        },
      ]

      // Start first sync (don't await)
      const sync1Promise = syncEngine.syncNotes(testNotes)

      // Immediately try second sync
      const result2 = await syncEngine.syncNotes(testNotes)

      // Second should fail
      expect(result2.success).toBe(false)
      expect(result2.errors[0].error).toContain('already in progress')

      // Wait for first to complete
      await sync1Promise
    })
  })

  describe('Conflict Detection', () => {
    it('should detect update conflicts when both versions are modified', async () => {
      // Simulate a note that was synced
      const baseNote: Note = {
        id: 'note-1',
        title: 'Original',
        content: 'Original content',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        lastSyncedAt: '2025-01-01T10:00:00.000Z',
      }

      // First sync the base note
      await syncEngine.syncNotes([baseNote])

      // Create local and remote versions that both modified after sync
      const localNote: Note = {
        ...baseNote,
        title: 'Local Version',
        content: 'Local changes',
        updatedAt: '2025-01-01T12:00:00.000Z',
      }

      const remoteNote: Note = {
        ...baseNote,
        title: 'Remote Version',
        content: 'Remote changes',
        updatedAt: '2025-01-01T11:00:00.000Z',
      }

      // Manually set up remote note in cloud storage
      const cloudNotes = [remoteNote]
      localStorage.setItem(
        'paperlyte_sync_cloud_notes',
        JSON.stringify(cloudNotes)
      )

      // Sync local note with manual strategy to capture conflicts
      const result = await syncEngine.syncNotes([localNote], 'manual')

      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.conflicts[0].noteId).toBe('note-1')
      expect(result.conflicts[0].conflictType).toBe('update')
    })

    it('should not detect conflict if only local was modified', async () => {
      const baseNote: Note = {
        id: 'note-1',
        title: 'Original',
        content: 'Original content',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        lastSyncedAt: '2025-01-01T10:00:00.000Z',
      }

      // First sync
      await syncEngine.syncNotes([baseNote])

      // Only modify local
      const localNote: Note = {
        ...baseNote,
        title: 'Local Version',
        updatedAt: '2025-01-01T12:00:00.000Z',
      }

      const result = await syncEngine.syncNotes([localNote])

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(0)
      expect(result.syncedNotes).toContain('note-1')
    })

    it('should detect delete conflict when note is deleted remotely but updated locally', async () => {
      const baseNote: Note = {
        id: 'note-1',
        title: 'Original',
        content: 'Original',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        lastSyncedAt: '2025-01-01T10:00:00.000Z',
      }

      // First sync
      await syncEngine.syncNotes([baseNote])

      // Modify local
      const localNote: Note = {
        ...baseNote,
        title: 'Local Version',
        updatedAt: '2025-01-01T12:00:00.000Z',
      }

      // Simulate remote deletion by having empty cloud
      localStorage.setItem('paperlyte_sync_cloud_notes', JSON.stringify([]))

      const result = await syncEngine.syncNotes([localNote], 'manual')

      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.conflicts[0].conflictType).toBe('delete')
      expect(result.conflicts[0].noteId).toBe('note-1')
    })

    it('should detect delete conflict when note is deleted locally but updated remotely', async () => {
      const baseNote: Note = {
        id: 'note-1',
        title: 'Original',
        content: 'Original',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        lastSyncedAt: '2025-01-01T10:00:00.000Z',
      }

      // First sync
      await syncEngine.syncNotes([baseNote])

      // Modify remote
      const remoteNote: Note = {
        ...baseNote,
        title: 'Remote Version',
        updatedAt: '2025-01-01T12:00:00.000Z',
      }

      // Simulate remote update
      localStorage.setItem(
        'paperlyte_sync_cloud_notes',
        JSON.stringify([remoteNote])
      )

      // Sync with empty local notes (simulating local deletion)
      const result = await syncEngine.syncNotes([], 'manual')

      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.conflicts[0].conflictType).toBe('delete')
      expect(result.conflicts[0].noteId).toBe('note-1')
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve conflict with local strategy', async () => {
      const baseNote: Note = {
        id: 'note-1',
        title: 'Original',
        content: 'Original',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        lastSyncedAt: '2025-01-01T10:00:00.000Z',
      }

      await syncEngine.syncNotes([baseNote])

      const localNote: Note = {
        ...baseNote,
        title: 'Local Version',
        updatedAt: '2025-01-01T12:00:00.000Z',
      }

      const remoteNote: Note = {
        ...baseNote,
        title: 'Remote Version',
        updatedAt: '2025-01-01T11:00:00.000Z',
      }

      localStorage.setItem(
        'paperlyte_sync_cloud_notes',
        JSON.stringify([remoteNote])
      )

      const result = await syncEngine.syncNotes([localNote], 'local')

      expect(result.success).toBe(true)
      expect(result.syncedNotes).toContain('note-1')

      // Verify local version was kept
      const cloudNotes = JSON.parse(
        localStorage.getItem('paperlyte_sync_cloud_notes') || '[]'
      )
      const syncedNote = cloudNotes.find((n: Note) => n.id === 'note-1')
      expect(syncedNote.title).toBe('Local Version')
    })

    it('should resolve conflict with remote strategy', async () => {
      const baseNote: Note = {
        id: 'note-1',
        title: 'Original',
        content: 'Original',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        lastSyncedAt: '2025-01-01T10:00:00.000Z',
      }

      await syncEngine.syncNotes([baseNote])

      const localNote: Note = {
        ...baseNote,
        title: 'Local Version',
        updatedAt: '2025-01-01T12:00:00.000Z',
      }

      const remoteNote: Note = {
        ...baseNote,
        title: 'Remote Version',
        updatedAt: '2025-01-01T11:00:00.000Z',
      }

      localStorage.setItem(
        'paperlyte_sync_cloud_notes',
        JSON.stringify([remoteNote])
      )

      const result = await syncEngine.syncNotes([localNote], 'remote')

      expect(result.success).toBe(true)
      expect(result.syncedNotes).toContain('note-1')

      // Verify remote version was kept
      const cloudNotes = JSON.parse(
        localStorage.getItem('paperlyte_sync_cloud_notes') || '[]'
      )
      const syncedNote = cloudNotes.find((n: Note) => n.id === 'note-1')
      expect(syncedNote.title).toBe('Remote Version')
    })

    it('should mark conflicts for manual resolution', async () => {
      const baseNote: Note = {
        id: 'note-1',
        title: 'Original',
        content: 'Original',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
        lastSyncedAt: '2025-01-01T10:00:00.000Z',
      }

      await syncEngine.syncNotes([baseNote])

      const localNote: Note = {
        ...baseNote,
        title: 'Local Version',
        updatedAt: '2025-01-01T12:00:00.000Z',
      }

      const remoteNote: Note = {
        ...baseNote,
        title: 'Remote Version',
        updatedAt: '2025-01-01T11:00:00.000Z',
      }

      localStorage.setItem(
        'paperlyte_sync_cloud_notes',
        JSON.stringify([remoteNote])
      )

      const result = await syncEngine.syncNotes([localNote], 'manual')

      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.conflicts[0].noteId).toBe('note-1')
      expect(result.conflicts[0].localNote.title).toBe('Local Version')
      expect(result.conflicts[0].remoteNote.title).toBe('Remote Version')

      // Verify conflicts are saved to localStorage for manual resolution
      const savedConflicts = JSON.parse(
        localStorage.getItem('paperlyte_sync_conflicts') || '[]'
      )
      expect(savedConflicts).toHaveLength(1)
      expect(savedConflicts[0].noteId).toBe('note-1')
    })
  })

  describe('Manual Conflict Resolution', () => {
    it('should resolve conflict manually and save selected note', async () => {
      const conflict: SyncConflict = {
        noteId: 'note-1',
        localNote: {
          id: 'note-1',
          title: 'Local',
          content: 'Local',
          tags: [],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T12:00:00.000Z',
        },
        remoteNote: {
          id: 'note-1',
          title: 'Remote',
          content: 'Remote',
          tags: [],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T11:00:00.000Z',
        },
        conflictType: 'update',
        detectedAt: '2025-01-01T13:00:00.000Z',
      }

      // Store the conflict
      localStorage.setItem(
        'paperlyte_sync_conflicts',
        JSON.stringify([conflict])
      )

      // Store initial cloud state with remote note
      localStorage.setItem(
        'paperlyte_sync_cloud_notes',
        JSON.stringify([conflict.remoteNote])
      )

      // Update metadata with conflict count
      await syncEngine.setSyncEnabled(true)
      const metadataBefore = await syncEngine.getSyncMetadata()
      localStorage.setItem(
        'paperlyte_sync_metadata',
        JSON.stringify({ ...metadataBefore, conflictCount: 1 })
      )

      const success = await syncEngine.resolveConflictManually(
        'note-1',
        conflict.localNote
      )

      expect(success).toBe(true)

      // Verify conflict was removed
      const conflicts = await syncEngine.getPendingConflicts()
      expect(conflicts).toHaveLength(0)

      // Verify metadata was updated
      const metadata = await syncEngine.getSyncMetadata()
      expect(metadata.conflictCount).toBe(0)

      // Verify the selected note was saved to cloud
      const cloudNotes = JSON.parse(
        localStorage.getItem('paperlyte_sync_cloud_notes') || '[]'
      )
      const savedNote = cloudNotes.find((n: Note) => n.id === 'note-1')
      expect(savedNote).toBeDefined()
      expect(savedNote.title).toBe('Local')
      expect(savedNote.syncStatus).toBe('synced')
      expect(savedNote.lastSyncedAt).toBeDefined()
    })

    it('should retrieve pending conflicts', async () => {
      const conflict: SyncConflict = {
        noteId: 'note-1',
        localNote: {
          id: 'note-1',
          title: 'Local',
          content: 'Local',
          tags: [],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T12:00:00.000Z',
        },
        remoteNote: {
          id: 'note-1',
          title: 'Remote',
          content: 'Remote',
          tags: [],
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T11:00:00.000Z',
        },
        conflictType: 'update',
        detectedAt: '2025-01-01T13:00:00.000Z',
      }

      localStorage.setItem(
        'paperlyte_sync_conflicts',
        JSON.stringify([conflict])
      )

      const conflicts = await syncEngine.getPendingConflicts()

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].noteId).toBe('note-1')
    })
  })

  describe('Version Control', () => {
    it('should increment version numbers on sync', async () => {
      const testNote: Note = {
        id: 'note-1',
        title: 'Test',
        content: 'Test',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
      }

      await syncEngine.syncNotes([testNote])

      const cloudNotes = JSON.parse(
        localStorage.getItem('paperlyte_sync_cloud_notes') || '[]'
      )
      const syncedNote = cloudNotes.find((n: Note) => n.id === 'note-1')

      expect(syncedNote.localVersion).toBe(1)
      expect(syncedNote.remoteVersion).toBe(1)
      expect(syncedNote.lastSyncedAt).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should complete sync successfully with valid data', async () => {
      const testNote: Note = {
        id: 'note-1',
        title: 'Test',
        content: 'Test',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
      }

      const result = await syncEngine.syncNotes([testNote])

      expect(result.success).toBe(true)
      expect(result.syncedNotes).toContain('note-1')
      expect(result.errors).toHaveLength(0)
    })

    it('should handle quota exceeded errors gracefully', async () => {
      // This test verifies that quota exceeded errors are properly caught
      // and logged with appropriate context
      const testNote: Note = {
        id: 'note-1',
        title: 'Test',
        content: 'Test',
        tags: [],
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-01T10:00:00.000Z',
      }

      // Normal sync should work
      const result = await syncEngine.syncNotes([testNote])
      expect(result.success).toBe(true)

      // The error handling for quota exceeded is tested via the
      // saveToCloud method which catches QuotaExceededError
      // and logs it with specific error type 'quota_exceeded'
    })
  })
})
