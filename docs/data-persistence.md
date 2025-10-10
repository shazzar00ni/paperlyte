# Data Persistence Strategy

## Overview

Paperlyte uses a phased approach to data persistence, designed to enable rapid MVP development while ensuring smooth migration to production-grade infrastructure.

## Current Implementation (Q3 2025 - Enhanced)

### Storage Method

- **Primary Technology**: Browser IndexedDB
- **Fallback**: localStorage (for browsers without IndexedDB support)
- **Rationale**: Enables robust local storage with support for large notes and offline-first behavior
- **Location**: Client-side only (browser storage)

### Key Features

- **Large storage capacity**: IndexedDB supports GBs of data vs localStorage's 5-10MB
- **Offline-first**: Full functionality without internet connection
- **Automatic migration**: Seamlessly migrates existing localStorage data to IndexedDB
- **Graceful fallback**: Falls back to localStorage if IndexedDB is unavailable
- **Better performance**: Asynchronous operations don't block UI

### Limitations

- **Device-specific**: Data is tied to the specific browser/device
- **No cross-device sync**: Notes don't sync between devices (yet)
- **Data volatility**: Data can be lost if browser storage is cleared
- **No backup**: No automatic backup or recovery mechanisms (yet)

### Data Abstraction Layer

We've implemented a `DataService` abstraction layer (`src/services/dataService.ts`) that:

```typescript
// Current implementation uses IndexedDB with localStorage fallback
const notes = await dataService.getNotes()
await dataService.saveNote(note)
await dataService.addToWaitlist(entry)

// Automatic migration on first use
await dataService.initialize() // Called automatically by methods
```

This abstraction ensures that when we migrate to API-based storage, component code won't need to change.

### Storage Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│    (Components, Pages, Hooks)           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         DataService Layer               │
│  (Abstraction + Migration Logic)        │
└──────┬──────────────────────────────────┘
       │
       ├─────────────┬────────────────┐
       ▼             ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  IndexedDB   │ │ localStorage │ │   SyncEngine │
│  (Primary)   │ │  (Fallback)  │ │  (Metadata)  │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Planned Migration (Q4 2025)

### Future API Implementation

The data service will be updated to use REST API endpoints:

```typescript
// Future implementation will use HTTP calls
GET    /api/notes           // Load user notes
POST   /api/notes           // Create new note
PUT    /api/notes/:id       // Update existing note
DELETE /api/notes/:id       // Delete note

POST   /api/waitlist        // Join waitlist
GET    /api/waitlist        // Admin: list entries
```

### Migration Benefits

- **Cross-device sync**: Access notes from any device
- **Data durability**: Server-side persistence with backups
- **User accounts**: Proper authentication and authorization
- **Scalability**: Support for millions of users
- **Advanced features**: Collaboration, version history, etc.

## User Experience Considerations

### Current User Warnings

- Users see a dismissible warning about data persistence limitations
- Warning appears in bottom-right corner after 2 seconds
- Can be permanently dismissed per device

### Data Export

- Admin dashboard provides real-time data export functionality
- Exports include both notes and waitlist data
- JSON format for easy migration to future API

## Technical Implementation

### IndexedDB Implementation

The application uses a custom IndexedDB wrapper (`src/utils/indexedDB.ts`) with:

**Object Stores:**

- `notes`: Stores note documents with indexes on `updatedAt`, `createdAt`, and `tags`
- `waitlist`: Stores waitlist entries with unique index on `email`
- `metadata`: Stores sync metadata and conflict information

**Key Features:**

```typescript
// Initialize database (automatic on first use)
await indexedDB.init()

// CRUD operations
await indexedDB.put(STORE_NAMES.NOTES, note)
const notes = await indexedDB.getAll<Note>(STORE_NAMES.NOTES)
const note = await indexedDB.get<Note>(STORE_NAMES.NOTES, noteId)
await indexedDB.delete(STORE_NAMES.NOTES, noteId)
await indexedDB.clear(STORE_NAMES.NOTES)

// Storage estimation
const estimate = await indexedDB.getStorageEstimate()
// Returns: { usage: number, quota: number, usagePercentage: number }
```

