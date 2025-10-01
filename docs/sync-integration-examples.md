# Sync Integration Examples

This document provides practical examples of integrating the cloud sync engine into Paperlyte components.

## Basic Integration in NoteEditor

### Step 1: Import Components and Services

```typescript
import { syncEngine } from '../services/syncEngine'
import SyncStatusIndicator from '../components/SyncStatusIndicator'
import ConflictResolutionModal from '../components/ConflictResolutionModal'
import type { SyncStatus, SyncConflict } from '../types'
```

### Step 2: Add State Management

```typescript
const NoteEditor: React.FC = () => {
  // Existing state...
  const [notes, setNotes] = useState<Note[]>([])

  // New sync-related state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[]>([])
  const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(
    null
  )
  const [showConflictModal, setShowConflictModal] = useState(false)

  // ... rest of component
}
```

### Step 3: Implement Auto-Sync

```typescript
useEffect(() => {
  // Initial load
  loadNotes()

  // Set up periodic sync (every 5 minutes)
  const syncInterval = setInterval(
    () => {
      performSync()
    },
    5 * 60 * 1000
  )

  return () => clearInterval(syncInterval)
}, [])

const performSync = async () => {
  if (syncEngine.isSyncInProgress()) return

  setSyncStatus('syncing')

  try {
    const result = await syncEngine.syncNotes(notes, 'local')

    if (result.success) {
      setSyncStatus('synced')

      // If there are conflicts, show them
      if (result.conflicts.length > 0) {
        setPendingConflicts(result.conflicts)
        setCurrentConflict(result.conflicts[0])
        setShowConflictModal(true)
        setSyncStatus('conflict')
      }

      trackFeatureUsage('sync', 'success', {
        syncedCount: result.syncedNotes.length,
      })
    } else {
      setSyncStatus('error')
      monitoring.logError(new Error('Sync failed'), {
        feature: 'sync',
        errors: result.errors,
      })
    }
  } catch (error) {
    setSyncStatus('error')
    monitoring.logError(error as Error, {
      feature: 'sync',
      action: 'perform_sync',
    })
  }
}
```

### Step 4: Handle Manual Conflict Resolution

```typescript
const handleConflictResolve = async (selectedVersion: 'local' | 'remote') => {
  if (!currentConflict) return

  const selectedNote =
    selectedVersion === 'local'
      ? currentConflict.localNote
      : currentConflict.remoteNote

  try {
    // Resolve the conflict
    const success = await syncEngine.resolveConflictManually(
      currentConflict.noteId,
      selectedNote
    )

    if (success) {
      // Update local notes with resolved version
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === currentConflict.noteId ? selectedNote : note
        )
      )

      // Save to local storage
      await dataService.saveNote(selectedNote)

      // Remove from pending conflicts
      const remainingConflicts = pendingConflicts.filter(
        c => c.noteId !== currentConflict.noteId
      )
      setPendingConflicts(remainingConflicts)

      // Show next conflict or close modal
      if (remainingConflicts.length > 0) {
        setCurrentConflict(remainingConflicts[0])
      } else {
        setShowConflictModal(false)
        setSyncStatus('synced')
      }

      trackFeatureUsage('conflict_resolution', 'resolved', {
        strategy: selectedVersion,
      })
    }
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'conflict_resolution',
      action: 'resolve',
    })
  }
}
```

### Step 5: Add UI Components

```tsx
return (
  <div className='note-editor'>
    {/* Add sync status indicator to header */}
    <header className='editor-header'>
      <h1>Notes</h1>
      <SyncStatusIndicator status={syncStatus} showLastSync={true} />

      {/* Manual sync button (optional) */}
      <button onClick={performSync} disabled={syncStatus === 'syncing'}>
        {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
      </button>
    </header>

    {/* Existing editor content */}
    <div className='editor-content'>{/* ... */}</div>

    {/* Conflict resolution modal */}
    {currentConflict && (
      <ConflictResolutionModal
        conflict={currentConflict}
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onResolve={handleConflictResolve}
      />
    )}
  </div>
)
```

## Sync on Save

Trigger sync whenever a note is saved:

```typescript
const handleSaveNote = async (note: Note) => {
  try {
    // Save locally first
    const success = await dataService.saveNote(note)

    if (success) {
      setNotes(prevNotes => prevNotes.map(n => (n.id === note.id ? note : n)))

      // Mark as pending sync
      const updatedNote = { ...note, syncStatus: 'pending' as const }
      setNotes(prevNotes =>
        prevNotes.map(n => (n.id === note.id ? updatedNote : n))
      )

      // Trigger sync
      performSync()
    }
  } catch (error) {
    monitoring.logError(error as Error, {
      feature: 'note_editor',
      action: 'save_note',
    })
  }
}
```

## Display Sync Status Per Note

Show sync status badge on each note:

```tsx
const NoteListItem: React.FC<{ note: Note }> = ({ note }) => {
  return (
    <div className='note-item'>
      <h3>{note.title}</h3>
      <p>{truncateContent(note.content)}</p>

      {/* Sync status badge */}
      <div className='note-meta'>
        <span className='timestamp'>{formatDate(note.updatedAt)}</span>
        <SyncStatusIndicator status={note.syncStatus} compact={true} />
      </div>
    </div>
  )
}
```

## Handle Offline/Online Events

```typescript
useEffect(() => {
  const handleOnline = () => {
    monitoring.addBreadcrumb('App came online', 'connectivity')
    performSync() // Sync when coming back online
  }

  const handleOffline = () => {
    monitoring.addBreadcrumb('App went offline', 'connectivity')
    setSyncStatus('pending')
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [notes])
```

