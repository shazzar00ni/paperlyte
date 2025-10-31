import type {
  Note,
  SyncConflict,
  SyncResult,
  SyncMetadata,
  ConflictResolutionStrategy,
} from '../types'
import { monitoring } from '../utils/monitoring'
import { indexedDB, STORE_NAMES } from '../utils/indexedDB'
import { isIndexedDBAvailable } from '../utils/dataMigration'

/**
 * Sync Engine - Manages cloud synchronization and conflict resolution
 *
 * CURRENT IMPLEMENTATION: Simulated cloud sync for MVP using IndexedDB
 * FUTURE: Will integrate with actual cloud API
 *
 * Features:
 * - Bidirectional sync between local and cloud storage
 * - Automatic conflict detection
 * - Last-write-wins and manual conflict resolution
 * - Offline-first architecture
 * - IndexedDB for metadata and conflict storage
 */

class SyncEngine {
  private storagePrefix = 'paperlyte_sync_'
  private syncInProgress = false
  private useIndexedDB: boolean = false

  constructor() {
    this.useIndexedDB = isIndexedDBAvailable()
  }

  /**
   * @function getCloudNotes
   * @description Simulates retrieving notes from cloud storage (MVP implementation)
   * Currently uses IndexedDB as "cloud" storage for offline testing
   * @returns {Promise<Note[]>} Array of notes from simulated cloud
   * @private
   * @future Will be replaced with actual API calls to backend
   */
  private async getCloudNotes(): Promise<Note[]> {
    try {
      if (this.useIndexedDB) {
        await indexedDB.init()
        const metadata = await indexedDB.get<{ key: string; value: Note[] }>(
          STORE_NAMES.METADATA,
          'cloud_notes'
        )
        return metadata?.value || []
      } else {
        // Fallback to localStorage
        const data = localStorage.getItem(`${this.storagePrefix}cloud_notes`)
        return data ? JSON.parse(data) : []
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_engine',
        action: 'get_cloud_notes',
      })
      return []
    }
  }

  /**
   * @function saveToCloud
   * @description Simulates saving notes to cloud storage (MVP implementation)
   * Handles storage quota errors gracefully
   * @param {Note[]} notes - Notes to save to cloud
   * @returns {Promise<boolean>} True if saved successfully
   * @private
   * @future Will be replaced with actual API POST requests
   */
  private async saveToCloud(notes: Note[]): Promise<boolean> {
    try {
      if (this.useIndexedDB) {
        await indexedDB.init()
        await indexedDB.put(STORE_NAMES.METADATA, {
          key: 'cloud_notes',
          value: notes,
        })
        return true
      } else {
        // Fallback to localStorage
        localStorage.setItem(
          `${this.storagePrefix}cloud_notes`,
          JSON.stringify(notes)
        )
        return true
      }
    } catch (error) {
      const err = error as Error

      // Check if error is quota exceeded
      if (
        err.name === 'QuotaExceededError' ||
        err.message?.includes('quota') ||
        err.message?.includes('storage')
      ) {
        monitoring.logError(err, {
          feature: 'sync_engine',
          action: 'save_to_cloud',
          additionalData: {
            errorType: 'quota_exceeded',
            notesCount: notes.length,
            message: 'Storage quota exceeded. Consider clearing old data.',
          },
        })

        monitoring.addBreadcrumb(
          'Storage quota exceeded during sync',
          'error',
          {
            notesCount: notes.length,
          }
        )
      } else {
        monitoring.logError(err, {
          feature: 'sync_engine',
          action: 'save_to_cloud',
        })
      }

      return false
    }
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(): Promise<SyncMetadata> {
    try {
      if (this.useIndexedDB) {
        await indexedDB.init()
        const metadata = await indexedDB.get<{
          key: string
          value: SyncMetadata
        }>(STORE_NAMES.METADATA, 'sync_metadata')

        return (
          metadata?.value || {
            lastSyncTime: null,
            syncEnabled: true,
            pendingSyncCount: 0,
            conflictCount: 0,
          }
        )
      } else {
        // Fallback to localStorage
        const metadataStr = localStorage.getItem(
          `${this.storagePrefix}metadata`
        )
        return metadataStr
          ? JSON.parse(metadataStr)
          : {
              lastSyncTime: null,
              syncEnabled: true,
              pendingSyncCount: 0,
              conflictCount: 0,
            }
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_engine',
        action: 'get_sync_metadata',
      })
      return {
        lastSyncTime: null,
        syncEnabled: true,
        pendingSyncCount: 0,
        conflictCount: 0,
      }
    }
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(
    metadata: Partial<SyncMetadata>
  ): Promise<void> {
    try {
      const current = await this.getSyncMetadata()
      const updated = { ...current, ...metadata }

      if (this.useIndexedDB) {
        await indexedDB.init()
        await indexedDB.put(STORE_NAMES.METADATA, {
          key: 'sync_metadata',
          value: updated,
        })
      } else {
        // Fallback to localStorage
        localStorage.setItem(
          `${this.storagePrefix}metadata`,
          JSON.stringify(updated)
        )
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_engine',
        action: 'update_sync_metadata',
      })
    }
  }

  /**
   * Detect conflicts between local and remote notes
   */
  private detectConflicts(
    localNotes: Note[],
    remoteNotes: Note[]
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = []
    const remoteNoteIds = new Set(remoteNotes.map(n => n.id))
    const localNoteIds = new Set(localNotes.map(n => n.id))

    // Check for update conflicts
    for (const localNote of localNotes) {
      const remoteNote = remoteNotes.find(n => n.id === localNote.id)

      if (remoteNote) {
        // Check if both versions were modified after last sync
        const localUpdated = new Date(localNote.updatedAt).getTime()
        const remoteUpdated = new Date(remoteNote.updatedAt).getTime()
        const lastSynced = localNote.lastSyncedAt
          ? new Date(localNote.lastSyncedAt).getTime()
          : 0

        // Conflict if both were modified after last sync
        if (localUpdated > lastSynced && remoteUpdated > lastSynced) {
          conflicts.push({
            noteId: localNote.id,
            localNote,
            remoteNote,
            conflictType: 'update',
            detectedAt: new Date().toISOString(),
          })
        }
      }
    }

    // Check for delete conflicts: note deleted remotely but updated locally
    for (const localNote of localNotes) {
      if (!remoteNoteIds.has(localNote.id) && localNote.lastSyncedAt) {
        const localUpdated = new Date(localNote.updatedAt).getTime()
        const lastSynced = new Date(localNote.lastSyncedAt).getTime()

        // Conflict if local was updated after last sync but remote was deleted
        if (localUpdated > lastSynced) {
          conflicts.push({
            noteId: localNote.id,
            localNote,
            remoteNote: {
              ...localNote,
              content: '[DELETED]',
              title: '[DELETED]',
            },
            conflictType: 'delete',
            detectedAt: new Date().toISOString(),
          })
        }
      }
    }

    // Check for delete conflicts: note deleted locally but updated remotely
    for (const remoteNote of remoteNotes) {
      if (!localNoteIds.has(remoteNote.id) && remoteNote.lastSyncedAt) {
        const remoteUpdated = new Date(remoteNote.updatedAt).getTime()
        const lastSynced = new Date(remoteNote.lastSyncedAt).getTime()

        // Conflict if remote was updated after last sync but local was deleted
        if (remoteUpdated > lastSynced) {
          conflicts.push({
            noteId: remoteNote.id,
            localNote: {
              ...remoteNote,
              content: '[DELETED]',
              title: '[DELETED]',
            },
            remoteNote,
            conflictType: 'delete',
            detectedAt: new Date().toISOString(),
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Resolve conflict using specified strategy
   */
  private resolveConflict(
    conflict: SyncConflict,
    strategy: ConflictResolutionStrategy
  ): Note {
    monitoring.addBreadcrumb('Resolving sync conflict', 'sync', {
      noteId: conflict.noteId,
      strategy,
    })

    switch (strategy) {
      case 'local':
        return { ...conflict.localNote, syncStatus: 'synced' }
      case 'remote':
        return { ...conflict.remoteNote, syncStatus: 'synced' }
      case 'manual':
        // For manual strategy, mark as conflict and return local for now
        return { ...conflict.localNote, syncStatus: 'conflict' }
      default: {
        // Default to last-write-wins
        const localTime = new Date(conflict.localNote.updatedAt).getTime()
        const remoteTime = new Date(conflict.remoteNote.updatedAt).getTime()
        return localTime > remoteTime
          ? { ...conflict.localNote, syncStatus: 'synced' }
          : { ...conflict.remoteNote, syncStatus: 'synced' }
      }
    }
  }

  /**
   * Sync local notes with cloud
   */
  async syncNotes(
    localNotes: Note[],
    strategy: ConflictResolutionStrategy = 'local'
  ): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedNotes: [],
        conflicts: [],
        errors: [{ noteId: '', error: 'Sync already in progress' }],
      }
    }

    this.syncInProgress = true
    monitoring.addBreadcrumb('Starting sync', 'sync', {
      localNotesCount: localNotes.length,
    })

    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          const remoteNotes = await this.getCloudNotes()
          const conflicts = this.detectConflicts(localNotes, remoteNotes)
          const syncedNotes: string[] = []
          const errors: Array<{ noteId: string; error: string }> = []

          // Save conflicts when using manual strategy
          if (strategy === 'manual' && conflicts.length > 0) {
            try {
              if (this.useIndexedDB) {
                await indexedDB.init()
                await indexedDB.put(STORE_NAMES.METADATA, {
                  key: 'sync_conflicts',
                  value: conflicts,
                })
              } else {
                localStorage.setItem(
                  `${this.storagePrefix}conflicts`,
                  JSON.stringify(conflicts)
                )
              }
            } catch (error) {
              const err = error as Error

              // Check if error is quota exceeded
              if (
                err.name === 'QuotaExceededError' ||
                err.message?.includes('quota') ||
                err.message?.includes('storage')
              ) {
                monitoring.logError(err, {
                  feature: 'sync_engine',
                  action: 'save_conflicts',
                  additionalData: { errorType: 'quota_exceeded' },
                })
                errors.push({
                  noteId: '',
                  error: 'Storage quota exceeded while saving conflicts',
                })
              } else {
                monitoring.logError(err, {
                  feature: 'sync_engine',
                  action: 'save_conflicts',
                })
              }
            }
          }

          // Build merged notes collection
          const mergedNotes = new Map<string, Note>()

          // Add all remote notes first
          remoteNotes.forEach(note => mergedNotes.set(note.id, note))

          // Process local notes
          for (const localNote of localNotes) {
            const conflict = conflicts.find(c => c.noteId === localNote.id)

            if (conflict) {
              // Resolve conflict
              const resolved = this.resolveConflict(conflict, strategy)
              mergedNotes.set(resolved.id, {
                ...resolved,
                lastSyncedAt: new Date().toISOString(),
                localVersion: (localNote.localVersion || 0) + 1,
                remoteVersion: (localNote.remoteVersion || 0) + 1,
              })

              if (strategy !== 'manual') {
                syncedNotes.push(resolved.id)
              }
            } else {
              // No conflict, sync normally
              const remoteNote = mergedNotes.get(localNote.id)
              if (remoteNote) {
                // Update existing remote note
                const updated = {
                  ...localNote,
                  syncStatus: 'synced' as const,
                  lastSyncedAt: new Date().toISOString(),
                  localVersion: (localNote.localVersion || 0) + 1,
                  remoteVersion: (remoteNote.remoteVersion || 0) + 1,
                }
                mergedNotes.set(localNote.id, updated)
                syncedNotes.push(localNote.id)
              } else {
                // New local note to upload
                const newNote = {
                  ...localNote,
                  syncStatus: 'synced' as const,
                  lastSyncedAt: new Date().toISOString(),
                  localVersion: 1,
                  remoteVersion: 1,
                }
                mergedNotes.set(localNote.id, newNote)
                syncedNotes.push(localNote.id)
              }
            }
          }

          // Save merged notes to cloud
          const success = await this.saveToCloud(
            Array.from(mergedNotes.values())
          )

          if (success) {
            await this.updateSyncMetadata({
              lastSyncTime: new Date().toISOString(),
              pendingSyncCount: 0,
              conflictCount: conflicts.filter(() => strategy === 'manual')
                .length,
            })

            monitoring.addBreadcrumb('Sync completed', 'sync', {
              syncedCount: syncedNotes.length,
              conflictCount: conflicts.length,
            })
          }

          this.syncInProgress = false

          resolve({
            success,
            syncedNotes,
            conflicts: strategy === 'manual' ? conflicts : [],
            errors,
          })
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'sync_engine',
            action: 'sync_notes',
          })
          this.syncInProgress = false

          resolve({
            success: false,
            syncedNotes: [],
            conflicts: [],
            errors: [
              { noteId: '', error: 'An unexpected error occurred during sync' },
            ],
          })
        }
      }, 100) // Simulate network latency
    })
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(): Promise<SyncConflict[]> {
    try {
      if (this.useIndexedDB) {
        await indexedDB.init()
        const metadata = await indexedDB.get<{
          key: string
          value: SyncConflict[]
        }>(STORE_NAMES.METADATA, 'sync_conflicts')
        return metadata?.value || []
      } else {
        const data = localStorage.getItem(`${this.storagePrefix}conflicts`)
        return data ? JSON.parse(data) : []
      }
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_engine',
        action: 'get_pending_conflicts',
      })
      return []
    }
  }

  /**
   * Resolve a specific conflict manually
   */
  async resolveConflictManually(
    conflictId: string,
    selectedNote: Note
  ): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          const conflicts = await this.getPendingConflicts()
          const updatedConflicts = conflicts.filter(
            c => c.noteId !== conflictId
          )

          try {
            if (this.useIndexedDB) {
              await indexedDB.init()
              await indexedDB.put(STORE_NAMES.METADATA, {
                key: 'sync_conflicts',
                value: updatedConflicts,
              })
            } else {
              localStorage.setItem(
                `${this.storagePrefix}conflicts`,
                JSON.stringify(updatedConflicts)
              )
            }
          } catch (storageError) {
            const err = storageError as Error

            // Check if error is quota exceeded
            if (
              err.name === 'QuotaExceededError' ||
              err.message?.includes('quota') ||
              err.message?.includes('storage')
            ) {
              monitoring.logError(err, {
                feature: 'sync_engine',
                action: 'resolve_conflict_manually',
                additionalData: { errorType: 'quota_exceeded' },
              })
              // Re-throw to handle in outer catch
              throw new Error('Storage quota exceeded')
            }
            throw storageError
          }

          // Save the selected note to cloud storage
          const cloudNotes = await this.getCloudNotes()
          const noteIndex = cloudNotes.findIndex(n => n.id === selectedNote.id)

          const resolvedNote = {
            ...selectedNote,
            syncStatus: 'synced' as const,
            lastSyncedAt: new Date().toISOString(),
            localVersion: (selectedNote.localVersion || 0) + 1,
            remoteVersion: (selectedNote.remoteVersion || 0) + 1,
          }

          if (noteIndex >= 0) {
            cloudNotes[noteIndex] = resolvedNote
          } else {
            cloudNotes.push(resolvedNote)
          }

          await this.saveToCloud(cloudNotes)

          // Update conflict count in metadata
          await this.updateSyncMetadata({
            conflictCount: updatedConflicts.length,
          })

          monitoring.addBreadcrumb('Conflict resolved manually', 'sync', {
            conflictId,
            selectedVersion: selectedNote.title,
          })

          resolve(true)
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'sync_engine',
            action: 'resolve_conflict_manually',
          })
          resolve(false)
        }
      }, 0)
    })
  }

  /**
   * Enable or disable sync
   */
  async setSyncEnabled(enabled: boolean): Promise<void> {
    return this.updateSyncMetadata({ syncEnabled: enabled })
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine()

// Export for testing
export default syncEngine
