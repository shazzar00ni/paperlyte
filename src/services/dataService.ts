import type {
  Note,
  WaitlistEntry,
  FeedbackEntry,
  InterviewRequest,
} from '../types'
import { monitoring } from '../utils/monitoring'
import { indexedDB, STORE_NAMES } from '../utils/indexedDB'
import {
  migrateToIndexedDB,
  isIndexedDBAvailable,
} from '../utils/dataMigration'

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

      if (this.useIndexedDB) {
        // Initialize IndexedDB
        await indexedDB.init()

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
      // Fall back to localStorage
      this.useIndexedDB = false
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
  async getNotes(): Promise<Note[]> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const notes = await indexedDB.getAll<Note>(STORE_NAMES.NOTES)
        // Sort by updatedAt descending (newest first)
        return notes.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      } else {
        // Fallback to localStorage
        return this.getFromStorage<Note>('notes')
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_notes',
      })
      // Fallback to localStorage on error
      return this.getFromStorage<Note>('notes')
    }
  }

  async saveNote(note: Note): Promise<boolean> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        await indexedDB.put(STORE_NAMES.NOTES, note)
        monitoring.addBreadcrumb('Note saved to IndexedDB', 'info', {
          noteId: note.id,
        })
        return true
      } else {
        // Fallback to localStorage
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === note.id)

        if (existingIndex >= 0) {
          notes[existingIndex] = note
        } else {
          notes.unshift(note) // Add new notes to the beginning
        }

        return this.saveToStorage('notes', notes)
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'save_note',
        additionalData: { noteId: note.id },
      })

      // Try localStorage fallback
      try {
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === note.id)

        if (existingIndex >= 0) {
          notes[existingIndex] = note
        } else {
          notes.unshift(note)
        }

        return this.saveToStorage('notes', notes)
      } catch {
        return false
      }
    }
  }

  async deleteNote(noteId: string): Promise<boolean> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        await indexedDB.delete(STORE_NAMES.NOTES, noteId)
        monitoring.addBreadcrumb('Note deleted from IndexedDB', 'info', {
          noteId,
        })
        return true
      } else {
        // Fallback to localStorage
        const notes = this.getFromStorage<Note>('notes')
        const filteredNotes = notes.filter(note => note.id !== noteId)
        return this.saveToStorage('notes', filteredNotes)
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
        const filteredNotes = notes.filter(note => note.id !== noteId)
        return this.saveToStorage('notes', filteredNotes)
      } catch {
        return false
      }
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
   * Feedback operations
   *
   * TODO: Replace with API calls in Q4 2025:
   * - POST /api/feedback
   * - GET /api/feedback (admin only)
   */
  async addFeedback(
    entry: Omit<FeedbackEntry, 'id' | 'createdAt' | 'status'>
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const newEntry: FeedbackEntry = {
          id: crypto.randomUUID(),
          ...entry,
          status: 'new',
          createdAt: new Date().toISOString(),
        }

        await indexedDB.put(STORE_NAMES.FEEDBACK, newEntry)
        monitoring.addBreadcrumb('Feedback entry added to IndexedDB', 'info')
        return { success: true }
      } else {
        // Fallback to localStorage
        const existingEntries = this.getFromStorage<FeedbackEntry>('feedback')

        const newEntry: FeedbackEntry = {
          id: crypto.randomUUID(),
          ...entry,
          status: 'new',
          createdAt: new Date().toISOString(),
        }

        existingEntries.push(newEntry)
        const success = this.saveToStorage('feedback', existingEntries)

        if (success) {
          return { success: true }
        } else {
          return { success: false, error: 'Failed to save feedback' }
        }
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'add_feedback',
      })
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  async getFeedbackEntries(): Promise<FeedbackEntry[]> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const entries = await indexedDB.getAll<FeedbackEntry>(
          STORE_NAMES.FEEDBACK
        )
        // Sort by createdAt descending (newest first)
        return entries.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else {
        // Fallback to localStorage
        return this.getFromStorage<FeedbackEntry>('feedback')
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_feedback_entries',
      })
      // Fallback to localStorage on error
      return this.getFromStorage<FeedbackEntry>('feedback')
    }
  }

  /**
   * Interview scheduling operations
   *
   * TODO: Replace with API calls in Q4 2025:
   * - POST /api/interviews
   * - GET /api/interviews (admin only)
   */
  async scheduleInterview(
    request: Omit<InterviewRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize()

    try {
      // Normalize email for consistent comparison and storage
      const normalizedEmail = request.email.toLowerCase().trim()

      // Check for duplicate email
      if (this.useIndexedDB) {
        const existingRequests =
          (await indexedDB.getAll<InterviewRequest>(STORE_NAMES.INTERVIEWS)) ||
          []

        if (
          existingRequests.some(
            r => (r.email || '').toLowerCase().trim() === normalizedEmail
          )
        ) {
          return {
            success: false,
            error: 'You already have a pending interview request!',
          }
        }

        const newRequest: InterviewRequest = {
          id: crypto.randomUUID(),
          ...request,
          email: normalizedEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }

        await indexedDB.put(STORE_NAMES.INTERVIEWS, newRequest)
        monitoring.addBreadcrumb('Interview request added to IndexedDB', 'info')
        return { success: true }
      } else {
        // Fallback to localStorage
        const existingRequests =
          this.getFromStorage<InterviewRequest>('interviews') || []

        if (
          existingRequests.some(
            r => (r.email || '').toLowerCase().trim() === normalizedEmail
          )
        ) {
          return {
            success: false,
            error: 'You already have a pending interview request!',
          }
        }

        const newRequest: InterviewRequest = {
          id: crypto.randomUUID(),
          ...request,
          email: normalizedEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }

        existingRequests.push(newRequest)
        const success = this.saveToStorage('interviews', existingRequests)

        if (success) {
          return { success: true }
        } else {
          return { success: false, error: 'Failed to schedule interview' }
        }
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'schedule_interview',
      })
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  async getInterviewRequests(): Promise<InterviewRequest[]> {
    await this.initialize()

    try {
      if (this.useIndexedDB) {
        const requests = await indexedDB.getAll<InterviewRequest>(
          STORE_NAMES.INTERVIEWS
        )
        // Sort by createdAt descending (newest first)
        return requests.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } else {
        // Fallback to localStorage
        return this.getFromStorage<InterviewRequest>('interviews')
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_interview_requests',
      })
      // Fallback to localStorage on error
      return this.getFromStorage<InterviewRequest>('interviews')
    }
  }

  /**
   * Data export for admin dashboard
   */
  async exportData(): Promise<{
    notes: Note[]
    waitlist: WaitlistEntry[]
    feedback: FeedbackEntry[]
    interviews: InterviewRequest[]
  }> {
    const [notes, waitlist, feedback, interviews] = await Promise.all([
      this.getNotes(),
      this.getWaitlistEntries(),
      this.getFeedbackEntries(),
      this.getInterviewRequests(),
    ])

    return { notes, waitlist, feedback, interviews }
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
}

// Export singleton instance
export const dataService = new DataService()

// Export for backward compatibility and testing
export default dataService
