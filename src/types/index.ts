/**
 * Common types for Paperlyte application
 */

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
  userId?: string
  syncStatus?: SyncStatus
  lastSyncedAt?: string
  remoteVersion?: number
  localVersion?: number
}

export interface WaitlistEntry {
  id: string
  email: string
  name: string
  interest: 'student' | 'professional' | 'creator' | 'other'
  createdAt: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (data: Record<string, unknown>) => void
}

export type Theme = 'light' | 'dark' | 'auto'

export interface AppSettings {
  theme: Theme
  fontSize: 'small' | 'medium' | 'large'
  autoSave: boolean
  showLineNumbers: boolean
}

/**
 * Sync-related types
 */

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

export interface SyncMetadata {
  lastSyncTime: string | null
  syncEnabled: boolean
  pendingSyncCount: number
  conflictCount: number
}

export type ConflictResolutionStrategy = 'local' | 'remote' | 'manual'
