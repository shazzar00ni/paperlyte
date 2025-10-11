# Notes CRUD Operations - Implementation Summary

## Overview

This document describes the complete implementation of enhanced CRUD operations for notes in Paperlyte, including pagination, soft delete with 30-day retention, automatic metadata tracking, input sanitization, and versioning for conflict resolution.

## Key Features Implemented

### 1. Enhanced Note Type

**File**: `src/types/index.ts`

Added the following fields to the `Note` interface:

```typescript
export interface Note {
  // ... existing fields
  deletedAt?: string | null // Soft delete timestamp
  wordCount?: number // Auto-calculated word count
  version?: number // Version number for conflict resolution
}
```

### 2. Pagination Support

**Files**: `src/types/index.ts`, `src/services/dataService.ts`

Added comprehensive pagination types and implementation:

```typescript
export interface PaginationOptions {
  page?: number // Page number (default: 1)
  limit?: number // Items per page (default: 20, max: 100)
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortOrder?: 'asc' | 'desc'
  includeDeleted?: boolean // Include soft-deleted notes
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}
```

**New Method**: `dataService.getNotesWithPagination(options)`

### 3. Input Sanitization & Validation

**File**: `src/utils/noteUtils.ts`

Created comprehensive utility functions:

#### `calculateWordCount(content: string): number`

- Removes HTML tags before counting
- Handles multiple spaces and whitespace
- Returns 0 for invalid input

#### `sanitizeTitle(title: string): string`

- Removes HTML tags (including script tags)
- Removes control characters
- Limits to 255 characters
- Preserves Unicode characters

#### `sanitizeContent(content: string): string`

- Removes script tags and their content
- Removes event handlers (onclick, onerror, etc.)
- Removes javascript: protocol
- Preserves safe HTML formatting tags

#### `validateNote(note): string | null`

- Validates title is required and ≤ 255 chars
- Validates content ≤ 10MB
- Returns error message or null

### 4. Soft Delete with 30-Day Retention

**File**: `src/services/dataService.ts`

#### `deleteNote(noteId: string): Promise<boolean>`

- Sets `deletedAt` timestamp instead of hard delete
- Preserves all note data for recovery
- Updates `updatedAt` timestamp

#### `restoreNote(noteId: string): Promise<boolean>`

- Restores soft-deleted notes
- Validates 30-day retention period
- Returns false if beyond retention or not found

#### `cleanupDeletedNotes(): Promise<number>`

- Permanently deletes notes older than 30 days
- Should be called periodically (e.g., daily cron job)
- Returns count of notes permanently deleted

### 5. Automatic Metadata Tracking

**File**: `src/services/dataService.ts`

Enhanced `saveNote()` to automatically:

1. **Calculate Word Count**: Uses `calculateWordCount()` on content
2. **Track Versions**:
   - Initializes to 1 for new notes
   - Increments by 1 for updates
3. **Update Timestamps**: Sets `updatedAt` on every save
4. **Sanitize Input**: Applies sanitization before saving

### 6. Enhanced CRUD Methods

#### `getNotes(): Promise<Note[]>`

- Maintained for backward compatibility
- Filters out deleted notes by default
- Sorts by `updatedAt` descending

#### `getNotesWithPagination(options): Promise<PaginatedResult<Note>>`

- Full pagination support with sorting
- Optional inclusion of deleted notes
- Efficient in-memory pagination (will be server-side in Q4 2025)

#### `getNote(noteId: string): Promise<Note | null>`

- Retrieves single note by ID
- Returns null if not found
- Includes deleted notes (for restore functionality)

#### `saveNote(note: Note): Promise<boolean>`

- Validates input (title required, size limits)
- Sanitizes title and content (XSS prevention)
- Calculates word count automatically
- Manages version numbers
- Implements optimistic updates with fallback

### 7. Optimistic Updates Architecture

The enhanced `saveNote()` implements optimistic updates with automatic rollback:

1. **Validation Phase**: Validates input before any storage operations
2. **Sanitization Phase**: Cleans input for XSS prevention
3. **Metadata Phase**: Calculates word count, manages versions
4. **Primary Storage**: Attempts IndexedDB (if available)
5. **Fallback Storage**: Falls back to localStorage on error
6. **Error Recovery**: Returns false if all storage attempts fail

This ensures:

- Immediate UI responsiveness
- Robust error handling
- Data consistency
- Graceful degradation

## Test Coverage

### New Test Files

#### `src/utils/__tests__/noteUtils.test.ts` (25 tests)

- Word count calculation (6 tests)
- Title sanitization (6 tests)
- Content sanitization (5 tests)
- Input validation (8 tests)

#### `src/services/__tests__/dataService.crud.test.ts` (22 tests)

- Word count tracking (2 tests)
- Note versioning (3 tests)
- Input sanitization (4 tests)
- Soft delete (2 tests)
- Restore functionality (2 tests)
- Pagination (6 tests)
- Single note retrieval (2 tests)
- Cleanup operations (2 tests)

**Total**: 47 comprehensive tests, all passing ✅

### Updated Tests

- `src/__tests__/services/dataService.test.ts`: Updated to work with new auto-calculated fields (wordCount, version)

## API Documentation

**File**: `simple-scribbles/api.md`

Updated with complete API specifications:

### New/Enhanced Endpoints

```
GET    /api/notes                    - List notes (paginated)
GET    /api/notes/:id               - Get specific note
POST   /api/notes                   - Create/update note
DELETE /api/notes/:id               - Soft delete note
POST   /api/notes/:id/restore       - Restore deleted note
```

### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (createdAt, updatedAt, title)
- `sortOrder`: Sort direction (asc, desc)
- `includeDeleted`: Include soft-deleted notes

