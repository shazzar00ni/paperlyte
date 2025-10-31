import { config } from '@/config/env'
import posthog from 'posthog-js'

/**
 * @interface AnalyticsEvent
 * @description Structure for custom analytics events
 * @property {string} event - Event name to track
 * @property {Record<string, any>} [properties] - Optional event properties
 * @property {string} [userId] - Optional user identifier
 */
export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  userId?: string
}

/**
 * @interface UserProperties
 * @description User properties for analytics identification
 * @property {string} [userId] - Unique user identifier
 * @property {string} [email] - User email address
 * @property {string} [name] - User display name
 * @property {'free' | 'premium'} [plan] - User subscription plan
 * @property {string} [signupDate] - ISO date string of user signup
 */
export interface UserProperties {
  userId?: string
  email?: string
  name?: string
  plan?: 'free' | 'premium'
  signupDate?: string
  [key: string]: any
}

/**
 * @class Analytics
 * @description Privacy-focused analytics service using PostHog
 * Features:
 * - Event tracking for user interactions
 * - User identification and property management
 * - Respects Do Not Track browser setting
 * - Session recording and surveys (configurable)
 * - Page view and page leave tracking
 */
class Analytics {
  private isInitialized = false
  private isEnabled = true

  /**
   * @function init
   * @description Initialize PostHog analytics with privacy-focused configuration
   * Respects DNT header and provides development debugging
   * @returns {void}
   */
  init(): void {
    if (this.isInitialized || !config.posthog.apiKey) {
      console.warn('Analytics: PostHog not initialized - missing API key')
      this.isEnabled = false
      return
    }

    try {
      posthog.init(config.posthog.apiKey, {
        api_host: config.posthog.host,
        // Privacy-focused configuration
        capture_pageview: true,
        capture_pageleave: true,
        loaded: posthog => {
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
   * @function track
   * @description Track a custom analytics event with optional properties
   * Automatically adds timestamp and source metadata
   * @param {string} event - Event name (e.g., 'note_created', 'waitlist_signup')
   * @param {Record<string, any>} [properties] - Optional event properties
   * @returns {void}
   */
  track(event: string, properties?: Record<string, any>): void {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      posthog.capture(event, {
        ...properties,
        timestamp: new Date().toISOString(),
        source: 'paperlyte-web',
      })
    } catch (error) {
      console.error('Analytics: Failed to track event', event, error)
    }
  }

  /**
   * @function identify
   * @description Identify a user for analytics tracking
   * Associates future events with this user
   * @param {string} userId - Unique user identifier
   * @param {UserProperties} [properties] - Optional user properties
   * @returns {void}
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
   * @function setUserProperties
   * @description Update properties for the identified user
   * @param {UserProperties} properties - User properties to set or update
   * @returns {void}
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
        page_title: document.title,
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
  trackFeature(
    feature: string,
    action: string,
    properties?: Record<string, any>
  ): void {
    this.track(`feature_${action}`, {
      feature,
      action,
      ...properties,
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    metric: string,
    value: number,
    properties?: Record<string, any>
  ): void {
    this.track('performance_metric', {
      metric,
      value,
      ...properties,
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

export const trackPageView = (page?: string) => analytics.pageView(page)

export const trackFeatureUsage = (
  feature: string,
  action: string,
  properties?: Record<string, any>
) => analytics.trackFeature(feature, action, properties)

export const trackUserAction = (
  action: string,
  properties?: Record<string, any>
) => analytics.track(`user_${action}`, properties)

// Specific event tracking functions
export const trackNoteEvent = (
  action: 'create' | 'edit' | 'delete' | 'save',
  properties?: Record<string, any>
) => trackFeatureUsage('note_editor', action, properties)

export const trackWaitlistEvent = (
  action: 'signup' | 'view',
  properties?: Record<string, any>
) => trackFeatureUsage('waitlist', action, properties)

export const trackNavigationEvent = (
  action: 'page_change' | 'menu_click',
  properties?: Record<string, any>
) => trackFeatureUsage('navigation', action, properties)
