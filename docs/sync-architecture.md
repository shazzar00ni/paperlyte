# Cloud Sync Architecture

## Overview

Paperlyte's cloud sync system enables seamless synchronization of notes across devices with robust conflict resolution. The system is designed with an offline-first architecture, ensuring users can always access and modify their notes regardless of network connectivity.

## Architecture Components

### 1. Sync Engine (`src/services/syncEngine.ts`)

The core synchronization service that handles:

- **Bidirectional Sync**: Synchronizes notes between local storage and cloud
- **Conflict Detection**: Identifies when the same note was modified on multiple devices
- **Conflict Resolution**: Implements multiple strategies for resolving conflicts
- **Version Control**: Tracks local and remote versions of each note
- **Metadata Management**: Maintains sync state and statistics

### 2. Sync Types (`src/types/index.ts`)

Extended type definitions for sync functionality:

```typescript
export interface Note {
  // ... existing fields
  syncStatus?: SyncStatus
  lastSyncedAt?: string
  remoteVersion?: number
  localVersion?: number
}

export type SyncStatus = 'synced' | 'syncing' | 'conflict' | 'error' | 'pending'

export interface SyncConflict {
  noteId: string
  localNote: Note
  remoteNote: Note
  conflictType: 'update' | 'delete'
  detectedAt: string
}

export interface SyncResult {
  success: boolean
  syncedNotes: string[]
  conflicts: SyncConflict[]
  errors: Array<{ noteId: string; error: string }>
}
```

### 3. UI Components

#### SyncStatusIndicator (`src/components/SyncStatusIndicator.tsx`)

Displays real-time sync status with visual feedback:

- **Status Icons**: Visual indicators for synced, syncing, conflict, error, and pending states
- **Last Sync Time**: Human-readable timestamp of last successful sync
- **Conflict Count**: Badge showing number of unresolved conflicts
- **Manual Refresh**: Button to trigger immediate sync status update

#### ConflictResolutionModal (`src/components/ConflictResolutionModal.tsx`)

Interactive UI for manual conflict resolution:

- **Side-by-Side Comparison**: Shows both local and remote versions
- **Version Details**: Displays title, content preview, tags, and timestamps
- **Selection Interface**: Radio-button style selection of preferred version
- **Warning Messages**: Alerts user about data loss implications

## Sync Workflow

### Normal Sync Process

1. **Initiate Sync**: User action or automatic trigger initiates sync
2. **Fetch Remote**: Retrieve current state of notes from cloud
3. **Compare Versions**: Check timestamps and version numbers
4. **Detect Conflicts**: Identify notes modified on both local and remote
5. **Resolve Conflicts**: Apply resolution strategy (see below)
6. **Upload Changes**: Push local changes to cloud
7. **Update Metadata**: Record sync time and update version numbers
8. **Update UI**: Reflect new sync status in UI components

### Conflict Detection Algorithm

A conflict occurs when:

```
localNote.updatedAt > localNote.lastSyncedAt AND
remoteNote.updatedAt > localNote.lastSyncedAt
```

This means both versions were modified after the last successful sync.

### Conflict Resolution Strategies

#### 1. Last-Write-Wins (Default)

Automatically selects the most recently modified version:

```typescript
await syncEngine.syncNotes(localNotes) // Uses 'local' strategy by default
```

**Pros**: No user intervention required, simple and fast
**Cons**: May lose changes from older version

#### 2. Local Priority

Always keeps the local version:

```typescript
await syncEngine.syncNotes(localNotes, 'local')
```

**Use Case**: When local changes are known to be more important

#### 3. Remote Priority

Always keeps the remote version:

```typescript
await syncEngine.syncNotes(localNotes, 'remote')
```

**Use Case**: When syncing a new device and want to download all changes

#### 4. Manual Resolution

Prompts user to choose which version to keep:

```typescript
await syncEngine.syncNotes(localNotes, 'manual')
// Returns conflicts in result.conflicts for user to resolve
```

**Use Case**: When both versions contain important changes

## Version Control

Each note maintains version numbers:

- **localVersion**: Increments on each local modification
- **remoteVersion**: Increments on each successful sync to cloud
- **lastSyncedAt**: Timestamp of last successful sync

These fields enable:

- **Stale Data Detection**: Identify outdated local copies
- **Sync History**: Track how many times a note has been synced
- **Conflict Priority**: Help determine which version is newer

## Sync Metadata

Global sync state tracked in `SyncMetadata`:

```typescript
interface SyncMetadata {
  lastSyncTime: string | null // Last successful sync
  syncEnabled: boolean // User preference for auto-sync
  pendingSyncCount: number // Notes waiting to sync
  conflictCount: number // Unresolved conflicts
}
```

## Current Implementation (MVP)

For MVP phase, the sync engine simulates cloud storage using localStorage:

- **Cloud Storage**: `paperlyte_sync_cloud_notes` localStorage key
- **Metadata**: `paperlyte_sync_metadata` localStorage key
- **Conflicts**: `paperlyte_sync_conflicts` localStorage key

This allows full testing of sync logic without backend infrastructure.

## Future Migration (Q4 2025)

The sync engine will be updated to use actual cloud APIs:

### API Endpoints

