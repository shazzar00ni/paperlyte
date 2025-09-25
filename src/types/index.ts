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
