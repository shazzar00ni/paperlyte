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
    // This private method can remain synchronous as it's an internal implementation detail.
    try {
      const data = localStorage.getItem(`${this.storagePrefix}${key}`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'get_from_storage',
        additionalData: { key },
      })
      // Re-throw the error so the public-facing method's catch block can handle it.
      throw error
    }
  }

  private saveToStorage<T>(key: string, data: T[]): boolean {
    // This private method is intentionally synchronous, as it wraps localStorage.
    // The public API provides an async abstraction by wrapping this in a Promise.
    try {
      localStorage.setItem(`${this.storagePrefix}${key}`, JSON.stringify(data))
      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'save_to_storage',
        additionalData: { key, dataLength: data.length },
      })
      throw error
    }
  }

  /**
   * Notes operations
   */
  async getNotes(): Promise<Note[]> {
    try {
      const notes = this.getFromStorage<Note>('notes')
      return Promise.resolve(notes)
    } catch (error) {
      // The error is already logged by getFromStorage, just return a safe value.
      return Promise.resolve([])
    }
  }

  async saveNote(note: Note): Promise<boolean> {
    try {
      const notes = this.getFromStorage<Note>('notes')
      const existingIndex = notes.findIndex(n => n.id === note.id)

      if (existingIndex >= 0) {
        notes[existingIndex] = note
      } else {
        notes.unshift(note) // Add new notes to the beginning
      }
      const success = this.saveToStorage('notes', notes)
      return Promise.resolve(success)
    } catch (error) {
      return Promise.resolve(false)
    }
  }

  async deleteNote(noteId: string): Promise<boolean> {
    try {
      const notes = this.getFromStorage<Note>('notes')
      const filteredNotes = notes.filter(note => note.id !== noteId)
      const success = this.saveToStorage('notes', filteredNotes)
      return Promise.resolve(success)
    } catch (error) {
      return Promise.resolve(false)
    }
  }

  /**
   * Waitlist operations
   */
  async addToWaitlist(
    entry: Omit<WaitlistEntry, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existingEntries = this.getFromStorage<WaitlistEntry>('waitlist')

      if (existingEntries.some(e => e.email === entry.email)) {
        return Promise.resolve({
          success: false,
          error: "You're already on the waitlist!",
        })
      }

      const newEntry: WaitlistEntry = {
        id: crypto.randomUUID(),
        ...entry,
        createdAt: new Date().toISOString(),
      }

      existingEntries.push(newEntry)
      this.saveToStorage('waitlist', existingEntries)
      return Promise.resolve({ success: true })
    } catch (error) {
      // The error is already logged by the storage methods.
      return Promise.resolve({ success: false, error: 'An unexpected error occurred' })
    }
  }

  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    try {
      const entries = this.getFromStorage<WaitlistEntry>('waitlist')
      return Promise.resolve(entries)
    } catch (error) {
      return Promise.resolve([])
    }
  }

  /**
   * Data export for admin dashboard
   */
  async exportData(): Promise<{ notes: Note[]; waitlist: WaitlistEntry[] }> {
    try {
      const notes = await this.getNotes()
      const waitlist = await this.getWaitlistEntries()
      return Promise.resolve({ notes, waitlist })
    } catch (error) {
      return Promise.resolve({ notes: [], waitlist: [] })
    }
  }

  /**
   * Clear all data (for testing/development)
   */
  async clearAllData(): Promise<boolean> {
    try {
      localStorage.removeItem(`${this.storagePrefix}notes`)
      localStorage.removeItem(`${this.storagePrefix}waitlist`)
      return Promise.resolve(true)
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_service',
        action: 'clear_all_data',
      })
      return Promise.resolve(false)
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
  } | null> {
    try {
      const notes = this.getFromStorage<Note>('notes')
      const waitlist = this.getFromStorage<WaitlistEntry>('waitlist')

      const notesData = localStorage.getItem(`${this.storagePrefix}notes`) || ''
      const waitlistData = localStorage.getItem(`${this.storagePrefix}waitlist`) || ''
      const storageUsed = new Blob([notesData + waitlistData]).size
      const storageQuota = 5 * 1024 * 1024 // 5MB assumption

      return Promise.resolve({
        notesCount: notes.length,
        waitlistCount: waitlist.length,
        storageUsed,
        storageQuota,
      })
    } catch (error) {
      return Promise.resolve(null)
    }
  }
}

// Export singleton instance
export const dataService = new DataService()

// Export for backward compatibility and testing
export default dataService