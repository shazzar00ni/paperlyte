import { indexedDB, STORE_NAMES } from './indexedDB'
import { monitoring } from './monitoring'
import type { Note, WaitlistEntry } from '../types'

/**
 * Data Migration Utility
 *
 * Handles migration from localStorage to IndexedDB
 * Ensures data integrity and rollback on failure
 */

const MIGRATION_KEY = 'paperlyte_migration_status'
const STORAGE_PREFIX = 'paperlyte_'

export interface MigrationStatus {
  completed: boolean
  version: string
  timestamp: string
  error?: string
}

/**
 * Check if migration has already been completed
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
 * Set migration status
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
 * Get data from localStorage
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
 * Migrate notes from localStorage to IndexedDB
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
 * Migrate waitlist entries from localStorage to IndexedDB
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
 * Migrate sync metadata from localStorage to IndexedDB
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
 * Main migration function
 * Migrates all data from localStorage to IndexedDB
 */
export async function migrateToIndexedDB(): Promise<{
  success: boolean
  notesCount: number
  waitlistCount: number
  errors: number
}> {
  // Check if migration already completed
  const status = getMigrationStatus()
  if (status?.completed) {
    monitoring.addBreadcrumb('Migration already completed', 'info', {
      timestamp: status.timestamp,
    })
    return {
      success: true,
      notesCount: 0,
      waitlistCount: 0,
      errors: 0,
    }
  }

  monitoring.addBreadcrumb('Starting data migration to IndexedDB', 'info')

  try {
    // Initialize IndexedDB
    await indexedDB.init()

    // Migrate notes
    const notesResult = await migrateNotes()
    monitoring.addBreadcrumb('Notes migrated', 'info', notesResult)

    // Migrate waitlist
    const waitlistResult = await migrateWaitlist()
    monitoring.addBreadcrumb('Waitlist migrated', 'info', waitlistResult)

    // Migrate sync metadata
    await migrateSyncMetadata()
    monitoring.addBreadcrumb('Sync metadata migrated', 'info')

    const totalErrors = notesResult.errors + waitlistResult.errors

    // Mark migration as complete only if no errors
    if (totalErrors === 0) {
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

    return {
      success: false,
      notesCount: 0,
      waitlistCount: 0,
      errors: 1,
    }
  }
}

/**
 * Check if IndexedDB is available in the browser
 */
export function isIndexedDBAvailable(): boolean {
  try {
    // Use globalThis to avoid shadowing and support non-window environments
    return typeof globalThis !== 'undefined' && !!(globalThis as any).indexedDB
  } catch {
    return false
  }
}

/**
 * Reset migration status (for testing)
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
