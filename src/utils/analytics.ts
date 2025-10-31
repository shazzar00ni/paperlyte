import posthog from 'posthog-js'

// Retrieve analytics configuration from environment variables.
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'

/**
 * @interface AnalyticsEvent
 * @description Defines the structure for a generic analytics event.
 */
export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  userId?: string
}

/**
 * @interface UserProperties
 * @description Defines the structure for user properties sent to the analytics service.
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
 * @description A wrapper around the PostHog analytics library to provide a consistent,
 * type-safe interface for tracking events and user data. It supports enabling/disabling
 * tracking for privacy compliance and provides convenience methods for common event types.
 */
class Analytics {
  private isInitialized = false
  private isEnabled = true

  /**
   * @method init
   * @description Initializes the PostHog client. This should be called once when the application starts.
   * If the PostHog API key is not provided, analytics will be disabled.
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
        // Configuration options focused on user privacy.
        capture_pageview: true,
        capture_pageleave: true,
        loaded: posthog => {
          if (process.env.NODE_ENV === 'development') posthog.debug()
        },
        respect_dnt: true, // Respect Do Not Track browser settings.
        disable_session_recording: false,
        disable_surveys: false,
      })

      this.isInitialized = true
      console.log('Analytics: PostHog initialized successfully')
    } catch (error) {
      console.error('Analytics: Failed to initialize PostHog', error)
      this.isEnabled = false
    }
  }

  /**
   * @method track
   * @description Tracks a custom event with optional properties.
   * @param {string} event - The name of the event to track.
   * @param {Record<string, any>} [properties] - Additional data to associate with the event.
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
   * @method identify
   * @description Associates a user with a unique ID and sets their properties.
   * @param {string} userId - The unique identifier for the user.
   * @param {UserProperties} [properties] - The user's properties.
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
   * @method setUserProperties
   * @description Updates properties for the currently identified user.
   * @param {UserProperties} properties - The properties to set or update.
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
   * @method pageView
   * @description Tracks a page view event.
   * @param {string} [page] - The URL of the page being viewed. Defaults to the current URL.
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
   * @method reset
   * @description Resets the analytics session, typically called on user logout.
   * This clears the user's identity and properties from the client.
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
   * @method trackFeature
   * @description A convenience method for tracking feature-specific events.
   * @param {string} feature - The name of the feature.
   * @param {string} action - The action taken within the feature.
   * @param {Record<string, any>} [properties] - Additional properties.
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
   * @method trackPerformance
   * @description A convenience method for tracking performance metrics.
   * @param {string} metric - The name of the performance metric (e.g., 'load_time').
   * @param {number} value - The value of the metric.
   * @param {Record<string, any>} [properties] - Additional context.
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
   * @method disable
   * @description Disables analytics tracking and opts the user out.
   */
  disable(): void {
    this.isEnabled = false
    if (this.isInitialized) {
      posthog.opt_out_capturing()
    }
  }

  /**
   * @method enable
   * @description Enables analytics tracking and opts the user in.
   */
  enable(): void {
    this.isEnabled = true
    if (this.isInitialized) {
      posthog.opt_in_capturing()
    }
  }
}

// Create a singleton instance of the Analytics class.
export const analytics = new Analytics()

// --- Convenience Functions ---
// These functions provide an easy way to call the analytics methods from anywhere in the app.

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

// --- Specific Event Tracking Functions ---
// These functions are tailored for common, recurring events in the application.

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
