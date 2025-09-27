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
    // Simulate async API call for future compatibility
    return new Promise(resolve => {
      setTimeout(() => {
        const notes = this.getFromStorage<Note>('notes')
        resolve(notes)
      }, 0)
    })
  }

  async saveNote(note: Note): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(() => {
        const notes = this.getFromStorage<Note>('notes')
        const existingIndex = notes.findIndex(n => n.id === note.id)

        if (existingIndex >= 0) {
          notes[existingIndex] = note
        } else {
          notes.unshift(note) // Add new notes to the beginning
        }

        const success = this.saveToStorage('notes', notes)
        resolve(success)
      }, 0)
    })
  }

  async deleteNote(noteId: string): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(() => {
        const notes = this.getFromStorage<Note>('notes')
        const filteredNotes = notes.filter(note => note.id !== noteId)
        const success = this.saveToStorage('notes', filteredNotes)
        resolve(success)
      }, 0)
    })
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
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          const existingEntries = this.getFromStorage<WaitlistEntry>('waitlist')

          // Check for duplicate email
          if (existingEntries.some(e => e.email === entry.email)) {
            resolve({
              success: false,
              error: "You're already on the waitlist!",
            })
            return
          }

          const newEntry: WaitlistEntry = {
            id: crypto.randomUUID(),
            ...entry,
            createdAt: new Date().toISOString(),
          }

          existingEntries.push(newEntry)
          const success = this.saveToStorage('waitlist', existingEntries)

          if (success) {
            resolve({ success: true })
          } else {
            resolve({ success: false, error: 'Failed to save to waitlist' })
          }
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'data_service',
            action: 'add_to_waitlist',
          })
          resolve({ success: false, error: 'An unexpected error occurred' })
        }
      }, 100) // Slight delay to simulate network request
    })
  }

  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        const entries = this.getFromStorage<WaitlistEntry>('waitlist')
        resolve(entries)
      }, 0)
    })
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
  async clearAllData(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        localStorage.removeItem(`${this.storagePrefix}notes`)
        localStorage.removeItem(`${this.storagePrefix}waitlist`)
        resolve()
      }, 0)
    })
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
    return new Promise(resolve => {
      setTimeout(() => {
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

        resolve({
          notesCount: notes.length,
          waitlistCount: waitlist.length,
          storageUsed,
          storageQuota,
        })
      }, 0)
    })
  }
}

// Export singleton instance
export const dataService = new DataService()

// Export for backward compatibility and testing
export default dataService