### Response Examples

All responses now include:

- `wordCount`: Calculated word count
- `version`: Version number for conflict detection
- `deletedAt`: Soft delete timestamp (null if active)

## Migration Path to API Backend (Q4 2025)

The implementation is designed for seamless API migration:

### Current Implementation

- IndexedDB with localStorage fallback
- Client-side pagination and sorting
- Local data only

### Future API Implementation

The same interfaces will be used, but:

- Storage operations become API calls
- Server-side pagination for performance
- Real-time sync across devices
- Conflict resolution using version numbers

### No Code Changes Required

Components using `dataService` won't need updates because:

- All methods return Promises (ready for async API calls)
- Interfaces remain identical
- Error handling already in place
- Version numbers ready for conflict detection

## Security Features

### XSS Prevention

1. **HTML Tag Removal**: Script tags and their content removed
2. **Event Handler Removal**: onclick, onerror, etc. stripped
3. **Protocol Sanitization**: javascript: protocol removed
4. **Control Character Removal**: Binary/control characters filtered

### Input Validation

1. **Title Length**: Limited to 255 characters
2. **Content Size**: Limited to 10MB
3. **Required Fields**: Title cannot be empty
4. **Type Safety**: TypeScript ensures type correctness

### Data Integrity

1. **Version Control**: Detects concurrent modifications
2. **Soft Delete**: Prevents accidental permanent deletion
3. **Automatic Backup**: localStorage fallback preserves data
4. **Retention Policy**: 30-day recovery window

## Performance Considerations

### Current (MVP with IndexedDB)

- **Note Retrieval**: O(n log n) for sorting (client-side)
- **Pagination**: O(n) filtering + O(1) slicing
- **Word Count**: O(n) where n = content length
- **Storage**: GBs available (IndexedDB)

### Future (API Backend)

- **Note Retrieval**: O(1) with database indexes
- **Pagination**: Server-side with LIMIT/OFFSET
- **Word Count**: Cached in database
- **Storage**: Unlimited (cloud storage)

### Optimizations Implemented

1. **Automatic Sorting**: Notes sorted once during retrieval
2. **Efficient Filtering**: Single pass through notes
3. **In-Memory Operations**: No repeated storage reads
4. **Version Caching**: Version numbers stored, not calculated

## Usage Examples

### Basic CRUD Operations

```typescript
import { dataService } from './services/dataService'

// Create a new note
const newNote: Note = {
  id: crypto.randomUUID(),
  title: 'My Note',
  content: 'This is the content',
  tags: ['work'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

await dataService.saveNote(newNote)
// Auto-adds: wordCount=4, version=1

// Get all active notes
const notes = await dataService.getNotes()

// Get single note
const note = await dataService.getNote(noteId)

// Update note (version increments automatically)
note.content = 'Updated content'
await dataService.saveNote(note)
// Version is now 2, wordCount=2

// Soft delete
await dataService.deleteNote(noteId)

// Restore within 30 days
await dataService.restoreNote(noteId)
```

### Pagination

```typescript
// Get first page of notes
const page1 = await dataService.getNotesWithPagination({
  page: 1,
  limit: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
})

console.log(`Total: ${page1.total} notes`)
console.log(`Showing ${page1.data.length} notes`)
console.log(`Has more: ${page1.hasMore}`)

// Get next page
if (page1.hasMore) {
  const page2 = await dataService.getNotesWithPagination({
    page: 2,
    limit: 20,
  })
}
```

### Search with Deleted Notes

```typescript
// Include soft-deleted notes in results
const allNotes = await dataService.getNotesWithPagination({
  page: 1,
  limit: 50,
  includeDeleted: true,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
})

// Filter for deleted notes
const deletedNotes = allNotes.data.filter(note => note.deletedAt)
```

### Cleanup Old Deleted Notes

```typescript
// Run periodically (e.g., daily cron job)
const deletedCount = await dataService.cleanupDeletedNotes()
console.log(`Permanently deleted ${deletedCount} old notes`)
```

## Backward Compatibility

### Existing Code Compatibility

All existing code continues to work:

1. **getNotes()**: Still returns all active notes (backward compatible)
2. **saveNote()**: Accepts notes without new fields (auto-populated)
3. **deleteNote()**: Still "deletes" notes (now soft delete)

### Optional Fields

New fields are optional in the Note interface:

- Code without wordCount/version/deletedAt works
- New fields automatically added when notes are saved
- No migration required for existing notes

### Breaking Changes

**None** - This is a purely additive enhancement.

## Future Enhancements

### Planned for Q4 2025

1. API backend integration
2. Real-time sync across devices
3. Server-side full-text search
4. Advanced conflict resolution UI
5. Note history/version browsing
6. Bulk operations (multi-delete, multi-restore)

### Under Consideration

1. Note templates
2. Rich text formatting
3. File attachments
4. Collaborative editing
5. Note sharing/permissions
6. Export/import in multiple formats

## Conclusion

This implementation provides a robust, production-ready CRUD system for notes with:

✅ **Complete Feature Set**: All acceptance criteria from issue #3 met  
✅ **High Test Coverage**: 47 comprehensive tests  
✅ **Security Hardened**: XSS prevention, input validation  
✅ **Performance Optimized**: Efficient operations, ready for scale  
✅ **Future-Proof**: Designed for seamless API migration  
✅ **Backward Compatible**: No breaking changes

The implementation follows Paperlyte's architectural principles:

- Minimal changes to existing code
- Data service abstraction for future API migration
- Monitoring and analytics integration
- Type-safe TypeScript throughout
- Comprehensive error handling
