import type {
  Note,
  SyncConflict,
  SyncResult,
  SyncMetadata,
  ConflictResolutionStrategy,
} from '../types'
import { monitoring } from '../utils/monitoring'

/**
 * Sync Engine - Manages cloud synchronization and conflict resolution
 *
 * CURRENT IMPLEMENTATION: Simulated cloud sync for MVP
 * FUTURE: Will integrate with actual cloud API
 *
 * Features:
 * - Bidirectional sync between local and cloud storage
 * - Automatic conflict detection
 * - Last-write-wins and manual conflict resolution
 * - Offline-first architecture
 */

class SyncEngine {
  private storagePrefix = 'paperlyte_sync_'
  private syncInProgress = false

  /**
   * Simulate cloud storage for MVP (will be replaced with API calls)
   */
  private getCloudNotes(): Note[] {
    try {
      const data = localStorage.getItem(`${this.storagePrefix}cloud_notes`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_engine',
        action: 'get_cloud_notes',
      })
      return []
    }
  }

  private saveToCloud(notes: Note[]): boolean {
    try {
      localStorage.setItem(
        `${this.storagePrefix}cloud_notes`,
        JSON.stringify(notes)
      )
      return true
    } catch (error) {
      monitoring.logError(error as Error, {
        feature: 'sync_engine',
        action: 'save_to_cloud',
      })
      return false
    }
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(): Promise<SyncMetadata> {
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          const metadataStr = localStorage.getItem(
            `${this.storagePrefix}metadata`
          )
          const metadata = metadataStr
            ? JSON.parse(metadataStr)
            : {
                lastSyncTime: null,
                syncEnabled: true,
                pendingSyncCount: 0,
                conflictCount: 0,
              }
          resolve(metadata)
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'sync_engine',
            action: 'get_sync_metadata',
          })
          resolve({
            lastSyncTime: null,
            syncEnabled: true,
            pendingSyncCount: 0,
            conflictCount: 0,
          })
        }
      }, 0)
    })
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(
    metadata: Partial<SyncMetadata>
  ): Promise<void> {
    return new Promise(resolve => {
      setTimeout(async () => {
        try {
          const current = await this.getSyncMetadata()
          const updated = { ...current, ...metadata }
          localStorage.setItem(
            `${this.storagePrefix}metadata`,
            JSON.stringify(updated)
          )
          resolve()
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'sync_engine',
            action: 'update_sync_metadata',
          })
          resolve()
        }
      }, 0)
    })
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
          const remoteNotes = this.getCloudNotes()
          const conflicts = this.detectConflicts(localNotes, remoteNotes)
          const syncedNotes: string[] = []
          const errors: Array<{ noteId: string; error: string }> = []

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
          const success = this.saveToCloud(Array.from(mergedNotes.values()))

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
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          const data = localStorage.getItem(`${this.storagePrefix}conflicts`)
          resolve(data ? JSON.parse(data) : [])
        } catch (error) {
          monitoring.logError(error as Error, {
            feature: 'sync_engine',
            action: 'get_pending_conflicts',
          })
          resolve([])
        }
      }, 0)
    })
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

          localStorage.setItem(
            `${this.storagePrefix}conflicts`,
            JSON.stringify(updatedConflicts)
          )

          // Save the selected note to cloud storage
          const cloudNotes = this.getCloudNotes()
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

          this.saveToCloud(cloudNotes)

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
