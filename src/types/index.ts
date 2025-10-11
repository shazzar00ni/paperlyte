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

/**
 * Authentication-related types
 */

export type AuthProvider = 'email' | 'google' | 'apple'

export interface AuthUser {
  id: string
  email: string
  name: string
  provider: AuthProvider
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: string
  tokenType: 'Bearer'
}

export interface AuthSession {
  user: AuthUser
  token: AuthToken
  isAuthenticated: boolean
}

export interface AuthError {
  code: string
  message: string
  field?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  name: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
}

export interface OAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
  provider: 'google' | 'apple'
}

export interface OAuthResponse {
  code: string
  state: string
}
