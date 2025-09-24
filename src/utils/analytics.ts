import posthog from 'posthog-js'

// Environment variables for analytics
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'

export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  userId?: string
}

export interface UserProperties {
  userId?: string
  email?: string
  name?: string
  plan?: 'free' | 'premium'
  signupDate?: string
  [key: string]: any
}

class Analytics {
  private isInitialized = false
  private isEnabled = true

  /**
   * Initialize PostHog analytics
   */
  init(): void {
    if (this.isInitialized || !POSTHOG_API_KEY) {
      console.warn('Analytics: PostHog not initialized - missing API key')
      this.isEnabled = false
      return
    }

    try {
      posthog.init(POSTHOG_API_KEY, {
        api_host: POSTHOG_HOST,
        // Privacy-focused configuration
        capture_pageview: true,
        capture_pageleave: true,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug()
        },
        // Respect user privacy
        respect_dnt: true,
        disable_session_recording: false,
        disable_surveys: false,
        // Performance optimizations
        // batch_flush_interval_ms: 5000, // Removed as it's not in the current PostHog types
      })

      this.isInitialized = true
      console.log('Analytics: PostHog initialized successfully')
    } catch (error) {
      console.error('Analytics: Failed to initialize PostHog', error)
      this.isEnabled = false
    }
  }

  /**
   * Track a custom event
   */
  track(event: string, properties?: Record<string, any>): void {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      posthog.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
        source: 'paperlyte-web'
      })
    } catch (error) {
      console.error('Analytics: Failed to track event', event, error)
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, properties?: UserProperties): void {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      posthog.identify(userId, properties)
    } catch (error) {
      console.error('Analytics: Failed to identify user', error)
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      posthog.people.set(properties)
    } catch (error) {
      console.error('Analytics: Failed to set user properties', error)
    }
  }

  /**
   * Track page view
   */
  pageView(page?: string): void {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      posthog.capture('$pageview', {
        $current_url: page || window.location.href,
        page_title: document.title
      })
    } catch (error) {
      console.error('Analytics: Failed to track page view', error)
    }
  }

  /**
   * Reset user session (on logout)
   */
  reset(): void {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      posthog.reset()
    } catch (error) {
      console.error('Analytics: Failed to reset session', error)
    }
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string, action: string, properties?: Record<string, any>): void {
    this.track(`feature_${action}`, {
      feature,
      action,
      ...properties
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, properties?: Record<string, any>): void {
    this.track('performance_metric', {
      metric,
      value,
      ...properties
    })
  }

  /**
   * Disable analytics (for privacy compliance)
   */
  disable(): void {
    this.isEnabled = false
    if (this.isInitialized) {
      posthog.opt_out_capturing()
    }
  }

  /**
   * Enable analytics
   */
  enable(): void {
    this.isEnabled = true
    if (this.isInitialized) {
      posthog.opt_in_capturing()
    }
  }
}

// Create singleton instance
export const analytics = new Analytics()

// Convenience functions for common tracking events
export const trackEvent = (event: string, properties?: Record<string, any>) => 
  analytics.track(event, properties)

export const trackPageView = (page?: string) => 
  analytics.pageView(page)

export const trackFeatureUsage = (feature: string, action: string, properties?: Record<string, any>) => 
  analytics.trackFeature(feature, action, properties)

export const trackUserAction = (action: string, properties?: Record<string, any>) => 
  analytics.track(`user_${action}`, properties)

// Specific event tracking functions
export const trackNoteEvent = (action: 'create' | 'edit' | 'delete' | 'save', properties?: Record<string, any>) => 
  trackFeatureUsage('note_editor', action, properties)

export const trackWaitlistEvent = (action: 'signup' | 'view', properties?: Record<string, any>) => 
  trackFeatureUsage('waitlist', action, properties)

export const trackNavigationEvent = (action: 'page_change' | 'menu_click', properties?: Record<string, any>) => 
  trackFeatureUsage('navigation', action, properties)