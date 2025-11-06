import type {
  Note,
  PaginatedResult,
  PaginationOptions,
  WaitlistEntry,
} from '../types'
import {
  getErrorMessage,
  isPaperlyteError,
  StorageQuotaError,
  StorageUnavailableError,
  ValidationError,
} from '../types/errors'
import {
  isIndexedDBAvailable,
  migrateToIndexedDB,
} from '../utils/dataMigration'
import { indexedDB, STORE_NAMES } from '../utils/indexedDB'
import { monitoring } from '../utils/monitoring'
import {
  calculateWordCount,
  sanitizeContent,
  sanitizeTitle,
  validateNote,
} from '../utils/noteUtils'
import { retryOnTransientError } from '../utils/retry'

/**
 * Data Service - Abstraction layer for data persistence
 *
 * CURRENT IMPLEMENTATION: IndexedDB (offline-first)
 * FUTURE MIGRATION: Will be replaced with API calls in Q4 2025
 *
 * This abstraction layer ensures easy migration from IndexedDB to API
 * without changing component code.
 *
 * Features:
 * - IndexedDB for large data storage
 * - Automatic localStorage migration
 * - Offline-first behavior
 * - Fallback to localStorage if IndexedDB unavailable
 */

class DataService {
  private storagePrefix = 'paperlyte_'
  private useIndexedDB: boolean = false
  private migrationCompleted: boolean = false

