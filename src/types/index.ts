/**
 * Common types for Paperlyte application
 */

export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  userId?: string
}

export interface WaitlistEntry {
  id: string
  email: string
  name: string
  interest: 'student' | 'professional' | 'creator' | 'other'
  createdAt: Date
}

export type Theme = 'light' | 'dark' | 'auto'

export interface AppSettings {
  theme: Theme
  fontSize: 'small' | 'medium' | 'large'
  autoSave: boolean
  showLineNumbers: boolean
}
