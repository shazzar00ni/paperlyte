<<<<<<< HEAD
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

=======
// Core application types
>>>>>>> main
export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
<<<<<<< HEAD
  createdAt: Date
  updatedAt: Date
  userId?: string
=======
  createdAt: string
  updatedAt: string
  isDrawing?: boolean
  drawingData?: string // Base64 encoded canvas data
>>>>>>> main
}

export interface WaitlistEntry {
  id: string
  email: string
<<<<<<< HEAD
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
=======
  name?: string
  interest?: 'student' | 'professional' | 'creative' | 'other'
  createdAt: string
}

export interface User {
  id: string
  email: string
  name?: string
  plan: 'free' | 'premium'
  signupDate: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  analyticsEnabled: boolean
  autoSave: boolean
  notifications: boolean
}

// Analytics and monitoring types
export interface AnalyticsConfig {
  posthogApiKey?: string
  posthogHost?: string
  sentryDsn?: string
  enabled: boolean
}

export interface MetricData {
  name: string
  value: number
  timestamp: string
  tags?: Record<string, string>
}

export interface ErrorReport {
  id: string
  message: string
  stack?: string
  userId?: string
  feature?: string
  timestamp: string
  resolved: boolean
}

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}
>>>>>>> main