  /**
   * Initialize the data service and run migration if needed
   */
  async initialize(): Promise<void> {
    try {
      // Check if IndexedDB is available
      this.useIndexedDB = isIndexedDBAvailable()

      if (!this.useIndexedDB) {
        monitoring.addBreadcrumb(
          'IndexedDB not available, using localStorage fallback',
          'warning'
        )
        return
      }

      // Initialize IndexedDB with retry on transient errors
      await retryOnTransientError(
        async () => {
          await indexedDB.init()
        },
        {
          maxAttempts: 3,
          initialDelay: 100,
          onRetry: (error, attempt) => {
            monitoring.addBreadcrumb(
              'Retrying IndexedDB initialization',
              'info',
              {
                attempt,
                error: getErrorMessage(error),
              }
            )
          },
        }
      )

      // Run migration from localStorage if not already done
      if (!this.migrationCompleted) {
        const result = await migrateToIndexedDB()
        this.migrationCompleted = result.success

        if (result.notesCount > 0 || result.waitlistCount > 0) {
          monitoring.addBreadcrumb('Data migrated to IndexedDB', 'info', {
            notesCount: result.notesCount,
            waitlistCount: result.waitlistCount,
            errors: result.errors,
          })
        }
      }
    } catch (error) {
      // Check if it's a storage unavailable error
      if (
        error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.message.includes('quota'))
      ) {
        throw new StorageQuotaError(
          'Storage quota exceeded during initialization',
          {
            originalError: getErrorMessage(error),
          }
        )
      }

      // Log the error and fall back to localStorage
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'initialize',
      })

      this.useIndexedDB = false

      throw new StorageUnavailableError('Failed to initialize storage', {
        originalError: getErrorMessage(error),
        fallbackUsed: true,
      })
    }
  }

  /**
   * Generic storage operations (localStorage fallback)
   */
  private getFromStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(`${this.storagePrefix}${key}`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_from_storage',
        additionalData: { key },
      })
      return []
    }
  }

  private saveToStorage<T>(key: string, data: T[]): boolean {
    try {
      localStorage.setItem(`${this.storagePrefix}${key}`, JSON.stringify(data))
      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'save_to_storage',
        additionalData: { key, dataLength: data.length },
      })
      return false
    }
  }

  /**
   * Notes operations
   *
   * TODO: Replace with API calls in Q4 2025:
   * - GET /api/notes
   * - POST /api/notes
   * - PUT /api/notes/:id
   * - DELETE /api/notes/:id
   */

  /**
   * Get all notes (legacy method - maintained for backward compatibility)
   * For pagination support, use getNotesWithPagination
   */
  async getNotes(): Promise<Note[]> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const notes = await indexedDB.getAll<Note>(STORE_NAMES.NOTES)
        // Filter out deleted notes by default
        const activeNotes = notes.filter(note => !note.deletedAt)
        // Sort by updatedAt descending (newest first)
        return activeNotes.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      } else {
        // Fallback to localStorage
        const notes = this.getFromStorage<Note>('notes')
        return notes.filter(note => !note.deletedAt)
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_notes',
      })
      // Fallback to localStorage on error
      return this.getFromStorage<Note>('notes').filter(note => !note.deletedAt)
    }
  }

  /**
   * Get notes with pagination support
   *
   * @param options - Pagination and filtering options
   * @returns Paginated result with notes and metadata
   */
  async getNotesWithPagination(
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Note>> {
    await this.initialize()

    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      includeDeleted = false,
    } = options

    try {
      let allNotes: Note[]

      if (this.useIndexedDB) {
        allNotes = await indexedDB.getAll<Note>(STORE_NAMES.NOTES)
      } else {
        allNotes = this.getFromStorage<Note>('notes')
      }

      // Filter deleted notes if needed
      const filteredNotes = includeDeleted
        ? allNotes
        : allNotes.filter(note => !note.deletedAt)

      // Sort notes
      filteredNotes.sort((a, b) => {
        let aValue: string | number
        let bValue: string | number

        if (sortBy === 'title') {
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
        } else {
          // For dates (createdAt, updatedAt)
          aValue = new Date(a[sortBy]).getTime()
          bValue = new Date(b[sortBy]).getTime()
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })

      // Calculate pagination
      const total = filteredNotes.length
      const totalPages = Math.ceil(total / limit)
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedNotes = filteredNotes.slice(startIndex, endIndex)

      return {
        data: paginatedNotes,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_notes_with_pagination',
        additionalData: { page, limit },
      })

      // Return empty result on error
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasMore: false,
      }
    }
  }

  /**
   * Get a single note by ID
   *
   * @param noteId - The ID of the note to retrieve
   * @returns The note if found, null otherwise
   */
  async getNote(noteId: string): Promise<Note | null> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const note = await indexedDB.get<Note>(STORE_NAMES.NOTES, noteId)
        return note || null
      } else {
        const notes = this.getFromStorage<Note>('notes')
        return notes.find(note => note.id === noteId) || null
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_note',
        additionalData: { noteId },
      })
      return null
    }
  }

  /**
   * Save or update a note with validation, sanitization, and metadata tracking
   * Implements optimistic updates with automatic rollback on failure
   *
   * @param note - The note to save
   * @returns Promise<boolean> - true if saved successfully
   * @throws ValidationError if note data is invalid
   * @throws StorageQuotaError if storage limit is exceeded
   */
  async saveNote(note: Note): Promise<boolean> {
    await this.initialize()

    // Validate note data
    const validationError = validateNote({
      title: note.title,
      content: note.content,
    })

    if (validationError) {
      const error = new ValidationError(validationError, 'note', {
        noteId: note.id,
      })
      monitoring.logError(error, {
        feature: 'data_service',
        action: 'save_note_validation',
        additionalData: { noteId: note.id },
      })
      throw error
    }

    // Sanitize input
    const sanitizedNote: Note = {
      ...note,
      title: sanitizeTitle(note.title),
      content: sanitizeContent(note.content || ''),
      wordCount: calculateWordCount(note.content || ''),
      updatedAt: new Date().toISOString(),
    }

    // Check if this is an update or create
    let isUpdate = false
    try {
      const existingNote = await this.getNote(note.id)
      if (existingNote) {
        isUpdate = true
        // Increment version for updates
        sanitizedNote.version = (existingNote.version || 1) + 1
      } else {
        // Initialize version for new notes
        sanitizedNote.version = 1
        sanitizedNote.createdAt =
          sanitizedNote.createdAt || new Date().toISOString()
      }
    } catch (error) {
      // If we can't determine, assume new note
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'save_note_version_check',
        additionalData: { noteId: note.id },
      })
      sanitizedNote.version = 1
      sanitizedNote.createdAt =
        sanitizedNote.createdAt || new Date().toISOString()
    }

    try {
      // Use retry logic for IndexedDB operations
      if (this.useIndexedDB) {
        await retryOnTransientError(
          async () => {
            await indexedDB.put(STORE_NAMES.NOTES, sanitizedNote)
          },
          {
            maxAttempts: 2,
            initialDelay: 50,
          }
        )

        monitoring.addBreadcrumb(
          isUpdate ? 'Note updated in IndexedDB' : 'Note created in IndexedDB',
          'info',
          {
            noteId: sanitizedNote.id,
            version: sanitizedNote.version,
            wordCount: sanitizedNote.wordCount,
          }
        )
        return true
      } else {
        // Fallback to localStorage
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === sanitizedNote.id)

        if (existingIndex >= 0) {
          notes[existingIndex] = sanitizedNote
        } else {
          notes.unshift(sanitizedNote) // Add new notes to the beginning
        }

        return this.saveToStorage('notes', notes)
      }
    } catch (error) {
      // Check for quota errors
      if (
        error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.message.includes('quota'))
      ) {
        const quotaError = new StorageQuotaError(
          'Storage quota exceeded while saving note',
          {
            noteId: sanitizedNote.id,
            wordCount: sanitizedNote.wordCount,
          }
        )
        monitoring.logError(quotaError, {
          feature: 'data_service',
          action: 'save_note',
        })
        throw quotaError
      }

      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'save_note',
        additionalData: { noteId: sanitizedNote.id },
      })

      // Try localStorage fallback
      try {
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === sanitizedNote.id)

        if (existingIndex >= 0) {
          notes[existingIndex] = sanitizedNote
        } else {
          notes.unshift(sanitizedNote)
        }

        const success = this.saveToStorage('notes', notes)
        if (!success) {
          throw new StorageUnavailableError(
            'Failed to save note to localStorage fallback',
            {
              noteId: sanitizedNote.id,
            }
          )
        }
        return success
      } catch (fallbackError) {
        // If fallback also fails, throw the error
        if (isPaperlyteError(fallbackError)) {
          throw fallbackError
        }
        throw new StorageUnavailableError('All storage methods failed', {
          noteId: sanitizedNote.id,
          originalError: getErrorMessage(error),
          fallbackError: getErrorMessage(fallbackError),
        })
      }
    }
  }

  /**
   * Soft delete a note (marks as deleted but retains for 30 days)
   *
   * @param noteId - The ID of the note to delete
   * @returns Promise<boolean> - true if deleted successfully
   */
  async deleteNote(noteId: string): Promise<boolean> {
    await this.initialize()

    try {
      // Get the note first
      const note = await this.getNote(noteId)
      if (!note) {
        monitoring.addBreadcrumb('Note not found for deletion', 'warning', {
          noteId,
        })
        return false
      }

      // Mark as deleted with timestamp (soft delete)
      const deletedNote: Note = {
        ...note,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (this.useIndexedDB) {
        await indexedDB.put(STORE_NAMES.NOTES, deletedNote)
        monitoring.addBreadcrumb('Note soft-deleted in IndexedDB', 'info', {
          noteId,
          deletedAt: deletedNote.deletedAt,
        })
        return true
      } else {
        // Fallback to localStorage
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === noteId)

        if (existingIndex >= 0) {
          notes[existingIndex] = deletedNote
          return this.saveToStorage('notes', notes)
        }
        return false
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'delete_note',
        additionalData: { noteId },
      })

      // Try localStorage fallback
      try {
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === noteId)

        if (existingIndex >= 0) {
          notes[existingIndex] = {
            ...notes[existingIndex],
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          return this.saveToStorage('notes', notes)
        }
        return false
      } catch {
        return false
      }
    }
  }

  /**
   * Restore a soft-deleted note (within 30-day retention period)
   *
   * @param noteId - The ID of the note to restore
   * @returns Promise<boolean> - true if restored successfully
   */
  async restoreNote(noteId: string): Promise<boolean> {
    await this.initialize()

    try {
      // Get the note (including deleted ones)
      const note = await this.getNote(noteId)
      if (!note) {
        monitoring.addBreadcrumb('Note not found for restoration', 'warning', {
          noteId,
        })
        return false
      }

      if (!note.deletedAt) {
        monitoring.addBreadcrumb(
          'Note is not deleted, cannot restore',
          'warning',
          {
            noteId,
          }
        )
        return false
      }

      // Check if within 30-day retention period
      const deletedDate = new Date(note.deletedAt)
      const daysSinceDeleted =
        (Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceDeleted > 30) {
        monitoring.addBreadcrumb(
          'Note is beyond 30-day retention period',
          'warning',
          {
            noteId,
            daysSinceDeleted: Math.floor(daysSinceDeleted),
          }
        )
        return false
      }

      // Restore the note by removing deletedAt timestamp
      const restoredNote: Note = {
        ...note,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      }

      if (this.useIndexedDB) {
        await indexedDB.put(STORE_NAMES.NOTES, restoredNote)
        monitoring.addBreadcrumb('Note restored in IndexedDB', 'info', {
          noteId,
        })
        return true
      } else {
        // Fallback to localStorage
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === noteId)

        if (existingIndex >= 0) {
          notes[existingIndex] = restoredNote
          return this.saveToStorage('notes', notes)
        }
        return false
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'restore_note',
        additionalData: { noteId },
      })
      return false
    }
  }

  /**
   * Permanently delete notes that have been soft-deleted for more than 30 days
   * Should be called periodically (e.g., daily) to clean up old deleted notes
   *
   * @returns Promise<number> - number of notes permanently deleted
   */
  async cleanupDeletedNotes(): Promise<number> {
    await this.initialize()

    try {
      let allNotes: Note[]

      if (this.useIndexedDB) {
        allNotes = await indexedDB.getAll<Note>(STORE_NAMES.NOTES)
      } else {
        allNotes = this.getFromStorage<Note>('notes')
      }

      // Find notes deleted more than 30 days ago
      const now = Date.now()
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

      const notesToDelete = allNotes.filter(note => {
        if (!note.deletedAt) return false
        const deletedTime = new Date(note.deletedAt).getTime()
        return deletedTime < thirtyDaysAgo
      })

      if (notesToDelete.length === 0) {
        return 0
      }

      // Permanently delete these notes
      if (this.useIndexedDB) {
        for (const note of notesToDelete) {
          await indexedDB.delete(STORE_NAMES.NOTES, note.id)
        }
      } else {
        const remainingNotes = allNotes.filter(
          note => !notesToDelete.some(n => n.id === note.id)
        )
        this.saveToStorage('notes', remainingNotes)
      }

      monitoring.addBreadcrumb('Cleaned up old deleted notes', 'info', {
        count: notesToDelete.length,
      })

      return notesToDelete.length
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'cleanup_deleted_notes',
      })
      return 0
    }
  }

  /**
   * Waitlist operations
   *
   * TODO: Replace with API calls in Q4 2025:
   * - POST /api/waitlist
   * - GET /api/waitlist (admin only)
   */
  async addToWaitlist(
    entry: Omit<WaitlistEntry, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize()

    try {
      // Check for duplicate email
      if (this.useIndexedDB) {
        const existingEntries = await indexedDB.getAll<WaitlistEntry>(
          STORE_NAMES.WAITLIST
        )

        if (existingEntries.some(e => e.email === entry.email)) {
          return {
            success: false,
            error: "You're already on the waitlist!",
          }
        }

        const newEntry: WaitlistEntry = {
          id: crypto.randomUUID(),
          ...entry,
          createdAt: new Date().toISOString(),
        }

        await indexedDB.put(STORE_NAMES.WAITLIST, newEntry)
        monitoring.addBreadcrumb('Waitlist entry added to IndexedDB', 'info')
        return { success: true }
      } else {
        // Fallback to localStorage
        const existingEntries = this.getFromStorage<WaitlistEntry>('waitlist')

        if (existingEntries.some(e => e.email === entry.email)) {
          return {
            success: false,
            error: "You're already on the waitlist!",
          }
        }

        const newEntry: WaitlistEntry = {
          id: crypto.randomUUID(),
          ...entry,
          createdAt: new Date().toISOString(),
        }

        existingEntries.push(newEntry)
        const success = this.saveToStorage('waitlist', existingEntries)

        if (success) {
          return { success: true }
        } else {
          return { success: false, error: 'Failed to save to waitlist' }
        }
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'add_to_waitlist',
      })
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const entries = await indexedDB.getAll<WaitlistEntry>(
          STORE_NAMES.WAITLIST
        )
        // Sort by createdAt descending (newest first)
        return entries.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else {
        // Fallback to localStorage
        return this.getFromStorage<WaitlistEntry>('waitlist')
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_waitlist_entries',
      })
      // Fallback to localStorage on error
      return this.getFromStorage<WaitlistEntry>('waitlist')
    }
  }

  /**
   * Data export for admin dashboard
   */
  async exportData(): Promise<{ notes: Note[]; waitlist: WaitlistEntry[] }> {
    const [notes, waitlist] = await Promise.all([
      this.getNotes(),
      this.getWaitlistEntries(),
    ])

    return { notes, waitlist }
  }

  /**
   * Clear all data (for testing/development)
   */
  async clearAllData(): Promise<boolean> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        await indexedDB.clear(STORE_NAMES.NOTES)
        await indexedDB.clear(STORE_NAMES.WAITLIST)
        monitoring.addBreadcrumb('All data cleared from IndexedDB', 'info')
      } else {
        // Fallback to localStorage
        localStorage.removeItem(`${this.storagePrefix}notes`)
        localStorage.removeItem(`${this.storagePrefix}waitlist`)
      }
      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'clear_all_data',
      })
      return false
    }
  }

  /**
   * Check data storage health
   */
  async getStorageInfo(): Promise<{
    notesCount: number
    waitlistCount: number
    storageUsed: number
    storageQuota: number
  }> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const [notesCount, waitlistCount, storageEstimate] = await Promise.all([
          indexedDB.count(STORE_NAMES.NOTES),
          indexedDB.count(STORE_NAMES.WAITLIST),
          indexedDB.getStorageEstimate(),
        ])

        return {
          notesCount,
          waitlistCount,
          storageUsed: storageEstimate.usage,
          storageQuota: storageEstimate.quota,
        }
      } else {
        // Fallback to localStorage
        const notes = this.getFromStorage<Note>('notes')
        const waitlist = this.getFromStorage<WaitlistEntry>('waitlist')

        // Estimate storage usage
        const notesData =
          localStorage.getItem(`${this.storagePrefix}notes`) || ''
        const waitlistData =
          localStorage.getItem(`${this.storagePrefix}waitlist`) || ''
        const storageUsed = new Blob([notesData + waitlistData]).size

        // Typical localStorage quota is 5-10MB
        const storageQuota = 5 * 1024 * 1024

        return {
          notesCount: notes.length,
          waitlistCount: waitlist.length,
          storageUsed,
          storageQuota,
        }
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_storage_info',
      })

      // Return fallback values on error
      return {
        notesCount: 0,
        waitlistCount: 0,
        storageUsed: 0,
        storageQuota: 0,
      }
    }
  }

  /**
   * Remove item from localStorage
   * Provides abstraction layer for localStorage removal operations
   * Automatically handles the storage prefix for Paperlyte keys
   *
   * @param key - The localStorage key to remove (without prefix)
   * @returns Promise<boolean> - true if successful, false on any failure (never throws)
   */
  async removeItem(key: string): Promise<boolean> {
    await this.initialize()

    try {
      if (typeof localStorage === 'undefined') {
        monitoring.addBreadcrumb(
          'LocalStorage unavailable in removeItem',
          'warning',
          {
            key,
          }
        )
        return false
      }

      const fullKey = `${this.storagePrefix}${key}`
      localStorage.removeItem(fullKey)

      monitoring.addBreadcrumb('LocalStorage item removed', 'info', {
        key: fullKey,
      })

      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'remove_item',
        additionalData: { key },
      })
      return false
    }
  }

  /**
   * Remove item from session storage
   * Provides abstraction layer for session storage operations
   *
   * @param key - The session storage key to remove
   * @returns Promise<boolean> - true if successful, false otherwise
   */
  async removeSessionItem(key: string): Promise<boolean> {
    try {
      if (typeof sessionStorage === 'undefined') {
        throw new StorageUnavailableError('SessionStorage is not available')
      }

      sessionStorage.removeItem(key)

      monitoring.addBreadcrumb('Session item removed', 'info', {
        key,
      })

      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'remove_session_item',
        additionalData: { key },
      })
      return false
    }
  }
}

// Export singleton instance
export const dataService = new DataService()

// Export for backward compatibility and testing
export default dataService
