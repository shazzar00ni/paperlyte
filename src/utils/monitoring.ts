import * as Sentry from '@sentry/react'
import { analytics } from './analytics'

// Environment variables for monitoring
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0'

export interface ErrorContext {
  userId?: string
  userEmail?: string
  feature?: string
  action?: string
  additionalData?: Record<string, any>
}

export interface PerformanceMetric {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
}

class Monitoring {
  private isInitialized = false
  private performanceObserver?: PerformanceObserver

  /**
   * Initialize Sentry error monitoring
   */
  init(): void {
    if (this.isInitialized || !SENTRY_DSN) {
      console.warn('Monitoring: Sentry not initialized - missing DSN')
      return
    }

    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        release: APP_VERSION,
        
        // Performance monitoring
        tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
        
        // Session replay for debugging
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        // Error filtering
        beforeSend(event, hint) {
          // Don't send errors in development unless explicitly enabled
          if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_SENTRY_DEV_ENABLED) {
            return null
          }

          // Filter out known non-critical errors
          const error = hint.originalException
          if (error instanceof Error) {
            // Ignore network errors that are typically user-related
            if (error.message.includes('NetworkError') || 
                error.message.includes('Failed to fetch')) {
              return null
            }
          }

          return event
        },

        // Additional context
        initialScope: {
          tags: {
            component: 'paperlyte-web'
          }
        }
      })

      this.isInitialized = true
      this.setupPerformanceMonitoring()
      console.log('Monitoring: Sentry initialized successfully')
    } catch (error) {
      console.error('Monitoring: Failed to initialize Sentry', error)
    }
  }

  /**
   * Log an error with context
   */
  logError(error: Error, context?: ErrorContext): void {
    if (!this.isInitialized) {
      console.error('Untracked error:', error, context)
      return
    }

    try {
      Sentry.withScope((scope) => {
        if (context?.userId) {
          scope.setUser({ id: context.userId, email: context.userEmail })
        }
        
        if (context?.feature) {
          scope.setTag('feature', context.feature)
        }
        
        if (context?.action) {
          scope.setTag('action', context.action)
        }
        
        if (context?.additionalData) {
          scope.setContext('additional_data', context.additionalData)
        }

        Sentry.captureException(error)
      })

      // Also track in analytics for aggregated error reporting
      analytics.track('error_occurred', {
        error_type: error.name,
        error_message: error.message,
        feature: context?.feature,
        action: context?.action
      })
    } catch (e) {
      console.error('Monitoring: Failed to log error', e)
    }
  }

  /**
   * Log a warning message
   */
  logWarning(message: string, context?: ErrorContext): void {
    if (!this.isInitialized) {
      console.warn('Untracked warning:', message, context)
      return
    }

    try {
      Sentry.withScope((scope) => {
        if (context) {
          if (context.userId) scope.setUser({ id: context.userId })
          if (context.feature) scope.setTag('feature', context.feature)
          if (context.action) scope.setTag('action', context.action)
          if (context.additionalData) scope.setContext('additional_data', context.additionalData)
        }
        
        Sentry.captureMessage(message, 'warning')
      })
    } catch (error) {
      console.error('Monitoring: Failed to log warning', error)
    }
  }

  /**
   * Set user context for error reporting
   */
  setUser(userId: string, email?: string, additionalData?: Record<string, any>): void {
    if (!this.isInitialized) return

    try {
      Sentry.setUser({
        id: userId,
        email,
        ...additionalData
      })
    } catch (error) {
      console.error('Monitoring: Failed to set user context', error)
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
    if (!this.isInitialized) return

    try {
      Sentry.addBreadcrumb({
        message,
        category: category || 'custom',
        data,
        timestamp: Date.now() / 1000
      })
    } catch (error) {
      console.error('Monitoring: Failed to add breadcrumb', error)
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: PerformanceMetric): void {
    if (!this.isInitialized) return

    try {
      // Send to Sentry as a measurement
      Sentry.setMeasurement(metric.name, metric.value, metric.unit || 'millisecond')
      
      // Also track in analytics
      analytics.trackPerformance(metric.name, metric.value, {
        unit: metric.unit,
        ...metric.tags
      })
    } catch (error) {
      console.error('Monitoring: Failed to track performance', error)
    }
  }

  /**
   * Setup automatic performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Core Web Vitals
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.trackPerformance({
                name: 'page_load_time',
                value: navEntry.loadEventEnd - navEntry.loadEventStart,
                unit: 'millisecond'
              })
            }
            
            if (entry.entryType === 'paint') {
              this.trackPerformance({
                name: entry.name.replace('-', '_'),
                value: entry.startTime,
                unit: 'millisecond'
              })
            }
          }
        })

        observer.observe({ entryTypes: ['navigation', 'paint'] })
        this.performanceObserver = observer
      } catch (error) {
        console.error('Monitoring: Failed to setup performance observer', error)
      }
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        if (memory) {
          this.trackPerformance({
            name: 'memory_used',
            value: memory.usedJSHeapSize,
            unit: 'byte'
          })
        }
      }, 30000) // Every 30 seconds
    }
  }

  /**
   * Clean up monitoring resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
  }
}

// Create singleton instance
export const monitoring = new Monitoring()

// Convenience functions for common monitoring tasks
export const logError = (error: Error, context?: ErrorContext) => 
  monitoring.logError(error, context)

export const logWarning = (message: string, context?: ErrorContext) => 
  monitoring.logWarning(message, context)

export const trackPerformance = (metric: PerformanceMetric) => 
  monitoring.trackPerformance(metric)

export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => 
  monitoring.addBreadcrumb(message, category, data)

// Error boundary helper
export const withErrorBoundary = Sentry.withErrorBoundary

// Higher-order component for error boundaries
export const ErrorBoundary = Sentry.ErrorBoundary