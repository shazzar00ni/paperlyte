import type { Note, WaitlistEntry } from '../types'
import { monitoring } from '../utils/monitoring'

/**
 * Data Service - Abstraction layer for data persistence
 *
 * CURRENT IMPLEMENTATION: localStorage (MVP phase)
 * FUTURE MIGRATION: Will be replaced with API calls in Q4 2025
 *
 * This abstraction layer ensures easy migration from localStorage to API
 * without changing component code.
 */

class DataService {
  private storagePrefix = 'paperlyte_'

  /**
   * Generic storage operations
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
    return Promise.resolve(this.getFromStorage<Note>('notes'))
  }

  async saveNote(note: Note): Promise<boolean> {
    const notes = this.getFromStorage<Note>('notes')
    const existingIndex = notes.findIndex(n => n.id === note.id)

    if (existingIndex >= 0) {
      notes[existingIndex] = note
    } else {
      notes.unshift(note) // Add new notes to the beginning
    }

    return Promise.resolve(this.saveToStorage('notes', notes))
  }

  async deleteNote(noteId: string): Promise<boolean> {
    const notes = this.getFromStorage<Note>('notes')
    const filteredNotes = notes.filter(note => note.id !== noteId)
    return Promise.resolve(this.saveToStorage('notes', filteredNotes))
  }

  /**
   * Waitlist operations
   *
   * TODO: Replace with API calls in Q4 2025:
   * - POST /api/waitlist
   * - GET /api/waitlist (admin only)
   */
  addToWaitlist(
    entry: Omit<WaitlistEntry, 'id' | 'createdAt'>
  ): { success: boolean; error?: string } {
    try {
      const existingEntries = this.getFromStorage<WaitlistEntry>('waitlist')

      // Check for duplicate email
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
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'add_to_waitlist',
      })
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  getWaitlistEntries(): WaitlistEntry[] {
    return this.getFromStorage<WaitlistEntry>('waitlist')
  }

  /**
   * Data export for admin dashboard
   */
  exportData(): { notes: Note[]; waitlist: WaitlistEntry[] } {
    const notes = this.getNotes()
    const waitlist = this.getWaitlistEntries()
    return { notes, waitlist }
  }

  /**
   * Clear all data (for testing/development)
   */
  clearAllData(): void {
    localStorage.removeItem(`${this.storagePrefix}notes`)
    localStorage.removeItem(`${this.storagePrefix}waitlist`)
  }

  /**
   * Check data storage health
   */
  getStorageInfo(): {
    notesCount: number
    waitlistCount: number
    storageUsed: number
    storageQuota: number
  } {
    const notes = this.getFromStorage<Note>('notes')
    const waitlist = this.getFromStorage<WaitlistEntry>('waitlist')

    // Estimate storage usage
    const notesData =
      localStorage.getItem(`${this.storagePrefix}notes`) || ''
    const waitlistData =
      localStorage.getItem(`${this.storagePrefix}waitlist`) || ''
    const storageUsed = new Blob([notesData + waitlistData]).size

    // Typical localStorage quota is 5-10MB, but we can't reliably detect it
    const storageQuota = 5 * 1024 * 1024 // 5MB assumption

    return {
      notesCount: notes.length,
      waitlistCount: waitlist.length,
      storageUsed,
      storageQuota,
    }
  }
}

// Export singleton instance
export const dataService = new DataService()

// Export for backward compatibility and testing
export default dataService