## Background Sync with Service Worker

For advanced implementations (future):

```typescript
// In service-worker.ts
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotesInBackground())
  }
})

async function syncNotesInBackground() {
  const notes = await getNotesFromIndexedDB()
  const result = await syncEngine.syncNotes(notes)

  if (result.conflicts.length > 0) {
    // Store conflicts for user to resolve later
    await storeConflicts(result.conflicts)
    // Send notification to user
    await self.registration.showNotification('Sync Conflicts', {
      body: `${result.conflicts.length} note(s) have conflicts that need your attention`,
    })
  }
}
```

## Sync Settings Component

Allow users to control sync behavior:

```tsx
const SyncSettings: React.FC = () => {
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [autoSyncInterval, setAutoSyncInterval] = useState(5) // minutes

  const handleToggleSync = async (enabled: boolean) => {
    await syncEngine.setSyncEnabled(enabled)
    setSyncEnabled(enabled)

    if (enabled) {
      // Perform immediate sync when re-enabled
      performSync()
    }
  }

  return (
    <div className='sync-settings'>
      <h3>Sync Settings</h3>

      <label>
        <input
          type='checkbox'
          checked={syncEnabled}
          onChange={e => handleToggleSync(e.target.checked)}
        />
        Enable automatic sync
      </label>

      <label>
        Auto-sync interval (minutes):
        <input
          type='number'
          min='1'
          max='60'
          value={autoSyncInterval}
          onChange={e => setAutoSyncInterval(Number(e.target.value))}
          disabled={!syncEnabled}
        />
      </label>

      <button onClick={() => performSync()}>Sync Now</button>
    </div>
  )
}
```

## Monitoring Sync Health

Display sync statistics:

```tsx
const SyncDashboard: React.FC = () => {
  const [metadata, setMetadata] = useState<SyncMetadata | null>(null)

  useEffect(() => {
    loadMetadata()
    const interval = setInterval(loadMetadata, 10000) // Update every 10s
    return () => clearInterval(interval)
  }, [])

  const loadMetadata = async () => {
    const data = await syncEngine.getSyncMetadata()
    setMetadata(data)
  }

  if (!metadata) return <div>Loading...</div>

  return (
    <div className='sync-dashboard'>
      <h3>Sync Status</h3>

      <div className='sync-stats'>
        <div className='stat'>
          <label>Last Sync:</label>
          <span>{formatTimestamp(metadata.lastSyncTime)}</span>
        </div>

        <div className='stat'>
          <label>Pending Syncs:</label>
          <span>{metadata.pendingSyncCount}</span>
        </div>

        <div className='stat'>
          <label>Conflicts:</label>
          <span className={metadata.conflictCount > 0 ? 'warning' : ''}>
            {metadata.conflictCount}
          </span>
        </div>

        <div className='stat'>
          <label>Sync Enabled:</label>
          <span>{metadata.syncEnabled ? 'Yes' : 'No'}</span>
        </div>
      </div>

      {metadata.conflictCount > 0 && (
        <button onClick={handleResolveConflicts} className='btn-warning'>
          Resolve {metadata.conflictCount} Conflict(s)
        </button>
      )}
    </div>
  )
}
```

## Error Handling Best Practices

```typescript
const performSyncWithErrorHandling = async () => {
  try {
    setSyncStatus('syncing')
    const result = await syncEngine.syncNotes(notes, 'local')

    if (result.success) {
      setSyncStatus('synced')
      showToast('Notes synced successfully', 'success')
    } else {
      setSyncStatus('error')

      // Log specific errors
      result.errors.forEach(err => {
        monitoring.logError(new Error(err.error), {
          feature: 'sync',
          noteId: err.noteId,
        })
      })

      // Show user-friendly error message
      showToast('Some notes could not be synced. Please try again.', 'error')
    }
  } catch (error) {
    setSyncStatus('error')
    monitoring.logError(error as Error, {
      feature: 'sync',
      action: 'perform_sync',
    })

    // Different error messages based on error type
    if (error instanceof TypeError) {
      showToast('Network error. Please check your connection.', 'error')
    } else {
      showToast('An unexpected error occurred during sync.', 'error')
    }
  }
}
```

## Testing Integration

```typescript
// In your component tests
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { syncEngine } from '../services/syncEngine'
import NoteEditor from './NoteEditor'

describe('NoteEditor Sync Integration', () => {
  it('should show sync status indicator', () => {
    render(<NoteEditor />)
    expect(screen.getByText(/synced/i)).toBeInTheDocument()
  })

  it('should trigger sync on save', async () => {
    const syncSpy = vi.spyOn(syncEngine, 'syncNotes')
    render(<NoteEditor />)

    const saveButton = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalled()
    })
  })

  it('should show conflict modal when conflicts detected', async () => {
    // Mock sync to return conflicts
    vi.spyOn(syncEngine, 'syncNotes').mockResolvedValue({
      success: true,
      syncedNotes: [],
      conflicts: [mockConflict],
      errors: [],
    })

    render(<NoteEditor />)

    // Wait for sync to complete
    await waitFor(() => {
      expect(screen.getByText(/resolve sync conflict/i)).toBeInTheDocument()
    })
  })
})
```

## Complete Example Component

See the full implementation example in `/examples/SyncIntegratedNoteEditor.tsx` (coming soon).

---

**Note**: These examples assume the sync engine is already initialized and available. The current MVP implementation simulates cloud storage using localStorage. When migrating to actual cloud APIs in Q4 2025, only the sync engine internals need to change—component integration remains the same.
