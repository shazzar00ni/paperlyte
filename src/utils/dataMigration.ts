import { indexedDB, STORE_NAMES } from './indexedDB'
import { monitoring } from './monitoring'
import type { Note, WaitlistEntry } from '../types'

/**
 * @fileoverview
 * This utility handles the one-time migration of data from `localStorage` to IndexedDB.
 * It is designed to be run when the application initializes, ensuring that data from
 * older versions of the application is seamlessly moved to the more robust IndexedDB storage.
 */

// Constants for managing migration status and finding data in localStorage.
const MIGRATION_KEY = 'paperlyte_migration_status'
const STORAGE_PREFIX = 'paperlyte_'

/**
 * @interface MigrationStatus
 * @description Defines the structure of the migration status object stored in `localStorage`.
 */
export interface MigrationStatus {
  completed: boolean
  version: string
  timestamp: string
  error?: string
}

/**
 * @function getMigrationStatus
 * @description Checks `localStorage` to see if the migration has already been completed.
 * @returns {MigrationStatus | null} The migration status object, or null if not found.
 */
function getMigrationStatus(): MigrationStatus | null {
  try {
    const status = localStorage.getItem(MIGRATION_KEY)
    return status ? JSON.parse(status) : null
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'data_migration',
      action: 'get_migration_status',
    })
    return null
  }
}

/**
 * @function setMigrationStatus
 * @description Saves the migration status to `localStorage`.
 * @param {MigrationStatus} status - The status object to save.
 */
function setMigrationStatus(status: MigrationStatus): void {
  try {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(status))
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'data_migration',
      action: 'set_migration_status',
    })
  }
}

/**
 * @function getFromLocalStorage
 * @description A generic function to retrieve and parse data from `localStorage`.
 * @param {string} key - The key of the data to retrieve (without the prefix).
 * @returns {T[]} The parsed data, or an empty array if an error occurs.
 */
function getFromLocalStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    return data ? JSON.parse(data) : []
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'data_migration',
      action: 'get_from_localstorage',
      additionalData: { key },
    })
    return []
  }
}

/**
 * @async
 * @function migrateNotes
 * @description Migrates all notes from `localStorage` to the IndexedDB notes store.
 * @returns {Promise<{ count: number; errors: number }>} The number of migrated notes and any errors.
 */
async function migrateNotes(): Promise<{ count: number; errors: number }> {
  const notes = getFromLocalStorage<Note>('notes')
  let count = 0
  let errors = 0

  for (const note of notes) {
    try {
      await indexedDB.put(STORE_NAMES.NOTES, note)
      count++
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_migration',
        action: 'migrate_note',
        additionalData: { noteId: note.id },
      })
      errors++
    }
  }

  return { count, errors }
}

/**
 * @async
 * @function migrateWaitlist
 * @description Migrates all waitlist entries from `localStorage` to the IndexedDB waitlist store.
 * @returns {Promise<{ count: number; errors: number }>} The number of migrated entries and any errors.
 */
async function migrateWaitlist(): Promise<{ count: number; errors: number }> {
  const entries = getFromLocalStorage<WaitlistEntry>('waitlist')
  let count = 0
  let errors = 0

  for (const entry of entries) {
    try {
      await indexedDB.put(STORE_NAMES.WAITLIST, entry)
      count++
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'data_migration',
        action: 'migrate_waitlist',
        additionalData: { entryId: entry.id },
      })
      errors++
    }
  }

  return { count, errors }
}

/**
 * @async
 * @function migrateSyncMetadata
 * @description Migrates sync-related metadata from `localStorage` to the IndexedDB metadata store.
 * This includes sync status, conflicts, and cached cloud notes.
 */
async function migrateSyncMetadata(): Promise<void> {
  try {
    const syncMetadata = localStorage.getItem('paperlyte_sync_metadata')
    const syncConflicts = localStorage.getItem('paperlyte_sync_conflicts')
    const cloudNotes = localStorage.getItem('paperlyte_sync_cloud_notes')

    if (syncMetadata) {
      await indexedDB.put(STORE_NAMES.METADATA, {
        key: 'sync_metadata',
        value: JSON.parse(syncMetadata),
      })
    }

    if (syncConflicts) {
      await indexedDB.put(STORE_NAMES.METADATA, {
        key: 'sync_conflicts',
        value: JSON.parse(syncConflicts),
      })
    }

    if (cloudNotes) {
      await indexedDB.put(STORE_NAMES.METADATA, {
        key: 'cloud_notes',
        value: JSON.parse(cloudNotes),
      })
    }
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'data_migration',
      action: 'migrate_sync_metadata',
    })
  }
}

/**
 * @async
 * @function migrateToIndexedDB
 * @description The main function that orchestrates the entire migration process.
 * It checks if a migration is needed, then migrates all data types and records the result.
 * @returns {Promise<{ success: boolean; notesCount: number; waitlistCount: number; errors: number }>} A summary of the migration result.
 */
export async function migrateToIndexedDB(): Promise<{
  success: boolean
  notesCount: number
  waitlistCount: number
  errors: number
}> {
  const status = getMigrationStatus()
  if (status?.completed) {
    monitoring.addBreadcrumb('Migration already completed', 'info', {
      timestamp: status.timestamp,
    })
    return { success: true, notesCount: 0, waitlistCount: 0, errors: 0 }
  }

  monitoring.addBreadcrumb('Starting data migration to IndexedDB', 'info')

  try {
    await indexedDB.init()

    const notesResult = await migrateNotes()
    monitoring.addBreadcrumb('Notes migrated', 'info', notesResult)

    const waitlistResult = await migrateWaitlist()
    monitoring.addBreadcrumb('Waitlist migrated', 'info', waitlistResult)

    await migrateSyncMetadata()
    monitoring.addBreadcrumb('Sync metadata migrated', 'info')

    const totalErrors = notesResult.errors + waitlistResult.errors
    if (totalErrors === 0) {
      // If the migration is successful, mark it as completed.
      setMigrationStatus({
        completed: true,
        version: '1.0',
        timestamp: new Date().toISOString(),
      })
      monitoring.addBreadcrumb('Migration completed successfully', 'info', {
        notesCount: notesResult.count,
        waitlistCount: waitlistResult.count,
      })
    } else {
      monitoring.addBreadcrumb('Migration completed with errors', 'warning', {
        notesCount: notesResult.count,
        waitlistCount: waitlistResult.count,
        errors: totalErrors,
      })
    }

    return {
      success: totalErrors === 0,
      notesCount: notesResult.count,
      waitlistCount: waitlistResult.count,
      errors: totalErrors,
    }
  } catch (error) {
    const err = error as Error
    monitoring.logError(err, {
      feature: 'data_migration',
      action: 'migrate_to_indexeddb',
    })
    setMigrationStatus({
      completed: false,
      version: '1.0',
      timestamp: new Date().toISOString(),
      error: err.message,
    })
    return { success: false, notesCount: 0, waitlistCount: 0, errors: 1 }
  }
}

/**
 * @function isIndexedDBAvailable
 * @description Checks if the IndexedDB API is available in the current browser environment.
 * @returns {boolean} True if IndexedDB is available.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/**
 * @function resetMigrationStatus
 * @description A utility function for testing purposes to reset the migration status,
 * allowing the migration to be run again.
 */
export function resetMigrationStatus(): void {
  try {
    localStorage.removeItem(MIGRATION_KEY)
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'data_migration',
      action: 'reset_migration_status',
    })
  }
}