### Data Migration

Automatic migration from localStorage to IndexedDB:

```typescript
// Migration runs automatically on first DataService use
// Status tracked in localStorage to prevent re-migration
const result = await migrateToIndexedDB()
// Returns: { success: boolean, notesCount: number, waitlistCount: number, errors: number }
```

**Migration Process:**

1. Check if migration already completed (via localStorage flag)
2. Initialize IndexedDB with proper schema
3. Read all data from localStorage (notes, waitlist, sync metadata)
4. Write data to IndexedDB object stores
5. Mark migration as complete
6. Preserve localStorage as backup (not automatically deleted)

### Data Service Architecture

```typescript
class DataService {
  // Automatic initialization
  async initialize(): Promise<void>

  // Notes operations (will become API calls)
  async getNotes(): Promise<Note[]>
  async saveNote(note: Note): Promise<boolean>
  async deleteNote(noteId: string): Promise<boolean>

  // Waitlist operations (will become API calls)
  async addToWaitlist(entry): Promise<{ success: boolean; error?: string }>
  async getWaitlistEntries(): Promise<WaitlistEntry[]>

  // Utility operations
  async exportData(): Promise<{ notes: Note[]; waitlist: WaitlistEntry[] }>
  async getStorageInfo(): Promise<StorageInfo>
  async clearAllData(): Promise<boolean>
}
```

### Error Handling

- All data operations include comprehensive error handling
- Errors are logged to Sentry with context
- Graceful fallbacks for storage failures
- User-friendly error messages

### Performance Optimizations

- Asynchronous operations simulate future API calls
- Minimal data processing overhead
- Efficient JSON serialization/deserialization
- Storage size monitoring and warnings

## Migration Timeline

### Q3 2025 (Current - Enhanced MVP)

- ✅ IndexedDB implementation with localStorage fallback
- ✅ Automatic data migration from localStorage
- ✅ Data abstraction layer
- ✅ User warnings about limitations
- ✅ Export functionality
- ✅ Support for large notes (GBs of storage)
- ✅ Offline-first architecture

### Q4 2025 (API Migration)

- [ ] Backend API development
- [ ] User authentication system
- [ ] Data migration scripts
- [ ] API integration in DataService
- [ ] Cross-device sync testing

### 2026 (Advanced Features)

- [ ] Real-time collaboration
- [ ] Version history
- [ ] Advanced search
- [ ] Import from other services

## Development Guidelines

### For Developers

1. **Always use DataService**: Never directly access localStorage in components
2. **Handle async operations**: All data operations return Promises
3. **Include error handling**: Always catch and handle data operation errors
4. **Test with storage limits**: Test app behavior when localStorage is full
5. **Plan for API migration**: Design components assuming network latency

### For Designers

1. **Account for loading states**: All data operations are async
2. **Design offline experiences**: Consider what happens when storage fails
3. **Plan migration UX**: How to communicate when API migration happens
4. **Consider storage warnings**: Design around persistence limitation messaging

## Security Considerations

### Current (localStorage)

- Data stored in plain text in browser
- No server-side security concerns
- User responsible for device security

### Future (API)

- End-to-end encryption planned
- Server-side data protection
- Secure authentication required
- GDPR compliance for EU users

## Monitoring & Analytics

### Current Tracking

- Storage usage and limits
- Data operation success/failure rates
- User behavior around persistence warnings
- Export functionality usage

### Future Tracking

- API response times
- Sync conflict resolution
- Cross-device usage patterns
- Data migration success rates

---

**Note**: This phased approach allows us to validate the product concept with real users while building toward a production-ready infrastructure. The abstraction layer ensures minimal disruption during the migration phase.
