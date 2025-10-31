import type {
  Note,
  WaitlistEntry,
  PaginationOptions,
  PaginatedResult,
} from '../types'
import { monitoring } from '../utils/monitoring'
import { indexedDB, STORE_NAMES } from '../utils/indexedDB'
import {
  migrateToIndexedDB,
  isIndexedDBAvailable,
} from '../utils/dataMigration'
import {
  calculateWordCount,
  sanitizeTitle,
  sanitizeContent,
  validateNote,
} from '../utils/noteUtils'

/**
 * @class DataService
 * @description An abstraction layer for data persistence.
 *
 * @summary
 * This service manages all data operations for the application, including notes and waitlist entries.
 * It is designed with an offline-first approach, prioritizing IndexedDB for robust client-side storage.
 * If IndexedDB is not available, it gracefully falls back to using `localStorage`.
 * The service also includes a migration path from `localStorage` to IndexedDB to ensure data is preserved for existing users.
 * This abstraction is designed to be replaced with API calls in the future without requiring changes to the application's component layer.
 *
 * @property {boolean} useIndexedDB - Flag indicating if IndexedDB is being used.
 * @property {boolean} migrationCompleted - Flag to ensure data migration runs only once.
 */
class DataService {
  private storagePrefix = 'paperlyte_'
  private useIndexedDB: boolean = false
  private migrationCompleted: boolean = false

