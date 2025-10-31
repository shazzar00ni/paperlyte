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
 * @class SyncEngine
 * @description Manages the synchronization of local data with a remote (cloud) store.
 *
 * @summary
 * This engine is responsible for bidirectional data sync, conflict detection, and resolution.
 * For the MVP, it simulates a cloud backend using IndexedDB or `localStorage`, allowing the application
 * to function offline-first. This architecture is designed for future integration with a real cloud API.
 *
 * @property {boolean} syncInProgress - A flag to prevent concurrent sync operations.
 * @property {boolean} useIndexedDB - Indicates whether IndexedDB is available and in use.
 */
class SyncEngine {
  private storagePrefix = 'paperlyte_sync_'
  private syncInProgress = false
  private useIndexedDB: boolean = false

  constructor() {
    this.useIndexedDB = isIndexedDBAvailable()
  }

  /**
   * @private
   * @method getCloudNotes
   * @description Simulates fetching all notes from a cloud server.
   * In the MVP, this reads from a dedicated "cloud" store in IndexedDB or `localStorage`.
   * @returns {Promise<Note[]>} A promise that resolves to an array of notes from the "cloud".
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
   * @private
   * @method saveToCloud
   * @description Simulates saving a collection of notes to the cloud.
   * This overwrites the existing "cloud" data with the provided notes.
   * @param {Note[]} notes - The array of notes to save.
   * @returns {Promise<boolean>} True if the save was successful.
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
        localStorage.setItem(
          `${this.storagePrefix}cloud_notes`,
          JSON.stringify(notes)
        )
        return true
      }
    } catch (error) {
      const err = error as Error
      // Handle potential storage quota errors.
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
          { notesCount: notes.length }
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
   * @method getSyncMetadata
   * @description Retrieves metadata about the sync status, such as the last sync time.
   * @returns {Promise<SyncMetadata>} The current sync metadata.
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
   * @private
   * @method updateSyncMetadata
   * @description Updates and persists the sync metadata.
   * @param {Partial<SyncMetadata>} metadata - The metadata fields to update.
   * @returns {Promise<void>}
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
   * @private
   * @method detectConflicts
   * @description Compares local and remote notes to find conflicts.
   * A conflict occurs if a note has been modified both locally and remotely since the last sync.
   * Conflicts also arise if a note is modified on one side and deleted on the other.
   * @param {Note[]} localNotes - The array of local notes.
   * @param {Note[]} remoteNotes - The array of remote notes.
   * @returns {SyncConflict[]} An array of detected conflicts.
   */
  private detectConflicts(
    localNotes: Note[],
    remoteNotes: Note[]
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = []
    const remoteNoteIds = new Set(remoteNotes.map(n => n.id))
    const localNoteIds = new Set(localNotes.map(n => n.id))

    // Check for update vs. update conflicts.
    for (const localNote of localNotes) {
      const remoteNote = remoteNotes.find(n => n.id === localNote.id)
      if (remoteNote) {
        const localUpdated = new Date(localNote.updatedAt).getTime()
        const remoteUpdated = new Date(remoteNote.updatedAt).getTime()
        const lastSynced = localNote.lastSyncedAt
          ? new Date(localNote.lastSyncedAt).getTime()
          : 0
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

    // Check for update vs. delete conflicts (deleted remotely, updated locally).
    for (const localNote of localNotes) {
      if (!remoteNoteIds.has(localNote.id) && localNote.lastSyncedAt) {
        const localUpdated = new Date(localNote.updatedAt).getTime()
        const lastSynced = new Date(localNote.lastSyncedAt).getTime()
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

    // Check for update vs. delete conflicts (deleted locally, updated remotely).
    for (const remoteNote of remoteNotes) {
      if (!localNoteIds.has(remoteNote.id) && remoteNote.lastSyncedAt) {
        const remoteUpdated = new Date(remoteNote.updatedAt).getTime()
        const lastSynced = new Date(remoteNote.lastSyncedAt).getTime()
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
   * @private
   * @method resolveConflict
   * @description Resolves a single conflict based on a specified strategy.
   * @param {SyncConflict} conflict - The conflict to resolve.
   * @param {ConflictResolutionStrategy} strategy - The strategy to use for resolution.
   * @returns {Note} The resolved note.
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
        // For manual resolution, the note is marked as in conflict and requires user intervention.
        return { ...conflict.localNote, syncStatus: 'conflict' }
      default: {
        // The default strategy is 'last-write-wins'.
        const localTime = new Date(conflict.localNote.updatedAt).getTime()
        const remoteTime = new Date(conflict.remoteNote.updatedAt).getTime()
        return localTime > remoteTime
          ? { ...conflict.localNote, syncStatus: 'synced' }
          : { ...conflict.remoteNote, syncStatus: 'synced' }
      }
    }
  }

  /**
   * @method syncNotes
   * @description The main method to perform a full synchronization cycle.
   * It fetches remote notes, detects conflicts, resolves them, and merges the changes.
   * @param {Note[]} localNotes - The current set of local notes.
   * @param {ConflictResolutionStrategy} [strategy='local'] - The default strategy for resolving conflicts.
   * @returns {Promise<SyncResult>} An object containing the results of the sync operation.
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

          // If the strategy is 'manual', persist the conflicts for later resolution.
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

          // Merge local and remote notes into a single collection.
          const mergedNotes = new Map<string, Note>()
          remoteNotes.forEach(note => mergedNotes.set(note.id, note))

          // Process each local note against the merged collection.
          for (const localNote of localNotes) {
            const conflict = conflicts.find(c => c.noteId === localNote.id)
            if (conflict) {
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
              // If no conflict, apply standard sync logic (update or create).
              const remoteNote = mergedNotes.get(localNote.id)
              if (remoteNote) {
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

          // Save the final merged collection back to the "cloud".
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
      }, 100) // Simulate network latency.
    })
  }

  /**
   * @method getPendingConflicts
   * @description Retrieves any conflicts that were saved for manual resolution.
   * @returns {Promise<SyncConflict[]>} An array of pending conflicts.
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
   * @method resolveConflictManually
   * @description Resolves a specific conflict by applying the user's chosen version of a note.
   * @param {string} conflictId - The ID of the note in conflict.
   * @param {Note} selectedNote - The version of the note selected by the user to keep.
   * @returns {Promise<boolean>} True if the resolution was successful.
   */
  async resolveConflictManually(
    conflictId: string,
    selectedNote: Note
  ): Promise<boolean> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          // Remove the conflict from the pending list.
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
              throw new Error('Storage quota exceeded') // Re-throw to be caught by the outer catch.
            }
            throw storageError
          }

          // Save the user's chosen version to the cloud.
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

          // Update the metadata to reflect the resolved conflict.
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
   * @method setSyncEnabled
   * @description Enables or disables the synchronization feature.
   * @param {boolean} enabled - Whether to enable or disable sync.
   * @returns {Promise<void>}
   */
  async setSyncEnabled(enabled: boolean): Promise<void> {
    return this.updateSyncMetadata({ syncEnabled: enabled })
  }

  /**
   * @method isSyncInProgress
   * @description Checks if a sync operation is currently in progress.
   * @returns {boolean} True if sync is in progress.
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress
  }
}

// Export a singleton instance of the engine.
export const syncEngine = new SyncEngine()

// Export the default for testing purposes.
export default syncEngine
