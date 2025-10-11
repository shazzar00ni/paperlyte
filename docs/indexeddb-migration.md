# IndexedDB Migration Guide

## Overview

Paperlyte has migrated from localStorage to IndexedDB for improved storage capacity, performance, and offline-first capabilities.

## What Changed?

### Storage Technology

**Before:** localStorage (~5-10MB limit)
**After:** IndexedDB (GBs of storage available)

### For End Users

- **No action required** - Migration happens automatically
- Existing notes and data are preserved
- App continues to work offline
- No visible changes to the user experience

### For Developers

The `DataService` API remains unchanged, but the underlying storage has changed:

```typescript
// API remains the same
const notes = await dataService.getNotes()
await dataService.saveNote(note)
await dataService.deleteNote(noteId)

// Initialization now includes migration check
await dataService.initialize() // Called automatically by methods
```

## Testing Locally

### Viewing IndexedDB Data

1. Open Chrome/Edge DevTools (F12)
2. Go to **Application** tab
3. Expand **IndexedDB** > **paperlyte_db**
4. View stores: `notes`, `waitlist`, `metadata`

### Clearing Data for Testing

```javascript
// In browser console
indexedDB.deleteDatabase('paperlyte_db')
localStorage.clear()
// Reload page
```

### Testing Migration

1. Add some data using localStorage (old version)
2. Update to new version
3. Verify data appears in IndexedDB
4. Check console for migration success message

## Architecture

### Object Stores

1. **notes**: Stores all note documents
   - Primary key: `id`
   - Indexes: `updatedAt`, `createdAt`, `tags` (multi-entry)

2. **waitlist**: Stores waitlist signup entries
   - Primary key: `id`
   - Index: `email` (unique)

3. **metadata**: Stores sync and system metadata
   - Primary key: `key`
   - Used for: sync metadata, conflicts, cloud notes

### Fallback Behavior

If IndexedDB is unavailable (e.g., private browsing, unsupported browser):

- Automatically falls back to localStorage
- All functionality continues to work
- Storage capacity limited to ~5-10MB

## Common Issues

### Migration Not Running

**Symptom**: Data not appearing after update

**Solution**:

```javascript
// Reset migration status
localStorage.removeItem('paperlyte_migration_status')
// Reload page
```

### IndexedDB Quota Exceeded

**Symptom**: "Storage quota exceeded" errors

**Solution**:

1. Check browser storage settings
2. Clear old data: Settings > Clear browsing data
3. Free up disk space
4. Export important notes before clearing

### Testing in Different Browsers

- **Chrome/Edge**: Full IndexedDB support
- **Firefox**: Full IndexedDB support
- **Safari**: Full IndexedDB support (iOS 10+)
- **Private Mode**: Falls back to localStorage

## Performance Considerations

### Best Practices

```typescript
// ✅ Good: Initialize once
await dataService.initialize()
const notes = await dataService.getNotes()

// ❌ Avoid: Multiple unnecessary initializations
for (const note of notes) {
  await dataService.initialize() // Unnecessary
  await dataService.saveNote(note)
}
```

### Query Performance

IndexedDB indexes enable fast queries:

```typescript
// Fast: Uses index
const recentNotes = await indexedDB.getAll('notes')
// Already sorted by updatedAt index

// Slow: Full scan needed
const taggedNotes = notes.filter(n => n.tags.includes('important'))
```

## Migration to API (Future)

The IndexedDB implementation maintains the same abstraction layer:

```typescript
// Current: IndexedDB
async getNotes(): Promise<Note[]> {
  return await indexedDB.getAll(STORE_NAMES.NOTES)
}

// Future: API
async getNotes(): Promise<Note[]> {
  const response = await fetch('/api/notes')
  return await response.json()
}
```

Component code won't need to change.

## Monitoring

### Success Metrics

- Migration completion rate (tracked via Sentry breadcrumbs)
- Storage usage (tracked via `getStorageInfo()`)
- Fallback usage rate (IndexedDB unavailable)
- Error rates by storage operation

### Debug Information

Enable verbose logging:

```javascript
// In browser console
localStorage.setItem('debug', 'paperlyte:*')
// Reload page
```

## Support

### Reporting Issues

Include this information:

1. Browser and version
2. Browser console errors
3. Output of `await dataService.getStorageInfo()`
4. Whether private/incognito mode is being used

### Known Limitations

- No cross-device sync (yet - planned for Q4 2025)
- No backup/restore (yet - manual export available)
- Data tied to specific browser/device
- Clearing browser data deletes notes

## Future Enhancements

Planned improvements:

- Service Worker for full offline PWA support
- Background sync when online
- Encrypted storage
- Cross-device real-time sync
- Automatic cloud backup