  /**
   * @method initialize
   * @description Initializes the data service by checking for IndexedDB availability and running data migration if necessary.
   * This method should be called before any other data operations are performed.
   * @returns {Promise<void>}
   */
  async initialize(): Promise<void> {
    try {
      this.useIndexedDB = isIndexedDBAvailable()

      if (this.useIndexedDB) {
        await indexedDB.init()

        // If migration has not been completed in this session, run it.
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
      } else {
        monitoring.addBreadcrumb(
          'IndexedDB not available, using localStorage fallback',
          'warning'
        )
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'initialize',
      })
      this.useIndexedDB = false // Ensure fallback on error.
    }
  }

  /**
   * @private
   * @method getFromStorage
   * @description A generic helper to retrieve data from `localStorage`.
   * @param {string} key - The key for the data to retrieve.
   * @returns {T[]} The parsed data or an empty array if not found or on error.
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

  /**
   * @private
   * @method saveToStorage
   * @description A generic helper to save data to `localStorage`.
   * @param {string} key - The key to save the data under.
   * @param {T[]} data - The data to be saved.
   * @returns {boolean} True if the save was successful, false otherwise.
   */
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
   * --- Notes Operations ---
   *
   * These methods will be replaced with API calls in the future.
   * Future endpoints:
   * - GET /api/notes
   * - POST /api/notes
   * - PUT /api/notes/:id
   * - DELETE /api/notes/:id
   */

  /**
   * @method getNotes
   * @description Retrieves all non-deleted notes, sorted by the last update time.
   * This is a legacy method; `getNotesWithPagination` is preferred for new implementations.
   * @returns {Promise<Note[]>} A list of notes.
   */
  async getNotes(): Promise<Note[]> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const notes = await indexedDB.getAll<Note>(STORE_NAMES.NOTES)
        const activeNotes = notes.filter(note => !note.deletedAt)
        return activeNotes.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      } else {
        const notes = this.getFromStorage<Note>('notes')
        return notes.filter(note => !note.deletedAt)
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_notes',
      })
      return this.getFromStorage<Note>('notes').filter(note => !note.deletedAt)
    }
  }

  /**
   * @method getNotesWithPagination
   * @description Retrieves notes with support for pagination, sorting, and filtering.
   * @param {PaginationOptions} options - The options for pagination and sorting.
   * @returns {Promise<PaginatedResult<Note>>} A paginated list of notes.
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

      // Apply filtering and sorting.
      const filteredNotes = includeDeleted
        ? allNotes
        : allNotes.filter(note => !note.deletedAt)
      filteredNotes.sort((a, b) => {
        let aValue: string | number
        let bValue: string | number
        if (sortBy === 'title') {
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
        } else {
          aValue = new Date(a[sortBy]).getTime()
          bValue = new Date(b[sortBy]).getTime()
        }
        return sortOrder === 'asc'
          ? aValue > bValue
            ? 1
            : -1
          : aValue < bValue
            ? 1
            : -1
      })

      // Apply pagination.
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
   * @method getNote
   * @description Retrieves a single note by its ID.
   * @param {string} noteId - The ID of the note to retrieve.
   * @returns {Promise<Note | null>} The note if found, otherwise null.
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
   * @method saveNote
   * @description Saves or updates a note. Includes validation, sanitization, and versioning.
   * @param {Note} note - The note object to save.
   * @returns {Promise<boolean>} True if the save was successful.
   */
  async saveNote(note: Note): Promise<boolean> {
    await this.initialize()

    // Validate the note before saving.
    const validationError = validateNote({
      title: note.title,
      content: note.content,
    })
    if (validationError) {
      monitoring.logError(new Error(validationError), {
        feature: 'data_service',
        action: 'save_note_validation',
        additionalData: { noteId: note.id },
      })
      return false
    }

    // Sanitize and enrich the note with metadata.
    const sanitizedNote: Note = {
      ...note,
      title: sanitizeTitle(note.title),
      content: sanitizeContent(note.content || ''),
      wordCount: calculateWordCount(note.content || ''),
      updatedAt: new Date().toISOString(),
    }

    // Determine if it's a new note or an update, and set the version.
    let isUpdate = false
    try {
      const existingNote = await this.getNote(note.id)
      if (existingNote) {
        isUpdate = true
        sanitizedNote.version = (existingNote.version || 1) + 1
      } else {
        sanitizedNote.version = 1
        sanitizedNote.createdAt =
          sanitizedNote.createdAt || new Date().toISOString()
      }
    } catch (error) {
      sanitizedNote.version = 1
      sanitizedNote.createdAt =
        sanitizedNote.createdAt || new Date().toISOString()
    }

    try {
      if (this.useIndexedDB) {
        await indexedDB.put(STORE_NAMES.NOTES, sanitizedNote)
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
        // Fallback to localStorage.
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === sanitizedNote.id)
        if (existingIndex >= 0) {
          notes[existingIndex] = sanitizedNote
        } else {
          notes.unshift(sanitizedNote)
        }
        return this.saveToStorage('notes', notes)
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'save_note',
        additionalData: { noteId: sanitizedNote.id },
      })

      // Attempt a fallback to localStorage on error.
      try {
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === sanitizedNote.id)
        if (existingIndex >= 0) {
          notes[existingIndex] = sanitizedNote
        } else {
          notes.unshift(sanitizedNote)
        }
        return this.saveToStorage('notes', notes)
      } catch {
        return false
      }
    }
  }

  /**
   * @method deleteNote
   * @description Soft-deletes a note by setting a `deletedAt` timestamp.
   * @param {string} noteId - The ID of the note to delete.
   * @returns {Promise<boolean>} True if the deletion was successful.
   */
  async deleteNote(noteId: string): Promise<boolean> {
    await this.initialize()

    try {
      const note = await this.getNote(noteId)
      if (!note) {
        monitoring.addBreadcrumb('Note not found for deletion', 'warning', {
          noteId,
        })
        return false
      }

      // Soft-delete the note.
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

      // Attempt a fallback to localStorage.
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
   * @method restoreNote
   * @description Restores a soft-deleted note if it is within the 30-day retention period.
   * @param {string} noteId - The ID of the note to restore.
   * @returns {Promise<boolean>} True if the restoration was successful.
   */
  async restoreNote(noteId: string): Promise<boolean> {
    await this.initialize()

    try {
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
          { noteId }
        )
        return false
      }

      // Enforce the 30-day retention period.
      const deletedDate = new Date(note.deletedAt)
      const daysSinceDeleted =
        (Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDeleted > 30) {
        monitoring.addBreadcrumb(
          'Note is beyond 30-day retention period',
          'warning',
          { noteId, daysSinceDeleted: Math.floor(daysSinceDeleted) }
        )
        return false
      }

      // Restore the note by clearing the `deletedAt` field.
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
   * @method cleanupDeletedNotes
   * @description Permanently deletes notes that were soft-deleted more than 30 days ago.
   * This should be run periodically to maintain data hygiene.
   * @returns {Promise<number>} The number of notes that were permanently deleted.
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

      // Identify notes to be permanently deleted.
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

      // Perform the permanent deletion.
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
   * --- Waitlist Operations ---
   *
   * These methods will also be replaced with API calls in the future.
   * Future endpoints:
   * - POST /api/waitlist
   * - GET /api/waitlist (admin only)
   */

  /**
   * @method addToWaitlist
   * @description Adds a new entry to the waitlist.
   * @param {Omit<WaitlistEntry, 'id' | 'createdAt'>} entry - The waitlist entry details.
   * @returns {Promise<{ success: boolean; error?: string }>} The result of the operation.
   */
  async addToWaitlist(
    entry: Omit<WaitlistEntry, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize()

    try {
      // Prevent duplicate entries.
      if (this.useIndexedDB) {
        const existingEntries = await indexedDB.getAll<WaitlistEntry>(
          STORE_NAMES.WAITLIST
        )
        if (existingEntries.some(e => e.email === entry.email)) {
          return { success: false, error: "You're already on the waitlist!" }
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
        const existingEntries = this.getFromStorage<WaitlistEntry>('waitlist')
        if (existingEntries.some(e => e.email === entry.email)) {
          return { success: false, error: "You're already on the waitlist!" }
        }

        const newEntry: WaitlistEntry = {
          id: crypto.randomUUID(),
          ...entry,
          createdAt: new Date().toISOString(),
        }
        existingEntries.push(newEntry)
        const success = this.saveToStorage('waitlist', existingEntries)
        return success
          ? { success: true }
          : { success: false, error: 'Failed to save to waitlist' }
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'add_to_waitlist',
      })
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * @method getWaitlistEntries
   * @description Retrieves all entries from the waitlist.
   * @returns {Promise<WaitlistEntry[]>} A list of waitlist entries.
   */
  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const entries = await indexedDB.getAll<WaitlistEntry>(
          STORE_NAMES.WAITLIST
        )
        return entries.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else {
        return this.getFromStorage<WaitlistEntry>('waitlist')
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_waitlist_entries',
      })
      return this.getFromStorage<WaitlistEntry>('waitlist')
    }
  }

  /**
   * @method exportData
   * @description Exports all notes and waitlist entries. Useful for admin functionality.
   * @returns {Promise<{ notes: Note[]; waitlist: WaitlistEntry[] }>} The exported data.
   */
  async exportData(): Promise<{ notes: Note[]; waitlist: WaitlistEntry[] }> {
    const [notes, waitlist] = await Promise.all([
      this.getNotes(),
      this.getWaitlistEntries(),
    ])
    return { notes, waitlist }
  }

  /**
   * @method clearAllData
   * @description Clears all application data from storage. Intended for development and testing.
   * @returns {Promise<boolean>} True if the data was cleared successfully.
   */
  async clearAllData(): Promise<boolean> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        await indexedDB.clear(STORE_NAMES.NOTES)
        await indexedDB.clear(STORE_NAMES.WAITLIST)
        monitoring.addBreadcrumb('All data cleared from IndexedDB', 'info')
      } else {
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
   * @method getStorageInfo
   * @description Retrieves information about the current state of the data storage.
   * @returns {Promise<{ notesCount: number; waitlistCount: number; storageUsed: number; storageQuota: number }>} Storage metrics.
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
        const notes = this.getFromStorage<Note>('notes')
        const waitlist = this.getFromStorage<WaitlistEntry>('waitlist')
        const notesData =
          localStorage.getItem(`${this.storagePrefix}notes`) || ''
        const waitlistData =
          localStorage.getItem(`${this.storagePrefix}waitlist`) || ''
        const storageUsed = new Blob([notesData + waitlistData]).size
        const storageQuota = 5 * 1024 * 1024 // Typical localStorage quota.
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
      return {
        notesCount: 0,
        waitlistCount: 0,
        storageUsed: 0,
        storageQuota: 0,
      }
    }
  }
}

// Export a singleton instance of the service.
export const dataService = new DataService()

// Export the default for backward compatibility and testing.
export default dataService