```typescript
// Sync endpoints
POST   /api/sync/notes        // Upload local changes
GET    /api/sync/notes/:since // Download changes since timestamp
POST   /api/sync/resolve      // Resolve conflict

// Conflict management
GET    /api/conflicts         // List pending conflicts
POST   /api/conflicts/:id/resolve  // Resolve specific conflict
```

### WebSocket Support

For real-time sync:

```typescript
// Real-time updates
ws://api/sync/realtime  // WebSocket connection for live updates
```

### Authentication

All sync operations will require authentication:

```typescript
headers: {
  'Authorization': 'Bearer ${accessToken}'
}
```

## Security Considerations

### Current (MVP)

- Local storage only - no data transmission
- No authentication required
- No encryption at rest

### Future

- **End-to-End Encryption**: All notes encrypted before sync
- **Transport Security**: HTTPS/WSS for all communications
- **Authentication**: OAuth2/JWT tokens for API access
- **Zero-Knowledge**: Server cannot decrypt note content
- **Audit Logging**: Track all sync operations for security review

## Performance Optimizations

### Implemented

- **Asynchronous Operations**: All sync operations use promises
- **Incremental Sync**: Only sync modified notes
- **Debouncing**: Prevent rapid successive sync requests
- **Conflict Batching**: Resolve multiple conflicts in single operation

### Planned

- **Delta Sync**: Only transmit changed fields, not entire notes
- **Compression**: Compress note content before transmission
- **Caching**: Cache frequently accessed notes locally
- **Background Sync**: Use Service Workers for offline sync queue

## Testing

Comprehensive test suite in `src/services/__tests__/syncEngine.test.ts`:

- ✅ Sync metadata management
- ✅ Basic sync operations
- ✅ Multiple note synchronization
- ✅ Conflict detection
- ✅ Conflict resolution strategies (local, remote, manual)
- ✅ Manual conflict resolution
- ✅ Version control
- ✅ Concurrent sync prevention

Run tests:

```bash
npm test -- src/services/__tests__/syncEngine.test.ts
```

## Usage Examples

### Basic Sync

```typescript
import { syncEngine } from './services/syncEngine'
import { dataService } from './services/dataService'

// Get local notes
const localNotes = await dataService.getNotes()

// Sync with cloud
const result = await syncEngine.syncNotes(localNotes)

if (result.success) {
  console.log(`Synced ${result.syncedNotes.length} notes`)
}
```

### Handle Conflicts

```typescript
// Sync with manual conflict resolution
const result = await syncEngine.syncNotes(localNotes, 'manual')

if (result.conflicts.length > 0) {
  // Show conflict resolution UI
  for (const conflict of result.conflicts) {
    // User chooses version through ConflictResolutionModal
    const selectedVersion = await showConflictModal(conflict)

    // Resolve the conflict
    await syncEngine.resolveConflictManually(
      conflict.noteId,
      selectedVersion === 'local' ? conflict.localNote : conflict.remoteNote
    )
  }
}
```

### Monitor Sync Status

```typescript
// Get sync metadata
const metadata = await syncEngine.getSyncMetadata()

console.log(`Last sync: ${metadata.lastSyncTime}`)
console.log(`Pending: ${metadata.pendingSyncCount}`)
console.log(`Conflicts: ${metadata.conflictCount}`)
```

### Component Integration

```tsx
import SyncStatusIndicator from './components/SyncStatusIndicator'

function NotesPage() {
  return (
    <div>
      <SyncStatusIndicator status='synced' showLastSync={true} />
      {/* ... rest of page */}
    </div>
  )
}
```

## Troubleshooting

### Common Issues

**Sync conflicts not detected:**

- Verify `lastSyncedAt` is set on notes
- Check that both versions have `updatedAt` after last sync

**Sync fails silently:**

- Check browser console for errors
- Verify localStorage quota not exceeded
- Check monitoring/Sentry for logged errors

**Conflicts persist after resolution:**

- Ensure `resolveConflictManually` is called after user selection
- Verify conflict is removed from `paperlyte_sync_conflicts`

## Monitoring & Analytics

All sync operations are tracked:

- **Success Rates**: Percentage of successful syncs
- **Conflict Rates**: How often conflicts occur
- **Resolution Choices**: Which conflict strategy users prefer
- **Sync Frequency**: How often users sync
- **Error Types**: Common failure modes

Integrated with:

- **Sentry**: Error logging and monitoring
- **PostHog**: User behavior analytics

## Roadmap

### Phase 1 (Current - Q3 2025) ✅

- ✅ Sync engine core implementation
- ✅ Conflict detection and resolution
- ✅ UI components for sync status
- ✅ Comprehensive test coverage

### Phase 2 (Q4 2025)

- [ ] Backend API development
- [ ] Cloud storage integration
- [ ] Real authentication and authorization
- [ ] WebSocket for real-time updates

### Phase 3 (Q1 2026)

- [ ] End-to-end encryption
- [ ] Advanced conflict resolution (3-way merge)
- [ ] Collaborative editing
- [ ] Version history and rollback

---

**Last Updated**: January 2025  
**Status**: MVP Implementation Complete  
**Next Review**: Q4 2025 (Backend Migration)
